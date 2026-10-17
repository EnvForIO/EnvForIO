//! Putting tasks on the calendar.
//!
//! A task shows on a calendar day when it is scheduled for that day or due
//! that day. "To schedule" is every open task with no scheduled day.

use rusqlite::{params, Connection};

use super::mutation::create;
use super::query::{self, TaskView};
use crate::domain::day::now_timestamp;
use crate::entity::task::{Task, TASK_COLUMNS};
use crate::errors::{AppError, AppResult};
use crate::service::validate::check_date;

const ORDER: &str = "ORDER BY (t.done_at IS NOT NULL), t.is_pinned DESC, t.sort_order, t.id";

pub fn in_range(conn: &Connection, from: &str, to: &str) -> AppResult<Vec<Task>> {
    let sql = format!(
        "SELECT {TASK_COLUMNS} FROM tasks t
         WHERE t.scheduled_date BETWEEN ?1 AND ?2 OR t.due_date BETWEEN ?1 AND ?2 {ORDER}"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![from, to], Task::from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

/// Open tasks with no scheduled day: project tasks first (they feed the safety line).
pub fn unscheduled(conn: &Connection) -> AppResult<Vec<Task>> {
    let sql = format!(
        "SELECT {TASK_COLUMNS} FROM tasks t
         WHERE t.scheduled_date IS NULL AND t.done_at IS NULL
         ORDER BY (t.project_id IS NULL), t.due_date IS NULL, t.due_date, t.sort_order, t.id"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], Task::from_row)?;
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

/// A new task in the pool, scheduled on `date` (right-click a calendar day).
pub fn create_on(conn: &Connection, title: &str, date: &str) -> AppResult<Task> {
    check_date(&Some(date.to_string()))?;
    let task = create(conn, title, TaskView::Tasks, date)?;
    schedule(conn, task.id, Some(date.to_string()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use crate::service::tasks::mutation::set_done;

    #[test]
    fn scheduling_moves_tasks_between_the_pool_and_days() {
        let conn = open_in_memory();
        let a = create(&conn, "read paper", TaskView::Tasks, "2026-11-20").unwrap();
        let b = create_on(&conn, "lab meeting", "2026-11-21").unwrap();
        let due = create(&conn, "submit", TaskView::Planned, "2026-11-25").unwrap();

        let pool: Vec<_> = unscheduled(&conn)
            .unwrap()
            .into_iter()
            .map(|t| t.id)
            .collect();
        assert_eq!(pool, [due.id, a.id]); // dated first
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
        assert!(unscheduled(&conn).unwrap().is_empty());
        schedule(&conn, a.id, None).unwrap();
        assert_eq!(unscheduled(&conn).unwrap()[0].id, a.id);
        assert!(schedule(&conn, a.id, Some("soon".into())).is_err());
    }
}
