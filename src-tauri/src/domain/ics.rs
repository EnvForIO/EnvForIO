//! Events from an ICS (iCalendar) feed, flattened into one item per
//! occurrence between two moments. Written for what Outlook / Exchange
//! and course or seminar feeds send (user decision 2026-11-20):
//!
//! - times in UTC ("…Z"), in a zone ("TZID=…"; IANA names, Windows names
//!   through CLDR's table, or else the feed's own VTIMEZONE as a fixed
//!   offset), floating (local time) or whole days (VALUE=DATE);
//! - repeats (RRULE, expanded with the `rrule` crate), skipped dates
//!   (EXDATE), moved or changed occurrences (RECURRENCE-ID), and
//!   cancelled events.
//!
//! Read leniently: a broken event is skipped, never the whole feed.

use std::collections::{HashMap, HashSet};
use std::str::FromStr;

use chrono::{Duration, Local, NaiveDate, NaiveDateTime, TimeZone, Utc};
use rrule::RRuleSet;

use super::windows_zones;

/// One occurrence, as stored and shown. Times are Unix ms; an all-day
/// event runs from local midnight of its first day to that of the day
/// after its last.
#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Occurrence {
    pub title: String,
    pub location: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub all_day: bool,
}

/// A time as the feed wrote it.
#[derive(Debug, Clone, Copy, PartialEq)]
enum Time {
    Utc(NaiveDateTime),
    Zoned(NaiveDateTime, chrono_tz::Tz),
    Fixed(NaiveDateTime, i64), // seconds east of UTC
    Floating(NaiveDateTime),
    Date(NaiveDate),
}

impl Time {
    fn naive(self) -> NaiveDateTime {
        match self {
            Self::Utc(n) | Self::Zoned(n, _) | Self::Fixed(n, _) | Self::Floating(n) => n,
            Self::Date(d) => d.and_hms_opt(0, 0, 0).expect("midnight"),
        }
    }

    /// The same kind of time at another wall-clock moment.
    fn with_naive(self, n: NaiveDateTime) -> Self {
        match self {
            Self::Utc(_) => Self::Utc(n),
            Self::Zoned(_, tz) => Self::Zoned(n, tz),
            Self::Fixed(_, off) => Self::Fixed(n, off),
            Self::Floating(_) => Self::Floating(n),
            Self::Date(_) => Self::Date(n.date()),
        }
    }

    fn ms(self) -> Option<i64> {
        let local = |n: NaiveDateTime| Local.from_local_datetime(&n).earliest();
        Some(match self {
            Self::Utc(n) => n.and_utc().timestamp_millis(),
            Self::Zoned(n, tz) => tz.from_local_datetime(&n).earliest()?.timestamp_millis(),
            Self::Fixed(n, off) => n.and_utc().timestamp_millis() - off * 1000,
            Self::Floating(n) => local(n)?.timestamp_millis(),
            Self::Date(d) => local(d.and_hms_opt(0, 0, 0)?)?.timestamp_millis(),
        })
    }
}

/// One content line: NAME;PARAM=V;…:VALUE.
struct Line<'a> {
    name: String,
    params: Vec<(String, &'a str)>,
    value: &'a str,
}

impl Line<'_> {
    fn param(&self, key: &str) -> Option<&str> {
        self.params
            .iter()
            .find(|(k, _)| k == key)
            .map(|(_, v)| v.trim_matches('"'))
    }
}

/// Undoes line folding (a line break followed by a space or tab).
fn unfold(text: &str) -> String {
    text.replace("\r\n", "\n")
        .replace("\n ", "")
        .replace("\n\t", "")
}

fn split_line(raw: &str) -> Option<Line<'_>> {
    // The value starts at the first ':' outside a quoted parameter.
    let mut quoted = false;
    let colon = raw.char_indices().find_map(|(i, c)| match c {
        '"' => {
            quoted = !quoted;
            None
        }
        ':' if !quoted => Some(i),
        _ => None,
    })?;
    let (head, value) = (&raw[..colon], &raw[colon + 1..]);
    let mut parts = head.split(';');
    let name = parts.next()?.trim().to_ascii_uppercase();
    let params = parts
        .filter_map(|p| p.split_once('='))
        .map(|(k, v)| (k.trim().to_ascii_uppercase(), v))
        .collect();
    Some(Line {
        name,
        params,
        value: value.trim_end_matches('\r'),
    })
}

