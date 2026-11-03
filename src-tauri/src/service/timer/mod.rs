//! The task timer: one session runs at a time. Starting another stops the
//! current one; stopping adds the session's minutes to the task's actual time.

use chrono::{DateTime, Utc};
use rusqlite::{params, Connection, OptionalExtension};
use serde::Serialize;
use specta::Type;

use crate::domain::day::now_timestamp;
use crate::errors::{AppError, AppResult};
use crate::service::tasks::query;

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RunningTimer {
    pub task_id: i64,
    pub title: String,
    pub started_at: String, // RFC 3339 UTC; the UI counts up from here
}

pub fn running(conn: &Connection) -> AppResult<Option<RunningTimer>> {
    Ok(conn
        .query_row(
            "SELECT e.task_id, t.title, e.started_at FROM time_entries e
             JOIN tasks t ON t.id = e.task_id WHERE e.ended_at IS NULL",
            [],
            |r| {
                Ok(RunningTimer {
                    task_id: r.get(0)?,
                    title: r.get(1)?,
                    started_at: r.get(2)?,
                })
            },
        )
        .optional()?)
}

pub fn start(conn: &Connection, task_id: i64) -> AppResult<RunningTimer> {
    let task = query::get(conn, task_id)?;
    if task.done_at.is_some() {
        return Err(AppError::invalid("the task is already done"));
    }
    stop(conn)?;
    let now = now_timestamp();
    conn.execute(
        "INSERT INTO time_entries (task_id, started_at) VALUES (?1, ?2)",
        params![task_id, now],
    )?;
    // Timing a task means working on it: "Doing" on its project's board.
    conn.execute(
        "UPDATE tasks SET started_at = coalesce(started_at, ?2) WHERE id = ?1",
        params![task_id, now],
    )?;
    running(conn)?.ok_or_else(|| AppError::invalid("timer did not start"))
}

/// Stop the running session, if any, and credit its minutes to the task.
/// Returns the minutes added (0 when nothing was running).
pub fn stop(conn: &Connection) -> AppResult<i64> {
    let Some(timer) = running(conn)? else {
        return Ok(0);
    };
    let now = now_timestamp();
    let minutes = minutes_between(&timer.started_at, &now);
    conn.execute(
        "UPDATE time_entries SET ended_at = ?1 WHERE ended_at IS NULL",
        params![now],
    )?;
    conn.execute(
        "UPDATE tasks SET actual_minutes = coalesce(actual_minutes, 0) + ?2, updated_at = ?3
         WHERE id = ?1",
        params![timer.task_id, minutes, now],
    )?;
    Ok(minutes)
}

/// Whole minutes between two RFC 3339 timestamps, rounded to the nearest minute.
fn minutes_between(from: &str, to: &str) -> i64 {
    let parse = |s: &str| DateTime::parse_from_rfc3339(s).map(|d| d.with_timezone(&Utc));
    match (parse(from), parse(to)) {
        (Ok(a), Ok(b)) => ((b - a).num_seconds().max(0) + 30) / 60,
        _ => 0,
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use crate::service::tasks::mutation::create;
    use crate::service::tasks::query::TaskView;

    #[test]
    fn one_timer_at_a_time_and_stopping_adds_actual_time() {
        let conn = open_in_memory();
        let a = create(&conn, "write", TaskView::Tasks, "2026-11-20").unwrap();
        let b = create(&conn, "read", TaskView::Tasks, "2026-11-20").unwrap();

        start(&conn, a.id).unwrap();
        // Pretend it started 25 minutes ago.
        let earlier = (Utc::now() - chrono::Duration::minutes(25)).to_rfc3339();
        conn.execute("UPDATE time_entries SET started_at = ?1", params![earlier])
            .unwrap();

        // Starting b stops a and credits it.
        assert_eq!(start(&conn, b.id).unwrap().task_id, b.id);
        assert_eq!(query::get(&conn, a.id).unwrap().actual_minutes, Some(25));
        assert_eq!(running(&conn).unwrap().unwrap().title, "read");

        stop(&conn).unwrap();
        assert!(running(&conn).unwrap().is_none());
        assert_eq!(stop(&conn).unwrap(), 0);
    }

    #[test]
    fn minutes_round_to_the_nearest() {
        assert_eq!(
            minutes_between("2026-11-20T10:00:00Z", "2026-11-20T10:00:29Z"),
            0
        );
        assert_eq!(
            minutes_between("2026-11-20T10:00:00Z", "2026-11-20T10:00:31Z"),
            1
        );
        assert_eq!(
            minutes_between("2026-11-20T10:00:00Z", "2026-11-20T11:30:00Z"),
            90
        );
    }
}
