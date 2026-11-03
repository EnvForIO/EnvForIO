//! The `tasks` and `task_steps` tables as Rust types.
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
    pub my_day_date: Option<String>, // 'YYYY-MM-DD'; in My Day while it equals today
    pub due_date: Option<String>,    // 'YYYY-MM-DD'
    pub done_at: Option<String>,     // RFC 3339 UTC; None = open
    pub sort_order: f64,
    pub project_id: Option<i64>,
    pub module_id: Option<i64>,
    pub estimate_minutes: Option<i64>,
    pub actual_minutes: Option<i64>, // time recorded by the timer (or typed in)
    pub scheduled_date: Option<String>, // 'YYYY-MM-DD': the day it is planned on the calendar
    pub start_time: Option<String>,  // 'HH:MM', from quick capture
    pub end_time: Option<String>,    // 'HH:MM'
    pub step_count: i64,
    pub steps_done: i64,
    pub created_at: String,
    /// The idea this task is a todo of, if any.
    pub idea_id: Option<i64>,
}

/// Columns in the order `Task::from_row` reads them. Step counts come from a subquery.
pub const TASK_COLUMNS: &str = "t.id, t.title, t.note, t.is_important, t.is_pinned, \
     t.my_day_date, t.due_date, t.done_at, t.sort_order, \
     t.project_id, t.module_id, t.estimate_minutes, t.actual_minutes, t.scheduled_date, \
     t.start_time, t.end_time, \
     (SELECT count(*) FROM task_steps s WHERE s.task_id = t.id), \
     (SELECT count(*) FROM task_steps s WHERE s.task_id = t.id AND s.is_done = 1), \
     t.created_at, t.idea_id";

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
            project_id: row.get(9)?,
            module_id: row.get(10)?,
            estimate_minutes: row.get(11)?,
            actual_minutes: row.get(12)?,
            scheduled_date: row.get(13)?,
            start_time: row.get(14)?,
            end_time: row.get(15)?,
            step_count: row.get(16)?,
            steps_done: row.get(17)?,
            created_at: row.get(18)?,
            idea_id: row.get(19)?,
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
