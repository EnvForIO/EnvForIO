//! Conference deadlines from ccfddl's data (github.com/ccfddl/ccf-deadlines,
//! MIT licence): its YAML read into `Conference`s, each deadline turned from
//! the conference's own time zone (AoE, UTC±N, PT) into Unix milliseconds,
//! so the UI shows it in local time. Read leniently: an entry or a date
//! that does not parse ("TBD", prose) is skipped, never fatal.

use chrono::{Datelike, Days, NaiveDate, NaiveDateTime};
use serde_yaml_ng::Value;

use crate::entity::conference::{Conference, Edition, Stage};

/// A field as text: strings trimmed, numbers written out, anything else "".
fn text(v: &Value, key: &str) -> String {
    match v.get(key) {
        Some(Value::String(s)) => s.trim().to_string(),
        Some(Value::Number(n)) => n.to_string(),
        _ => String::new(),
    }
}

/// The n-th Sunday (1-based) of a month.
fn nth_sunday(year: i32, month: u32, n: u64) -> NaiveDate {
    let first = NaiveDate::from_ymd_opt(year, month, 1).expect("a valid month");
    let to_sunday = (7 - u64::from(first.weekday().num_days_from_sunday())) % 7;
    first + Days::new(to_sunday + 7 * (n - 1))
}

/// US Pacific daylight time: second Sunday of March to first Sunday of November.
fn pacific_summer(day: NaiveDate) -> bool {
    day >= nth_sunday(day.year(), 3, 2) && day < nth_sunday(day.year(), 11, 1)
}

/// Hours ahead of UTC of a ccfddl time zone on a given day.
pub fn utc_offset(zone: &str, day: NaiveDate) -> Option<i64> {
    match zone.trim() {
        "AoE" => Some(-12), // Anywhere on Earth
        "UTC" | "GMT" => Some(0),
        "PT" | "PST" | "PDT" => Some(if pacific_summer(day) { -7 } else { -8 }),
        other => {
            let hours = other
                .strip_prefix("UTC")
                .or_else(|| other.strip_prefix("GMT"))?;
            hours.parse().ok().filter(|h| (-12..=14).contains(h))
        }
    }
}

/// "2025-05-11 23:59:59" in `zone` as Unix milliseconds; None for "TBD",
/// prose or an unknown zone.
pub fn deadline_ms(local: &str, zone: &str) -> Option<i64> {
    let at = NaiveDateTime::parse_from_str(local.trim(), "%Y-%m-%d %H:%M:%S").ok()?;
    let offset = utc_offset(zone, at.date())?;
    Some(at.and_utc().timestamp_millis() - offset * 3_600_000)
}

fn edition(v: &Value) -> Option<Edition> {
    let id = text(v, "id");
    if id.is_empty() {
        return None;
    }
    let zone = text(v, "timezone");
    let stages = v
        .get("timeline")
        .and_then(Value::as_sequence)
        .map(|timeline| {
            timeline
                .iter()
                .map(|t| Stage {
                    abstract_at: deadline_ms(&text(t, "abstract_deadline"), &zone),
                    deadline_at: deadline_ms(&text(t, "deadline"), &zone),
                    comment: text(t, "comment"),
                })
                .collect()
        })
        .unwrap_or_default();
    Some(Edition {
        id,
        year: text(v, "year").parse().unwrap_or(0),
        link: text(v, "link"),
        date: text(v, "date"),
        place: text(v, "place"),
        timezone: zone,
        stages,
        project_id: None,
    })
}

fn conference(v: &Value) -> Option<Conference> {
    let title = text(v, "title");
    if title.is_empty() {
        return None;
    }
    let key = [text(v, "conference_key"), text(v, "dblp")]
        .into_iter()
        .find(|k| !k.is_empty())
        .unwrap_or_else(|| title.to_lowercase());
    let rank = v.get("rank").cloned().unwrap_or(Value::Null);
    Some(Conference {
        key,
        description: text(v, "description"),
        area: text(v, "sub"),
        ccf: text(&rank, "ccf"),
        core: text(&rank, "core"),
        editions: v
            .get("confs")
            .and_then(Value::as_sequence)
            .map(|confs| confs.iter().filter_map(edition).collect())
            .unwrap_or_default(),
        title,
    })
}

/// ccfddl's combined list (`allconf.yml`). Keys are unique: a later entry
/// with a key already seen is dropped.
pub fn parse_all(yaml: &str) -> Result<Vec<Conference>, String> {
    let doc: Value = serde_yaml_ng::from_str(yaml).map_err(|e| e.to_string())?;
    let Value::Sequence(items) = doc else {
        return Err("ccfddl's data is not a list of conferences".into());
    };
    let mut seen = std::collections::HashSet::new();
    Ok(items
        .iter()
        .filter_map(conference)
        .filter(|c| seen.insert(c.key.clone()))
        .collect())
}

