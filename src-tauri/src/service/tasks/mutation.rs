//! Changing tasks and steps. Every function returns the row as it is now,
//! so the UI can update without a second round trip.

use chrono::NaiveDate;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use specta::Type;

use super::query::{self, TaskView};
use crate::domain::day::now_timestamp;
use crate::entity::task::{Task, TaskStep};
use crate::errors::{AppError, AppResult};

/// Everything the details pane can edit, sent whole on every save.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TaskUpdate {
    pub title: String,
    pub note: String,
    pub is_important: bool,
    pub is_pinned: bool,
    pub in_my_day: bool,
    pub due_date: Option<String>, // 'YYYY-MM-DD'
}

fn clean_title(title: &str) -> AppResult<String> {
    let title = title.trim();
    if title.is_empty() {
        return Err(AppError::invalid("title is empty"));
    }
    Ok(title.to_string())
}

fn check_date(date: &Option<String>) -> AppResult<()> {
    if let Some(d) = date {
        NaiveDate::parse_from_str(d, "%Y-%m-%d")
            .map_err(|_| AppError::invalid(format!("not a date: {d}")))?;
    }
    Ok(())
}

/// Add a task to the top of a list. The list decides the defaults, as in
/// Microsoft To Do: adding in My Day puts it in My Day, in Important flags it,
/// in Planned gives it today's date.
pub fn create(conn: &Connection, title: &str, view: TaskView, today: &str) -> AppResult<Task> {
    let title = clean_title(title)?;
    let now = now_timestamp();
    let top: f64 = conn.query_row(
        "SELECT coalesce(min(sort_order), 0) - 1 FROM tasks",
        [],
        |r| r.get(0),
    )?;
    let my_day = (view == TaskView::MyDay).then_some(today);
    let due = (view == TaskView::Planned).then_some(today);
    conn.execute(
        "INSERT INTO tasks (title, is_important, my_day_date, due_date, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?6)",
        params![title, view == TaskView::Important, my_day, due, top, now],
    )?;
    query::get(conn, conn.last_insert_rowid())
}

/// Add a task from the Todo Duo card for `date`. Today's card is My Day;
/// any other day's task gets that day as its due date (its "date tag").
pub fn create_on_day(conn: &Connection, title: &str, date: &str, today: &str) -> AppResult<Task> {
    check_date(&Some(date.to_string()))?;
    let view = if date == today {
        TaskView::MyDay
    } else {
        TaskView::Planned
    };
    // `create` dates My Day and Planned tasks with its last argument, so pass the card's date.
    create(conn, title, view, date)
}

pub fn update(conn: &Connection, id: i64, update: &TaskUpdate, today: &str) -> AppResult<Task> {
    let title = clean_title(&update.title)?;
    check_date(&update.due_date)?;
    let current = query::get(conn, id)?;
    // Keep the original My Day date if it is already in My Day; leaving My Day clears it.
    let my_day = match (update.in_my_day, current.my_day_date.as_deref()) {
        (true, Some(d)) if d == today => Some(d.to_string()),
        (true, _) => Some(today.to_string()),
        (false, _) => None,
    };
    conn.execute(
        "UPDATE tasks SET title = ?2, note = ?3, is_important = ?4, is_pinned = ?5,
             my_day_date = ?6, due_date = ?7, updated_at = ?8
         WHERE id = ?1",
        params![
            id,
            title,
            update.note,
            update.is_important,
            update.is_pinned,
            my_day,
            update.due_date,
            now_timestamp()
        ],
    )?;
    query::get(conn, id)
}

pub fn set_done(conn: &Connection, id: i64, done: bool) -> AppResult<Task> {
    let now = now_timestamp();
    let done_at = done.then_some(now.as_str());
    let changed = conn.execute(
        "UPDATE tasks SET done_at = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, done_at, now],
    )?;
    if changed == 0 {
        return Err(AppError::not_found("task", id));
    }
    query::get(conn, id)
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    // Steps go with it (ON DELETE CASCADE).
    if conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])? == 0 {
        return Err(AppError::not_found("task", id));
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Steps

pub fn add_step(conn: &Connection, task_id: i64, title: &str) -> AppResult<TaskStep> {
    let title = clean_title(title)?;
    query::get(conn, task_id)?; // a clear NotFound instead of a foreign key error
    let bottom: f64 = conn.query_row(
        "SELECT coalesce(max(sort_order), 0) + 1 FROM task_steps WHERE task_id = ?1",
        params![task_id],
        |r| r.get(0),
    )?;
    conn.execute(
        "INSERT INTO task_steps (task_id, title, sort_order) VALUES (?1, ?2, ?3)",
        params![task_id, title, bottom],
    )?;
    query::get_step(conn, conn.last_insert_rowid())
}

pub fn set_step_done(conn: &Connection, id: i64, done: bool) -> AppResult<TaskStep> {
    if conn.execute(
        "UPDATE task_steps SET is_done = ?2 WHERE id = ?1",
        params![id, done],
    )? == 0
    {
        return Err(AppError::not_found("step", id));
    }
    query::get_step(conn, id)
}

pub fn delete_step(conn: &Connection, id: i64) -> AppResult<()> {
    if conn.execute("DELETE FROM task_steps WHERE id = ?1", params![id])? == 0 {
        return Err(AppError::not_found("step", id));
    }
    Ok(())
}
