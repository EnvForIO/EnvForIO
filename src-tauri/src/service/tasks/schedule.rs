//! Putting tasks on the calendar.
//!
//! Which day a task is on is `query::IN_DAYS`. "To schedule" is every open
//! task that has no day to do it on: never planned, or planned for a day
//! that has passed.

use rusqlite::{params, Connection};

use super::query::{self, IN_DAYS};
use crate::domain::day::now_timestamp;
use crate::entity::task::{Task, TASK_COLUMNS};
use crate::errors::{AppError, AppResult};
use crate::service::validate::check_date;

const ORDER: &str = "ORDER BY (t.done_at IS NOT NULL), t.is_pinned DESC, t.sort_order, t.id";

/// The tasks on the days `from..=to`. One planned in the range and due in
/// it comes back once; the calendar draws it on both days.
pub fn in_range(conn: &Connection, from: &str, to: &str) -> AppResult<Vec<Task>> {
    let sql = format!("SELECT {TASK_COLUMNS} FROM tasks t WHERE {IN_DAYS} {ORDER}");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![from, to], Task::from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

/// Open tasks to plan: project tasks first (they feed the safety line).
/// A task planned for a past day and not finished comes back here rather
/// than moving to today by itself (user decision 2026-11-20).
pub fn unscheduled(conn: &Connection, today: &str) -> AppResult<Vec<Task>> {
    let sql = format!(
        "SELECT {TASK_COLUMNS} FROM tasks t
         WHERE (t.scheduled_date IS NULL OR t.scheduled_date < ?1) AND t.done_at IS NULL
         ORDER BY (t.project_id IS NULL), t.due_date IS NULL, t.due_date, t.sort_order, t.id"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![today], Task::from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

/// Schedule a task on a day, or take it off the calendar with None.
pub fn schedule(conn: &Connection, id: i64, date: Option<String>) -> AppResult<Task> {
    check_date(&date)?;
    let changed = conn.execute(
        "UPDATE tasks SET scheduled_date = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, date, now_timestamp()],
    )?;
    if changed == 0 {
        return Err(AppError::not_found("task", id));
    }
    query::get(conn, id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use crate::service::tasks::mutation::{create, create_due, create_on_day, set_done};
    use crate::service::tasks::query::TaskView;

    const TODAY: &str = "2026-11-20";

    #[test]
    fn scheduling_moves_tasks_between_the_pool_and_days() {
        let conn = open_in_memory();
        let a = create(&conn, "read paper", TaskView::Tasks, TODAY).unwrap();
        let b = create_on_day(&conn, "lab meeting", "2026-11-21").unwrap();
        let due = create_due(&conn, "submit", "2026-11-25").unwrap();

        let pool = |today: &str| -> Vec<i64> {
            unscheduled(&conn, today)
                .unwrap()
                .into_iter()
                .map(|t| t.id)
                .collect()
        };
        // Dated first. "lab meeting" is planned for tomorrow, so it is not here.
        assert_eq!(pool(TODAY), [due.id, a.id]);
        // Once its day has passed unfinished, a planned task is back in the pool.
        assert_eq!(pool("2026-11-22"), [due.id, b.id, a.id]);
        assert_eq!(b.scheduled_date.as_deref(), Some("2026-11-21"));

        schedule(&conn, a.id, Some("2026-11-20".into())).unwrap();
        let week: Vec<_> = in_range(&conn, "2026-11-16", "2026-11-22")
            .unwrap()
            .into_iter()
            .map(|t| t.title)
            .collect();
        assert_eq!(week.len(), 2);
        assert!(in_range(&conn, "2026-11-23", "2026-11-29")
            .unwrap()
            .iter()
            .any(|t| t.id == due.id));

        set_done(&conn, due.id, true).unwrap();
        assert!(pool(TODAY).is_empty());
        schedule(&conn, a.id, None).unwrap();
        assert_eq!(pool(TODAY), [a.id]);
        assert!(schedule(&conn, a.id, Some("soon".into())).is_err());
    }
}
