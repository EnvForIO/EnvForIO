//! Check-ins: each past day's first-seen line against what was done that
//! day, the streak of days that met their line, and yesterday's shortfall.
//! The shortfall is already "redistributed": the remaining work simply feeds
//! today's and later lines.

use std::collections::HashMap;

use chrono::{Duration, NaiveDate};
use rusqlite::{params, Connection};
use serde::Serialize;
use specta::Type;

use super::work::{parse_date, Estimates};
use crate::errors::{AppError, AppResult};

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DayResult {
    pub date: String,
    pub line: i64, // minutes the line asked for (as first seen that day)
    pub done: i64, // estimated minutes of project tasks finished that day
    pub met: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CheckIns {
    /// Days in a row (up to today) that met their line; days without a line don't break it.
    pub streak: i64,
    pub yesterday: Option<DayResult>,
    pub shortfall: i64,       // yesterday's line minus what was done, if positive
    pub days: Vec<DayResult>, // the last `days` days, oldest first, only days with a line
}

pub fn check_ins(conn: &Connection, today: &str, days: i64) -> AppResult<CheckIns> {
    let today = parse_date(today).ok_or_else(|| AppError::invalid("not a date"))?;
    let from = today - Duration::days(days.max(1) * 4); // look further back for the streak
    let mut lines: HashMap<NaiveDate, i64> = HashMap::new();
    let mut stmt = conn.prepare(
        "SELECT date, sum(minutes) FROM daily_lines WHERE date BETWEEN ?1 AND ?2 GROUP BY date",
    )?;
    let rows = stmt.query_map(params![from.to_string(), today.to_string()], |r| {
        Ok((r.get::<_, String>(0)?, r.get::<_, i64>(1)?))
    })?;
    for row in rows {
        let (date, minutes) = row?;
        if let Some(date) = parse_date(&date) {
            lines.insert(date, minutes);
        }
    }
    let estimates = Estimates::load(conn)?;
    let result = |day: NaiveDate| -> Option<DayResult> {
        let line = *lines.get(&day).filter(|m| **m > 0)?;
        let done = estimates.done_on_day(day);
        Some(DayResult {
            date: day.to_string(),
            line,
            done,
            met: done >= line,
        })
    };

    // Streak: today counts once met; a missed past day ends it.
    let mut streak = i64::from(result(today).is_some_and(|r| r.met));
    let mut day = today - Duration::days(1);
    while day >= from {
        match result(day) {
            Some(r) if r.met => streak += 1,
            Some(_) => break,
            None => {} // no line that day (rest day, nothing due, app not opened)
        }
        day -= Duration::days(1);
    }

    let yesterday = result(today - Duration::days(1));
    let shortfall = yesterday.as_ref().map_or(0, |r| (r.line - r.done).max(0));
    let history = (1..=days)
        .rev()
        .filter_map(|i| result(today - Duration::days(i)))
        .collect();
    Ok(CheckIns {
        streak,
        yesterday,
        shortfall,
        days: history,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    fn line(conn: &Connection, date: &str, minutes: i64) {
        conn.execute(
            "INSERT INTO daily_lines (date, project_id, minutes) VALUES (?1, 1, ?2)",
            params![date, minutes],
        )
        .unwrap();
    }

    #[test]
    fn missed_days_break_the_streak_and_yesterday_shows_the_shortfall() {
        let conn = open_in_memory();
        // Nothing was done on any of these days, so every line was missed.
        line(&conn, "2026-11-18", 60);
        line(&conn, "2026-11-19", 90);
        let c = check_ins(&conn, "2026-11-20", 7).unwrap();
        assert_eq!(c.streak, 0);
        assert_eq!(c.shortfall, 90);
        assert_eq!(c.days.len(), 2);
        assert!(!c.yesterday.unwrap().met);
    }

    #[test]
    fn days_without_a_line_do_not_count() {
        let conn = open_in_memory();
        let c = check_ins(&conn, "2026-11-20", 7).unwrap();
        assert_eq!((c.streak, c.shortfall), (0, 0));
        assert!(c.yesterday.is_none() && c.days.is_empty());
    }
}
