//! Available time: minutes per weekday, and one-off overrides per date.
//!
//! `None` means "no limit" (the user never set it): the day is a work day
//! and the safety line may put any amount on it. `Some(0)` is a rest day.

use std::collections::HashMap;

use chrono::{Datelike, NaiveDate};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::errors::{AppError, AppResult};

/// Minutes per weekday, Monday first; None = no limit.
#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
pub struct WeekCapacity(pub [Option<i64>; 7]);

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
pub struct DayOverride {
    pub date: String, // 'YYYY-MM-DD'
    pub minutes: i64,
}

pub fn week(conn: &Connection) -> AppResult<WeekCapacity> {
    let mut week = [None; 7];
    let mut stmt = conn.prepare("SELECT weekday, minutes FROM weekday_capacity")?;
    for row in stmt.query_map([], |r| Ok((r.get::<_, usize>(0)?, r.get::<_, i64>(1)?)))? {
        let (weekday, minutes) = row?;
        week[weekday] = Some(minutes);
    }
    Ok(WeekCapacity(week))
}

pub fn set_weekday(
    conn: &Connection,
    weekday: u8,
    minutes: Option<i64>,
) -> AppResult<WeekCapacity> {
    if weekday > 6 || minutes.is_some_and(|m| !(0..=24 * 60).contains(&m)) {
        return Err(AppError::invalid("weekday is 0-6 and minutes 0-1440"));
    }
    match minutes {
        Some(m) => conn.execute(
            "INSERT INTO weekday_capacity (weekday, minutes) VALUES (?1, ?2)
             ON CONFLICT (weekday) DO UPDATE SET minutes = excluded.minutes",
            params![weekday, m],
        )?,
        None => conn.execute(
            "DELETE FROM weekday_capacity WHERE weekday = ?1",
            params![weekday],
        )?,
    };
    week(conn)
}

pub fn overrides(conn: &Connection, from: &str, to: &str) -> AppResult<Vec<DayOverride>> {
    let mut stmt = conn.prepare(
        "SELECT date, minutes FROM day_overrides WHERE date BETWEEN ?1 AND ?2 ORDER BY date",
    )?;
    let rows = stmt.query_map(params![from, to], |r| {
        Ok(DayOverride {
            date: r.get(0)?,
            minutes: r.get(1)?,
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

/// Set (Some) or clear (None) the override for one date.
pub fn set_override(conn: &Connection, date: &str, minutes: Option<i64>) -> AppResult<()> {
    NaiveDate::parse_from_str(date, "%Y-%m-%d").map_err(|_| AppError::invalid("not a date"))?;
    match minutes {
        Some(m) if (0..=24 * 60).contains(&m) => conn.execute(
            "INSERT INTO day_overrides (date, minutes) VALUES (?1, ?2)
             ON CONFLICT (date) DO UPDATE SET minutes = excluded.minutes",
            params![date, m],
        )?,
        Some(_) => return Err(AppError::invalid("minutes are 0-1440")),
        None => conn.execute("DELETE FROM day_overrides WHERE date = ?1", params![date])?,
    };
    Ok(())
}

/// Everything needed to answer "how much time is there on day X" without more queries.
pub struct CapacityTable {
    week: [Option<i64>; 7],
    overrides: HashMap<NaiveDate, i64>,
}

impl CapacityTable {
    pub fn load(conn: &Connection) -> AppResult<Self> {
        let mut overrides = HashMap::new();
        for o in self::overrides(conn, "0000-01-01", "9999-12-31")? {
            if let Ok(date) = NaiveDate::parse_from_str(&o.date, "%Y-%m-%d") {
                overrides.insert(date, o.minutes);
            }
        }
        Ok(Self {
            week: week(conn)?.0,
            overrides,
        })
    }

    pub fn on(&self, date: NaiveDate) -> Option<i64> {
        self.overrides
            .get(&date)
            .copied()
            .or(self.week[date.weekday().num_days_from_monday() as usize])
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    #[test]
    fn overrides_win_over_weekdays() {
        let conn = open_in_memory();
        // 2026-11-21 is a Saturday.
        set_weekday(&conn, 5, Some(0)).unwrap();
        set_weekday(&conn, 0, Some(240)).unwrap();
        set_override(&conn, "2026-11-21", Some(120)).unwrap();

        let table = CapacityTable::load(&conn).unwrap();
        let day = |d: &str| NaiveDate::parse_from_str(d, "%Y-%m-%d").unwrap();
        assert_eq!(table.on(day("2026-11-21")), Some(120)); // override
        assert_eq!(table.on(day("2026-11-28")), Some(0)); // Saturday rest day
        assert_eq!(table.on(day("2026-11-23")), Some(240)); // Monday
        assert_eq!(table.on(day("2026-11-24")), None); // never set: no limit

        set_override(&conn, "2026-11-21", None).unwrap();
        assert_eq!(
            CapacityTable::load(&conn).unwrap().on(day("2026-11-21")),
            Some(0)
        );
        assert!(set_weekday(&conn, 7, Some(10)).is_err());
        assert!(set_override(&conn, "2026-11-21", Some(-5)).is_err());
    }
}
