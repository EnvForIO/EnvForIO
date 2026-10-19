//! The item list: every task, filtered by status and optionally by project.

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::entity::task::{Task, TASK_COLUMNS};
use crate::errors::AppResult;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
pub enum ItemStatus {
    Open,         // not done
    WithDeadline, // not done and has a due date, nearest first
    Done,         // done, most recent first
    All,
}

/// `project`: None = any task; Some(0) = tasks outside projects; Some(id) = that project.
pub fn list(conn: &Connection, status: ItemStatus, project: Option<i64>) -> AppResult<Vec<Task>> {
    let (filter, order) = match status {
        ItemStatus::Open => ("t.done_at IS NULL", "t.is_pinned DESC, t.sort_order, t.id"),
        ItemStatus::WithDeadline => (
            "t.done_at IS NULL AND t.due_date IS NOT NULL",
            "t.due_date, t.sort_order, t.id",
        ),
        ItemStatus::Done => ("t.done_at IS NOT NULL", "t.done_at DESC, t.id DESC"),
        ItemStatus::All => ("1", "(t.done_at IS NOT NULL), t.sort_order, t.id"),
    };
    let project_filter = match project {
        None => "?1 IS NULL OR 1",
        Some(0) => "t.project_id IS NULL AND ?1 = 0",
        Some(_) => "t.project_id = ?1",
    };
    let sql = format!(
        "SELECT {TASK_COLUMNS} FROM tasks t WHERE {filter} AND ({project_filter}) ORDER BY {order}"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![project], Task::from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use crate::service::tasks::mutation::{create, set_done};
    use crate::service::tasks::query::TaskView;

    fn titles(tasks: Vec<Task>) -> Vec<String> {
        tasks.into_iter().map(|t| t.title).collect()
    }

    #[test]
    fn filters_by_status_and_project() {
        let conn = open_in_memory();
        let a = create(&conn, "a", TaskView::Tasks, "2026-11-20").unwrap();
        create(&conn, "due later", TaskView::Planned, "2026-11-30").unwrap();
        create(&conn, "due soon", TaskView::Planned, "2026-11-21").unwrap();
        set_done(&conn, a.id, true).unwrap();

        assert_eq!(list(&conn, ItemStatus::Open, None).unwrap().len(), 2);
        assert_eq!(
            titles(list(&conn, ItemStatus::WithDeadline, None).unwrap()),
            ["due soon", "due later"]
        );
        assert_eq!(titles(list(&conn, ItemStatus::Done, None).unwrap()), ["a"]);
        assert_eq!(list(&conn, ItemStatus::All, None).unwrap().len(), 3);
        assert_eq!(list(&conn, ItemStatus::All, Some(0)).unwrap().len(), 3); // none are in projects
        assert!(list(&conn, ItemStatus::All, Some(42)).unwrap().is_empty());
    }

    #[test]
    fn quick_capture_times_are_kept() {
        let conn = open_in_memory();
        let t = create(
            &conn,
            "14:00-15:00 group meeting",
            TaskView::MyDay,
            "2026-11-20",
        )
        .unwrap();
        assert_eq!(t.title, "group meeting");
        assert_eq!(
            (t.start_time.as_deref(), t.end_time.as_deref()),
            (Some("14:00"), Some("15:00"))
        );
    }
}
