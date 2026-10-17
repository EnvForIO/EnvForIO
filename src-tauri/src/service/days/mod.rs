//! Day notes: one free-text note per date, shown on the calendar.
//! Saving an empty note deletes it.

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::domain::day::now_timestamp;
use crate::errors::AppResult;
use crate::service::validate::check_date;

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
pub struct DayNote {
    pub date: String, // 'YYYY-MM-DD'
    pub text: String,
}

pub fn notes(conn: &Connection, from: &str, to: &str) -> AppResult<Vec<DayNote>> {
    let mut stmt = conn
        .prepare("SELECT date, text FROM day_notes WHERE date BETWEEN ?1 AND ?2 ORDER BY date")?;
    let rows = stmt.query_map(params![from, to], |r| {
        Ok(DayNote {
            date: r.get(0)?,
            text: r.get(1)?,
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn set_note(conn: &Connection, date: &str, text: &str) -> AppResult<()> {
    check_date(&Some(date.to_string()))?;
    let text = text.trim();
    if text.is_empty() {
        conn.execute("DELETE FROM day_notes WHERE date = ?1", params![date])?;
    } else {
        conn.execute(
            "INSERT INTO day_notes (date, text, updated_at) VALUES (?1, ?2, ?3)
             ON CONFLICT (date) DO UPDATE SET text = excluded.text, updated_at = excluded.updated_at",
            params![date, text, now_timestamp()],
        )?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    #[test]
    fn empty_text_deletes_the_note() {
        let conn = open_in_memory();
        set_note(&conn, "2026-11-20", "group meeting moved").unwrap();
        set_note(&conn, "2026-11-20", "  group meeting at 3  ").unwrap();
        let all = notes(&conn, "2026-11-01", "2026-11-30").unwrap();
        assert_eq!(
            all,
            [DayNote {
                date: "2026-11-20".into(),
                text: "group meeting at 3".into()
            }]
        );
        set_note(&conn, "2026-11-20", " ").unwrap();
        assert!(notes(&conn, "2026-11-01", "2026-11-30").unwrap().is_empty());
        assert!(set_note(&conn, "tomorrow", "x").is_err());
    }
}
