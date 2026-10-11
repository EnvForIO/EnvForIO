//! The `tasks` and `task_steps` tables as Rust types.
//!
//! These are also the shapes the frontend receives (via tauri-specta), so
//! only columns the UI uses today are exposed. Phase 2 columns stay in the
//! table and get fields when Phase 2 needs them.

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
    pub my_day_date: Option<String>, // 'YYYY-MM-DD'; in My Day while it equals today
    pub due_date: Option<String>,    // 'YYYY-MM-DD'
    pub done_at: Option<String>,     // RFC 3339 UTC; None = open
    pub sort_order: f64,
    pub step_count: i64,
    pub steps_done: i64,
    pub created_at: String,
}

/// Columns in the order `Task::from_row` reads them. Step counts come from a subquery.
pub const TASK_COLUMNS: &str = "t.id, t.title, t.note, t.is_important, t.is_pinned, \
     t.my_day_date, t.due_date, t.done_at, t.sort_order, \
     (SELECT count(*) FROM task_steps s WHERE s.task_id = t.id), \
     (SELECT count(*) FROM task_steps s WHERE s.task_id = t.id AND s.is_done = 1), \
     t.created_at";

impl Task {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            title: row.get(1)?,
            note: row.get(2)?,
            is_important: row.get(3)?,
            is_pinned: row.get(4)?,
            my_day_date: row.get(5)?,
            due_date: row.get(6)?,
            done_at: row.get(7)?,
            sort_order: row.get(8)?,
            step_count: row.get(9)?,
            steps_done: row.get(10)?,
            created_at: row.get(11)?,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TaskStep {
    pub id: i64,
    pub task_id: i64,
    pub title: String,
    pub is_done: bool,
    pub sort_order: f64,
}

pub const STEP_COLUMNS: &str = "id, task_id, title, is_done, sort_order";

impl TaskStep {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            task_id: row.get(1)?,
            title: row.get(2)?,
            is_done: row.get(3)?,
            sort_order: row.get(4)?,
        })
    }
}
