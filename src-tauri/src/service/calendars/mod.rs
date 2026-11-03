//! External calendars: read-only ICS subscriptions and the occurrences of
//! their events (user decisions 2026-11-20: Outlook / Office 365 and
//! course or seminar feeds; shown on the calendar page; refreshed on
//! start and every hour). Downloading is in `fetch`, parsing in
//! `domain::ics`; this keeps the list and the stored occurrences.

pub mod fetch;

use rusqlite::{params, Connection, OptionalExtension};

use crate::domain::ics::{feed_url, Occurrence};
use crate::entity::calendar::{Calendar, CalendarEvent};
use crate::errors::{AppError, AppResult};
use crate::service::validate::clean_name;

/// Occurrences are kept from this far back...
pub const KEEP_BACK_MS: i64 = 92 * 86_400_000;
/// ...to this far ahead.
pub const KEEP_AHEAD_MS: i64 = 366 * 86_400_000;

const COLUMNS: &str = "c.id, c.name, c.url, c.color, c.is_visible, c.fetched_at, c.error, \
     (SELECT count(*) FROM calendar_events e WHERE e.calendar_id = c.id)";

fn from_row(r: &rusqlite::Row) -> rusqlite::Result<Calendar> {
    Ok(Calendar {
        id: r.get(0)?,
        name: r.get(1)?,
        url: r.get(2)?,
        color: r.get(3)?,
        is_visible: r.get(4)?,
        fetched_at: r.get(5)?,
        error: r.get(6)?,
        event_count: r.get(7)?,
    })
}

fn check_color(color: &str) -> AppResult<()> {
    let ok = color.len() == 7
        && color.starts_with('#')
        && color[1..].chars().all(|c| c.is_ascii_hexdigit());
    if ok {
        Ok(())
    } else {
        Err(AppError::invalid(format!("not a colour: {color}")))
    }
}