#[cfg(test)]
pub mod tests {
    use super::*;

    /// Two conferences as ccfddl writes them (also used by the service tests).
    pub const SAMPLE: &str = "
- title: NeurIPS
  description: Conference on Neural Information Processing Systems
  sub: AI
  rank:
    ccf: A
    core: A*
  dblp: nips
  conference_key: nips
  confs:
  - year: 2099
    id: nips99
    link: https://neurips.cc/
    timeline:
    - abstract_deadline: '2099-05-11 23:59:59'
      deadline: '2099-05-15 23:59:59'
    timezone: AoE
    date: December 2099
    place: Vancouver
- title: MICCAI
  description: Medical Image Computing and Computer Assisted Intervention
  sub: MX
  rank:
    ccf: B
  dblp: miccai
  confs:
  - year: 2099
    id: miccai99
    link: https://miccai.org/
    timeline:
    - deadline: TBD
    timezone: UTC+8
    date: October 2099
    place: Somewhere
";

    fn day(s: &str) -> NaiveDate {
        NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap()
    }

    #[test]
    fn zones_read_as_hours_from_utc() {
        let d = day("2026-01-10");
        assert_eq!(utc_offset("AoE", d), Some(-12));
        assert_eq!(utc_offset("UTC", d), Some(0));
        assert_eq!(utc_offset("UTC+8", d), Some(8));
        assert_eq!(utc_offset("UTC-7", d), Some(-7));
        assert_eq!(utc_offset("Mars", d), None);
        assert_eq!(utc_offset("UTC+99", d), None);
    }

    #[test]
    fn pacific_time_follows_daylight_saving() {
        assert_eq!(utc_offset("PT", day("2026-01-15")), Some(-8));
        assert_eq!(utc_offset("PT", day("2026-03-07")), Some(-8)); // before 2nd Sunday (8th)
        assert_eq!(utc_offset("PT", day("2026-03-08")), Some(-7));
        assert_eq!(utc_offset("PT", day("2026-07-01")), Some(-7));
        assert_eq!(utc_offset("PT", day("2026-11-01")), Some(-8)); // 1st Sunday of November
    }

    #[test]
    fn an_aoe_deadline_ends_at_noon_utc_the_next_day() {
        let ms = deadline_ms("2026-05-15 23:59:59", "AoE").unwrap();
        let utc = chrono::DateTime::from_timestamp_millis(ms).unwrap();
        assert_eq!(utc.to_rfc3339(), "2026-05-16T11:59:59+00:00");
        assert_eq!(deadline_ms("TBD", "AoE"), None);
        assert_eq!(deadline_ms("March 1, 2027", "AoE"), None);
    }

    #[test]
    fn the_sample_parses() {
        let list = parse_all(SAMPLE).unwrap();
        assert_eq!(list.len(), 2);
        let nips = &list[0];
        assert_eq!(
            (nips.key.as_str(), nips.ccf.as_str(), nips.core.as_str()),
            ("nips", "A", "A*")
        );
        let stage = &nips.editions[0].stages[0];
        assert!(stage.abstract_at.unwrap() < stage.deadline_at.unwrap());
        let miccai = &list[1];
        assert_eq!((miccai.key.as_str(), miccai.core.as_str()), ("miccai", ""));
        assert_eq!(miccai.editions[0].stages[0].deadline_at, None);
        assert!(parse_all("title: not a list").is_err());
    }
}

#[cfg(test)]
mod real_data {
    /// Parses a downloaded `allconf.yml` named by CCFDDL_FILE. Ignored:
    /// needs the file.
    #[test]
    #[ignore]
    fn the_real_list_parses() {
        let path = std::env::var("CCFDDL_FILE").expect("CCFDDL_FILE");
        let list = super::parse_all(&std::fs::read_to_string(path).unwrap()).unwrap();
        let editions: usize = list.iter().map(|c| c.editions.len()).sum();
        let dated = list
            .iter()
            .flat_map(|c| &c.editions)
            .flat_map(|e| &e.stages)
            .filter(|s| s.deadline_at.is_some())
            .count();
        println!(
            "{} conferences, {editions} editions, {dated} dated rounds",
            list.len()
        );
        let miccai = list.iter().find(|c| c.title == "MICCAI").unwrap();
        println!("{}", miccai.key);
        println!("{:?}", miccai.editions.last());
        assert!(list.len() > 300);
    }
}