/// "Meeting\, room 3\nBring laptop" as plain text.
fn text(value: &str) -> String {
    value
        .replace("\\n", " ")
        .replace("\\N", " ")
        .replace("\\,", ",")
        .replace("\\;", ";")
        .replace("\\\\", "\\")
        .trim()
        .to_string()
}

/// "+0800" or "-0530" as seconds east of UTC.
fn offset_seconds(s: &str) -> Option<i64> {
    let s = s.trim();
    let sign = match s.chars().next()? {
        '+' => 1,
        '-' => -1,
        _ => return None,
    };
    let digits = &s[1..];
    let h: i64 = digits.get(0..2)?.parse().ok()?;
    let m: i64 = digits.get(2..4).unwrap_or("00").parse().ok()?;
    Some(sign * (h * 3600 + m * 60))
}

/// The zone a TZID names: IANA, Windows (CLDR), or the feed's VTIMEZONE.
fn zone(tzid: &str, fixed: &HashMap<String, i64>) -> Option<Result<chrono_tz::Tz, i64>> {
    let name = tzid.trim().trim_start_matches('/');
    if let Ok(tz) = chrono_tz::Tz::from_str(name) {
        return Some(Ok(tz));
    }
    if let Some(tz) = windows_zones::iana(name).and_then(|n| chrono_tz::Tz::from_str(n).ok()) {
        return Some(Ok(tz));
    }
    fixed.get(tzid).map(|off| Err(*off))
}

fn time(line: &Line, fixed: &HashMap<String, i64>) -> Option<Time> {
    let v = line.value.trim();
    if line.param("VALUE") == Some("DATE") || v.len() == 8 {
        return NaiveDate::parse_from_str(v, "%Y%m%d").ok().map(Time::Date);
    }
    let (body, utc) = match v.strip_suffix('Z') {
        Some(b) => (b, true),
        None => (v, false),
    };
    let n = NaiveDateTime::parse_from_str(body, "%Y%m%dT%H%M%S").ok()?;
    if utc {
        return Some(Time::Utc(n));
    }
    Some(match line.param("TZID").and_then(|id| zone(id, fixed)) {
        Some(Ok(tz)) => Time::Zoned(n, tz),
        Some(Err(off)) => Time::Fixed(n, off),
        None if line.param("TZID").is_some() => Time::Utc(n), // unknown zone: best guess
        None => Time::Floating(n),
    })
}

/// "PT1H30M", "P1D", "-PT15M" as a duration.
fn duration(v: &str) -> Option<Duration> {
    let (neg, v) = match v.strip_prefix('-') {
        Some(rest) => (true, rest),
        None => (false, v.trim_start_matches('+')),
    };
    let v = v.strip_prefix('P')?;
    let mut total = 0i64;
    let mut num = String::new();
    for c in v.chars() {
        match c {
            '0'..='9' => num.push(c),
            'T' => {}
            unit => {
                let n: i64 = num.parse().ok()?;
                num.clear();
                total += n * match unit {
                    'W' => 604_800,
                    'D' => 86_400,
                    'H' => 3600,
                    'M' => 60,
                    'S' => 1,
                    _ => return None,
                };
            }
        }
    }
    Some(Duration::seconds(if neg { -total } else { total }))
}

#[derive(Default)]
struct Event {
    uid: String,
    title: String,
    location: String,
    start: Option<Time>,
    end: Option<Time>,
    length: Option<Duration>,
    rrule: Option<String>,
    exdates: Vec<Time>,
    recurrence_id: Option<Time>,
    cancelled: bool,
}

impl Event {
    /// How long each occurrence lasts, in ms (an all-day event without an
    /// end lasts one day; a timed one, no time).
    fn length_ms(&self, start: Time) -> i64 {
        if let (Some(a), Some(b)) = (start.ms(), self.end.and_then(Time::ms)) {
            return (b - a).max(0);
        }
        if let Some(d) = self.length {
            return d.num_milliseconds().max(0);
        }
        if matches!(start, Time::Date(_)) {
            86_400_000
        } else {
            0
        }
    }
}

