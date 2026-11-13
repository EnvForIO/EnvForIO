//! The `tasks` table as a Rust type. A task can hold subtasks, which are
//! tasks too (`parent_id`), one level deep.
//!
//! These are also the shapes the frontend receives (via tauri-specta), so
//! only columns the UI uses are exposed; the rest get fields when needed.

use rusqlite::Row;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Task {
    pub id: i64,
    pub title: String,
    pub note: String,
    pub is_important: bool,
    pub is_pinned: bool,
    pub due_date: Option<String>, // 'YYYY-MM-DD'
    pub done_at: Option<String>,  // RFC 3339 UTC; None = open
    pub sort_order: f64,
    pub project_id: Option<i64>,
    pub module_id: Option<i64>,
    pub estimate_minutes: Option<i64>,
    pub actual_minutes: Option<i64>, // time recorded by the timer (or typed in)
    /// 'YYYY-MM-DD': the day the task is planned for. "In My Day" means this is today.
    pub scheduled_date: Option<String>,
    pub start_time: Option<String>, // 'HH:MM', from quick capture
    pub end_time: Option<String>,   // 'HH:MM'
    /// The task this one is a subtask of (one level deep), and its title.
    pub parent_id: Option<i64>,
    pub parent_title: Option<String>,
    pub subtask_count: i64,
    pub subtasks_done: i64,
    pub created_at: String,
    /// The idea this task is a todo of, if any.
    pub idea_id: Option<i64>,
    /// RFC 3339 UTC; set while the task is in progress ("Doing" on a board).
    pub started_at: Option<String>,
}

/// Columns in the order `Task::from_row` reads them. The parent's title and
/// the subtask counts come from subqueries.
pub const TASK_COLUMNS: &str = "t.id, t.title, t.note, t.is_important, t.is_pinned, \
     t.due_date, t.done_at, t.sort_order, \
     t.project_id, t.module_id, t.estimate_minutes, t.actual_minutes, t.scheduled_date, \
     t.start_time, t.end_time, \
     t.parent_id, (SELECT p.title FROM tasks p WHERE p.id = t.parent_id), \
     (SELECT count(*) FROM tasks c WHERE c.parent_id = t.id), \
     (SELECT count(*) FROM tasks c WHERE c.parent_id = t.id AND c.done_at IS NOT NULL), \
     t.created_at, t.idea_id, t.started_at";

impl Task {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            title: row.get(1)?,
            note: row.get(2)?,
            is_important: row.get(3)?,
            is_pinned: row.get(4)?,
            due_date: row.get(5)?,
            done_at: row.get(6)?,
            sort_order: row.get(7)?,
            project_id: row.get(8)?,
            module_id: row.get(9)?,
            estimate_minutes: row.get(10)?,
            actual_minutes: row.get(11)?,
            scheduled_date: row.get(12)?,
            start_time: row.get(13)?,
            end_time: row.get(14)?,
            parent_id: row.get(15)?,
            parent_title: row.get(16)?,
            subtask_count: row.get(17)?,
            subtasks_done: row.get(18)?,
            created_at: row.get(19)?,
            idea_id: row.get(20)?,
            started_at: row.get(21)?,
        })
    }
}
