//! Export rows as CSV (opens in Excel) or ICS (imports into calendars).

use super::ExportRow;

/// A CSV cell: quoted when it contains a comma, quote or line break.
fn cell(value: &str) -> String {
    if value.contains([',', '"', '\n', '\r']) {
        format!("\"{}\"", value.replace('"', "\"\""))
    } else {
        value.to_string()
    }
}

/// CSV with a header row. Starts with a UTF-8 byte order mark so Excel reads non-ASCII text.
pub fn csv(rows: &[ExportRow]) -> String {
    let mut out = String::from(
        "\u{feff}Date,Start,End,Title,Project,Module,Estimate (min),Actual (min),Due,Done,Note\r\n",
    );
    for r in rows {
        let num = |n: Option<i64>| n.map(|n| n.to_string()).unwrap_or_default();
        let fields = [
            cell(r.date.as_deref().unwrap_or("")),
            cell(r.start_time.as_deref().unwrap_or("")),
            cell(r.end_time.as_deref().unwrap_or("")),
            cell(&r.title),
            cell(r.project.as_deref().unwrap_or("")),
            cell(r.module.as_deref().unwrap_or("")),
            num(r.estimate_minutes),
            num(r.actual_minutes),
            cell(r.due_date.as_deref().unwrap_or("")),
            if r.done { "yes".into() } else { "no".into() },
            cell(&r.note),
        ];
        out.push_str(&fields.join(","));
        out.push_str("\r\n");
    }
    out
}

/// ICS text: commas, semicolons, backslashes and line breaks escaped.
fn text(value: &str) -> String {
    value
        .replace('\\', "\\\\")
        .replace(';', "\\;")
        .replace(',', "\\,")
        .replace('\n', "\\n")
}

/// An ICS calendar with one event per dated row: timed when the row has a
/// start time (floating local time), otherwise all-day. Undated rows are left out.
pub fn ics(rows: &[ExportRow], stamp: &str) -> String {
    let mut out = String::from("BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:-//EnvForIO//EN\r\n");
    for r in rows {
        let Some(date) = r.date.as_deref() else {
            continue;
        };
        let day = date.replace('-', "");
        out.push_str("BEGIN:VEVENT\r\n");
        out.push_str(&format!(
            "UID:task-{}@envforio\r\nDTSTAMP:{stamp}\r\n",
            r.id
        ));
        match (&r.start_time, &r.end_time) {
            (Some(start), end) => {
                out.push_str(&format!("DTSTART:{day}T{}00\r\n", start.replace(':', "")));
                if let Some(end) = end {
                    out.push_str(&format!("DTEND:{day}T{}00\r\n", end.replace(':', "")));
                }
            }
            (None, _) => out.push_str(&format!("DTSTART;VALUE=DATE:{day}\r\n")),
        }
        let done = if r.done { "✓ " } else { "" };
        out.push_str(&format!(
            "SUMMARY:{}\r\n",
            text(&format!("{done}{}", r.title))
        ));
        if !r.note.is_empty() {
            out.push_str(&format!("DESCRIPTION:{}\r\n", text(&r.note)));
        }
        out.push_str("END:VEVENT\r\n");
    }
    out.push_str("END:VCALENDAR\r\n");
    out
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(title: &str, date: Option<&str>, start: Option<&str>) -> ExportRow {
        ExportRow {
            id: 1,
            date: date.map(Into::into),
            start_time: start.map(Into::into),
            end_time: start.map(|_| "15:30".into()),
            title: title.into(),
            project: Some("Paper, v2".into()),
            module: None,
            estimate_minutes: Some(90),
            actual_minutes: None,
            due_date: None,
            done: false,
            note: String::new(),
        }
    }

    #[test]
    fn csv_quotes_what_needs_quoting() {
        let out = csv(&[row("say \"hi\"", Some("2026-11-20"), None)]);
        let line = out.lines().nth(1).unwrap();
        assert_eq!(
            line,
            "2026-11-20,,,\"say \"\"hi\"\"\",\"Paper, v2\",,90,,,no,"
        );
    }

    #[test]
    fn ics_has_timed_all_day_and_no_undated_events() {
        let out = ics(
            &[
                row("seminar", Some("2026-11-20"), Some("14:00")),
                row("read", Some("2026-11-21"), None),
                row("someday", None, None),
            ],
            "20261120T000000Z",
        );
        assert!(out.contains("DTSTART:20261120T140000\r\nDTEND:20261120T153000"));
        assert!(out.contains("DTSTART;VALUE=DATE:20261121"));
        assert_eq!(out.matches("BEGIN:VEVENT").count(), 2);
    }
}