/// UNTIL as the rrule crate wants it next to a DTSTART: in UTC.
fn clean_rule(rule: &str) -> String {
    rule.split(';')
        .map(|part| match part.split_once('=') {
            Some(("UNTIL", until)) if !until.ends_with('Z') => {
                if until.contains('T') {
                    format!("UNTIL={until}Z")
                } else {
                    format!("UNTIL={until}T235959Z")
                }
            }
            _ => part.to_string(),
        })
        .collect::<Vec<_>>()
        .join(";")
}

/// Every start of a repeating event between `from` and `to` (Unix ms), as
/// times of the event's own kind. Zoned events repeat in their zone (so
/// daylight saving keeps the wall-clock time); the others repeat on their
/// wall-clock time as written.
fn repeats(start: Time, rule: &str, from: i64, to: i64) -> Vec<Time> {
    let fmt = start.naive().format("%Y%m%dT%H%M%S");
    let dtstart = match start {
        Time::Zoned(_, tz) => format!("DTSTART;TZID={}:{fmt}", tz.name()),
        _ => format!("DTSTART:{fmt}Z"),
    };
    let Ok(set) = RRuleSet::from_str(&format!("{dtstart}\nRRULE:{}", clean_rule(rule))) else {
        return Vec::new();
    };
    // A day of slack on each side: the window is in UTC, the wall-clock
    // times of floating and fixed-offset events are not.
    let edge = |ms: i64| {
        Utc.timestamp_millis_opt(ms)
            .single()
            .unwrap_or_default()
            .with_timezone(&rrule::Tz::UTC)
    };
    set.after(edge(from - 86_400_000))
        .before(edge(to + 86_400_000))
        .all(2000)
        .dates
        .into_iter()
        .map(|d| match start {
            Time::Zoned(_, tz) => Time::Zoned(d.with_timezone(&tz).naive_local(), tz),
            _ => start.with_naive(d.naive_utc()),
        })
        .collect()
}

/// The feed's VTIMEZONEs as fixed offsets (their standard time), for
/// TZIDs that are neither IANA nor Windows names.
fn fixed_zones(lines: &[Line]) -> HashMap<String, i64> {
    let mut zones = HashMap::new();
    let mut tzid: Option<String> = None;
    let mut in_standard = false;
    for line in lines {
        match (line.name.as_str(), line.value) {
            ("BEGIN", "VTIMEZONE") => tzid = None,
            ("TZID", v) => tzid = Some(v.to_string()),
            ("BEGIN", "STANDARD") => in_standard = true,
            ("END", "STANDARD") => in_standard = false,
            ("TZOFFSETTO", v) if in_standard => {
                if let (Some(id), Some(off)) = (&tzid, offset_seconds(v)) {
                    zones.entry(id.clone()).or_insert(off);
                }
            }
            _ => {}
        }
    }
    zones
}

fn events(lines: &[Line], fixed: &HashMap<String, i64>) -> Vec<Event> {
    let mut list = Vec::new();
    let mut current: Option<Event> = None;
    for line in lines {
        match (line.name.as_str(), line.value) {
            ("BEGIN", "VEVENT") => current = Some(Event::default()),
            ("END", "VEVENT") => list.extend(current.take()),
            _ => {
                let Some(e) = current.as_mut() else { continue };
                match line.name.as_str() {
                    "UID" => e.uid = line.value.to_string(),
                    "SUMMARY" => e.title = text(line.value),
                    "LOCATION" => e.location = text(line.value),
                    "DTSTART" => e.start = time(line, fixed),
                    "DTEND" => e.end = time(line, fixed),
                    "DURATION" => e.length = duration(line.value),
                    "RRULE" => e.rrule = Some(line.value.to_string()),
                    "EXDATE" => {
                        for v in line.value.split(',') {
                            let one = Line {
                                name: String::new(),
                                params: line.params.clone(),
                                value: v,
                            };
                            e.exdates.extend(time(&one, fixed));
                        }
                    }
                    "RECURRENCE-ID" => e.recurrence_id = time(line, fixed),
                    "STATUS" => e.cancelled = line.value.eq_ignore_ascii_case("CANCELLED"),
                    _ => {}
                }
            }
        }
    }
    list
}

