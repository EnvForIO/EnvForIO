//! Planning settings, stored in the `settings` table:
//! when a new day starts, and the two safety line switches.

use chrono::NaiveTime;
use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::domain::day::{set_day_start, DEFAULT_DAY_START};
use crate::domain::safety_line::Options;
use crate::errors::{AppError, AppResult};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PlanningSettings {
    pub day_start: String,    // 'HH:MM'
    pub level: bool,          // spread work across projects in 15-minute chunks
    pub earliest_first: bool, // squeeze the earliest deadlines into the start of their window
}

impl Default for PlanningSettings {
    fn default() -> Self {
        Self {
            day_start: "00:00".into(), // midnight; see domain::day
            level: true,
            earliest_first: false,
        }
    }
}

impl PlanningSettings {
    pub fn options(&self) -> Options {
        Options {
            level: self.level,
            earliest_first: self.earliest_first,
        }
    }
}

fn get(conn: &Connection, key: &str) -> AppResult<Option<String>> {
    Ok(conn
        .query_row(
            "SELECT value FROM settings WHERE key = ?1",
            params![key],
            |r| r.get(0),
        )
        .optional()?)
}

fn put(conn: &Connection, key: &str, value: &str) -> AppResult<()> {
    conn.execute(
        "INSERT INTO settings (key, value) VALUES (?1, ?2)
         ON CONFLICT (key) DO UPDATE SET value = excluded.value",
        params![key, value],
    )?;
    Ok(())
}

pub fn load(conn: &Connection) -> AppResult<PlanningSettings> {
    let defaults = PlanningSettings::default();
    Ok(PlanningSettings {
        day_start: get(conn, "day_start")?.unwrap_or(defaults.day_start),
        level: get(conn, "level")?.map_or(defaults.level, |v| v == "true"),
        earliest_first: get(conn, "earliest_first")?
            .map_or(defaults.earliest_first, |v| v == "true"),
    })
}

pub fn save(conn: &Connection, settings: &PlanningSettings) -> AppResult<PlanningSettings> {
    let start = NaiveTime::parse_from_str(&settings.day_start, "%H:%M")
        .map_err(|_| AppError::invalid("the day start is a time like 07:00"))?;
    put(conn, "day_start", &start.format("%H:%M").to_string())?;
    put(conn, "level", &settings.level.to_string())?;
    put(conn, "earliest_first", &settings.earliest_first.to_string())?;
    set_day_start(start);
    load(conn)
}

/// Apply the saved day start at startup.
pub fn apply(conn: &Connection) -> AppResult<()> {
    let settings = load(conn)?;
    set_day_start(
        NaiveTime::parse_from_str(&settings.day_start, "%H:%M").unwrap_or(DEFAULT_DAY_START),
    );
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    #[test]
    fn defaults_then_saved_values() {
        let conn = open_in_memory();
        assert_eq!(load(&conn).unwrap(), PlanningSettings::default());
        let saved = save(
            &conn,
            &PlanningSettings {
                day_start: "06:30".into(),
                level: false,
                earliest_first: true,
            },
        )
        .unwrap();
        assert_eq!(
            (saved.day_start.as_str(), saved.level, saved.earliest_first),
            ("06:30", false, true)
        );
        let bad = PlanningSettings {
            day_start: "noon".into(),
            ..PlanningSettings::default()
        };
        assert!(save(&conn, &bad).is_err());
        // Put the global rollover back for other tests.
        set_day_start(DEFAULT_DAY_START);
    }
}