pub fn list(conn: &Connection) -> AppResult<Vec<Calendar>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {COLUMNS} FROM calendars c ORDER BY c.sort_order, c.id"
    ))?;
    let rows = stmt.query_map([], from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<Calendar> {
    conn.query_row(
        &format!("SELECT {COLUMNS} FROM calendars c WHERE c.id = ?1"),
        [id],
        from_row,
    )
    .optional()?
    .ok_or_else(|| AppError::not_found("calendar", id))
}

/// Subscribes to a feed. webcal:// links are kept as https://.
pub fn add(conn: &Connection, name: &str, url: &str, color: &str) -> AppResult<Calendar> {
    let name = clean_name(name)?;
    let url = feed_url(url).ok_or_else(|| {
        AppError::invalid("the link must start with https://, http:// or webcal://")
    })?;
    check_color(color)?;
    let taken: bool = conn.query_row(
        "SELECT count(*) > 0 FROM calendars WHERE url = ?1",
        [&url],
        |r| r.get(0),
    )?;
    if taken {
        return Err(AppError::invalid("this calendar is already added"));
    }
    conn.execute(
        "INSERT INTO calendars (name, url, color, sort_order)
         VALUES (?1, ?2, ?3, (SELECT coalesce(max(sort_order), 0) + 1 FROM calendars))",
        params![name, url, color],
    )?;
    get(conn, conn.last_insert_rowid())
}

pub fn update(
    conn: &Connection,
    id: i64,
    name: &str,
    color: &str,
    visible: bool,
) -> AppResult<Calendar> {
    let name = clean_name(name)?;
    check_color(color)?;
    let changed = conn.execute(
        "UPDATE calendars SET name = ?2, color = ?3, is_visible = ?4 WHERE id = ?1",
        params![id, name, color, visible],
    )?;
    if changed == 0 {
        return Err(AppError::not_found("calendar", id));
    }
    get(conn, id)
}

pub fn remove(conn: &Connection, id: i64) -> AppResult<()> {
    if conn.execute("DELETE FROM calendars WHERE id = ?1", [id])? == 0 {
        return Err(AppError::not_found("calendar", id));
    }
    Ok(())
}

/// A successful download: its occurrences replace the old ones.
pub fn store(conn: &mut Connection, id: i64, events: &[Occurrence], now: &str) -> AppResult<()> {
    let tx = conn.transaction()?;
    tx.execute("DELETE FROM calendar_events WHERE calendar_id = ?1", [id])?;
    {
        let mut insert = tx.prepare(
            "INSERT INTO calendar_events (calendar_id, title, location, start_ms, end_ms, all_day)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        )?;
        for e in events {
            insert.execute(params![
                id, e.title, e.location, e.start_ms, e.end_ms, e.all_day
            ])?;
        }
    }
    tx.execute(
        "UPDATE calendars SET fetched_at = ?2, error = NULL WHERE id = ?1",
        params![id, now],
    )?;
    tx.commit()?;
    Ok(())
}

/// A failed download: the old events stay, with the reason beside them.
pub fn set_error(conn: &Connection, id: i64, error: &str) -> AppResult<()> {
    conn.execute(
        "UPDATE calendars SET error = ?2 WHERE id = ?1",
        params![id, error],
    )?;
    Ok(())
}

/// Events of visible calendars overlapping `from_ms`..`to_ms`, soonest first.
pub fn events(conn: &Connection, from_ms: i64, to_ms: i64) -> AppResult<Vec<CalendarEvent>> {
    let mut stmt = conn.prepare(
        "SELECT e.id, e.calendar_id, c.color, e.title, e.location, e.start_ms, e.end_ms, e.all_day
         FROM calendar_events e JOIN calendars c ON c.id = e.calendar_id
         WHERE c.is_visible = 1 AND e.start_ms < ?2 AND max(e.end_ms, e.start_ms + 1) > ?1
         ORDER BY e.all_day DESC, e.start_ms, e.end_ms",
    )?;
    let rows = stmt.query_map(params![from_ms, to_ms], |r| {
        Ok(CalendarEvent {
            id: r.get(0)?,
            calendar_id: r.get(1)?,
            color: r.get(2)?,
            title: r.get(3)?,
            location: r.get(4)?,
            start_ms: r.get(5)?,
            end_ms: r.get(6)?,
            all_day: r.get(7)?,
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    fn occ(title: &str, start_ms: i64) -> Occurrence {
        Occurrence {
            title: title.into(),
            location: String::new(),
            start_ms,
            end_ms: start_ms + 3_600_000,
            all_day: false,
        }
    }

    #[test]
    fn a_subscription_keeps_its_latest_download() {
        let mut conn = open_in_memory();
        let cal = add(&conn, "Lab", "webcal://example.org/lab.ics", "#0071e3").unwrap();
        assert_eq!(cal.url, "https://example.org/lab.ics");
        assert!(add(&conn, "Again", "https://example.org/lab.ics", "#0071e3").is_err());
        assert!(add(&conn, "Bad", "ftp://x", "#0071e3").is_err());
        assert!(add(&conn, "Bad", "https://y", "blue").is_err());

        store(
            &mut conn,
            cal.id,
            &[occ("a", 1000), occ("b", 5_000_000)],
            "t1",
        )
        .unwrap();
        store(&mut conn, cal.id, &[occ("c", 2000)], "t2").unwrap();
        set_error(&conn, cal.id, "timed out").unwrap();
        let now = get(&conn, cal.id).unwrap();
        assert_eq!(
            (
                now.event_count,
                now.fetched_at.as_deref(),
                now.error.as_deref()
            ),
            (1, Some("t2"), Some("timed out"))
        );
        assert_eq!(events(&conn, 0, 10_000).unwrap()[0].title, "c");

        // Hidden calendars show nothing; removing one removes its events.
        update(&conn, cal.id, "Lab", "#ff3b30", false).unwrap();
        assert!(events(&conn, 0, 10_000).unwrap().is_empty());
        remove(&conn, cal.id).unwrap();
        assert!(list(&conn).unwrap().is_empty());
    }
}