/// Every occurrence that overlaps `from`..`to` (Unix ms), soonest first.
pub fn occurrences(ics: &str, from: i64, to: i64) -> Vec<Occurrence> {
    let text = unfold(ics);
    let lines: Vec<Line> = text.lines().filter_map(split_line).collect();
    let fixed = fixed_zones(&lines);
    let events = events(&lines, &fixed);

    // Occurrences that were moved or changed, by (uid, original start).
    let moved: HashSet<(String, i64)> = events
        .iter()
        .filter_map(|e| Some((e.uid.clone(), e.recurrence_id?.ms()?)))
        .collect();

    let mut out = Vec::new();
    for e in &events {
        let Some(start) = e.start else { continue };
        if e.cancelled {
            continue;
        }
        let length = e.length_ms(start);
        let starts = match (&e.rrule, e.recurrence_id) {
            (Some(rule), None) => {
                let skipped: HashSet<i64> = e.exdates.iter().filter_map(|t| t.ms()).collect();
                repeats(start, rule, from, to)
                    .into_iter()
                    .filter_map(Time::ms)
                    .filter(|ms| !skipped.contains(ms) && !moved.contains(&(e.uid.clone(), *ms)))
                    .collect()
            }
            _ => start.ms().into_iter().collect::<Vec<_>>(),
        };
        for start_ms in starts {
            let end_ms = start_ms + length;
            if end_ms.max(start_ms + 1) > from && start_ms < to {
                out.push(Occurrence {
                    title: if e.title.is_empty() {
                        "(no title)".into()
                    } else {
                        e.title.clone()
                    },
                    location: e.location.clone(),
                    start_ms,
                    end_ms,
                    all_day: matches!(start, Time::Date(_)),
                });
            }
        }
    }
    out.sort_by_key(|o| (o.start_ms, o.end_ms));
    out
}

/// A feed link as something to download: webcal:// is https://.
pub fn feed_url(url: &str) -> Option<String> {
    let url = url.trim();
    let lower = url.to_ascii_lowercase();
    if let Some(rest) = lower.strip_prefix("webcal://") {
        return Some(format!("https://{}", &url[url.len() - rest.len()..]));
    }
    (lower.starts_with("https://") || lower.starts_with("http://")).then(|| url.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;
    use chrono::DateTime;

    fn ms(s: &str) -> i64 {
        DateTime::parse_from_rfc3339(s).unwrap().timestamp_millis()
    }

    const OUTLOOK: &str = "BEGIN:VCALENDAR\r
BEGIN:VTIMEZONE\r
TZID:China Standard Time\r
BEGIN:STANDARD\r
TZOFFSETTO:+0800\r
END:STANDARD\r
END:VTIMEZONE\r
BEGIN:VEVENT\r
UID:weekly\r
SUMMARY:Group meeting\\, room 3\r
LOCATION:B-201\r
DTSTART;TZID=China Standard Time:20261102T100000\r
DTEND;TZID=China Standard Time:20261102T113000\r
RRULE:FREQ=WEEKLY;BYDAY=MO;UNTIL=20261231T000000Z\r
EXDATE;TZID=China Standard Time:20261109T100000\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:weekly\r
RECURRENCE-ID;TZID=China Standard Time:20261116T100000\r
SUMMARY:Group meeting (moved)\r
DTSTART;TZID=China Standard Time:20261117T140000\r
DTEND;TZID=China Standard Time:20261117T153000\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:holiday\r
SUMMARY:Holiday\r
DTSTART;VALUE=DATE:20261120\r
DTEND;VALUE=DATE:20261121\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:gone\r
SUMMARY:Cancelled talk\r
STATUS:CANCELLED\r
DTSTART:20261118T060000Z\r
DTEND:20261118T070000Z\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:long-summ\r
SUMMARY:Seminar on very long\r
  titles\r
DTSTART:20261119T080000Z\r
DURATION:PT1H\r
END:VEVENT\r
END:VCALENDAR\r
";

    #[test]
    fn an_outlook_feed_expands_into_occurrences() {
        let list = occurrences(
            OUTLOOK,
            ms("2026-11-01T00:00:00Z"),
            ms("2026-11-30T00:00:00Z"),
        );
        let meetings: Vec<_> = list
            .iter()
            .filter(|o| o.title.starts_with("Group meeting"))
            .map(|o| (o.title.as_str(), o.start_ms))
            .collect();
        // Mondays 10:00 China time (02:00 UTC): 2nd, 23rd; the 9th is skipped,
        // the 16th was moved to Tuesday 17th 14:00 (06:00 UTC).
        // The 30th starts after the window ends.
        assert_eq!(
            meetings,
            [
                ("Group meeting, room 3", ms("2026-11-02T02:00:00Z")),
                ("Group meeting (moved)", ms("2026-11-17T06:00:00Z")),
                ("Group meeting, room 3", ms("2026-11-23T02:00:00Z")),
            ]
        );
        let first = list.iter().find(|o| o.title.starts_with("Group")).unwrap();
        assert_eq!(first.end_ms - first.start_ms, 90 * 60_000);
        assert_eq!(first.location, "B-201");

        let holiday = list.iter().find(|o| o.title == "Holiday").unwrap();
        assert!(holiday.all_day);
        assert_eq!(holiday.end_ms - holiday.start_ms, 86_400_000);
        assert!(!list.iter().any(|o| o.title == "Cancelled talk"));
        let seminar = list
            .iter()
            .find(|o| o.title.starts_with("Seminar"))
            .unwrap();
        assert_eq!(seminar.title, "Seminar on very long titles");
        assert_eq!(seminar.end_ms - seminar.start_ms, 3_600_000);
    }

    #[test]
    fn iana_zones_keep_wall_clock_time_across_daylight_saving() {
        let feed = "BEGIN:VEVENT\nUID:x\nSUMMARY:Lab\nDTSTART;TZID=Europe/London:20261020T090000\nDTEND;TZID=Europe/London:20261020T100000\nRRULE:FREQ=WEEKLY;COUNT=3\nEND:VEVENT\n";
        let starts: Vec<i64> =
            occurrences(feed, ms("2026-10-01T00:00:00Z"), ms("2026-12-01T00:00:00Z"))
                .iter()
                .map(|o| o.start_ms)
                .collect();
        // 09:00 BST is 08:00 UTC; after 25 October, 09:00 GMT is 09:00 UTC.
        assert_eq!(
            starts,
            [
                ms("2026-10-20T08:00:00Z"),
                ms("2026-10-27T09:00:00Z"),
                ms("2026-11-03T09:00:00Z")
            ]
        );
    }

    #[test]
    fn small_parts_parse() {
        assert_eq!(duration("PT1H30M"), Some(Duration::minutes(90)));
        assert_eq!(duration("P1D"), Some(Duration::days(1)));
        assert_eq!(offset_seconds("-0530"), Some(-(5 * 3600 + 30 * 60)));
        assert_eq!(
            clean_rule("FREQ=DAILY;UNTIL=20261231"),
            "FREQ=DAILY;UNTIL=20261231T235959Z"
        );
        assert_eq!(
            windows_zones::iana("china standard time"),
            Some("Asia/Shanghai")
        );
        assert_eq!(
            feed_url("webcal://outlook.office365.com/owa/calendar/x/calendar.ics").as_deref(),
            Some("https://outlook.office365.com/owa/calendar/x/calendar.ics")
        );
        assert_eq!(feed_url("ftp://x"), None);
    }
}

#[cfg(test)]
mod real_feed {
    /// Parses a downloaded feed named by ICS_FILE. Ignored: needs the file.
    #[test]
    #[ignore]
    fn a_real_feed_parses() {
        let path = std::env::var("ICS_FILE").expect("ICS_FILE");
        let ics = std::fs::read_to_string(path).unwrap();
        let now = chrono::Utc::now().timestamp_millis();
        let list = super::occurrences(&ics, now - 92 * 86_400_000, now + 366 * 86_400_000);
        println!("{} occurrences", list.len());
        for o in list.iter().take(5) {
            println!("{o:?}");
        }
        assert!(!list.is_empty());
    }
}
