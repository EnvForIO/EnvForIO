//! Changing tasks and subtasks. Every function returns the row as it is now,
//! so the UI can update without a second round trip.

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use specta::Type;

use super::query::{self, TaskView};
use crate::domain::day::now_timestamp;
use crate::domain::time_parse::capture;
use crate::entity::task::Task;
use crate::errors::{AppError, AppResult};
use crate::service::timer;
use crate::service::validate::{check_date, clean_name as clean_title, estimate_minutes};

/// Everything the details pane can edit, sent whole on every save.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TaskUpdate {
    pub title: String,
    pub note: String,
    pub is_important: bool,
    pub is_pinned: bool,
    pub scheduled_date: Option<String>, // 'YYYY-MM-DD', the day to do it; today = in My Day
    pub due_date: Option<String>,       // 'YYYY-MM-DD'
    pub estimate: Option<String>,       // typed, e.g. "1h30m"; None or "" = no estimate
}

/// Add a task to the top of a list. The list decides the defaults, as in
/// Microsoft To Do: adding in My Day plans it for today, in Important flags
/// it. A leading time ("14:00-15:00 seminar") becomes the task's time slot
/// (quick capture).
pub fn create(conn: &Connection, title: &str, view: TaskView, today: &str) -> AppResult<Task> {
    let captured = capture(title);
    let title = clean_title(&captured.title)?;
    let now = now_timestamp();
    let top: f64 = conn.query_row(
        "SELECT coalesce(min(sort_order), 0) - 1 FROM tasks",
        [],
        |r| r.get(0),
    )?;
    let scheduled = (view == TaskView::MyDay).then_some(today);
    conn.execute(
        "INSERT INTO tasks (title, is_important, scheduled_date, start_time, end_time,
                            sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        params![
            title,
            view == TaskView::Important,
            scheduled,
            captured.start,
            captured.end,
            top,
            now
        ],
    )?;
    query::get(conn, conn.last_insert_rowid())
}

/// Add a task planned for `date`: the Todo Duo card and the calendar's day
/// dialog. Both plan the task; neither sets a due date.
pub fn create_on_day(conn: &Connection, title: &str, date: &str) -> AppResult<Task> {
    check_date(&Some(date.to_string()))?;
    // My Day is "planned for today", so a task for another day is the same
    // insert with that day in place of today.
    create(conn, title, TaskView::MyDay, date)
}

/// A task in the pool due on `date`. Tests use it for dated tasks, since no
/// list creates them any more.
#[cfg(test)]
pub fn create_due(conn: &Connection, title: &str, date: &str) -> AppResult<Task> {
    let task = create(conn, title, TaskView::Tasks, date)?;
    conn.execute(
        "UPDATE tasks SET due_date = ?2 WHERE id = ?1",
        params![task.id, date],
    )?;
    query::get(conn, task.id)
}

pub fn update(conn: &Connection, id: i64, update: &TaskUpdate) -> AppResult<Task> {
    let title = clean_title(&update.title)?;
    check_date(&update.scheduled_date)?;
    check_date(&update.due_date)?;
    let changed = conn.execute(
        "UPDATE tasks SET title = ?2, note = ?3, is_important = ?4, is_pinned = ?5,
             scheduled_date = ?6, due_date = ?7, estimate_minutes = ?8, updated_at = ?9
         WHERE id = ?1",
        params![
            id,
            title,
            update.note,
            update.is_important,
            update.is_pinned,
            update.scheduled_date,
            update.due_date,
            estimate_minutes(&update.estimate)?,
            now_timestamp()
        ],
    )?;
    if changed == 0 {
        return Err(AppError::not_found("task", id));
    }
    query::get(conn, id)
}

/// Finishing a task finishes its open subtasks too, so no work is left
/// planned under a task marked done. Reopening it leaves them as they are.
pub fn set_done(conn: &Connection, id: i64, done: bool) -> AppResult<Task> {
    // Finishing the task the timer is running on (or one of its subtasks)
    // stops the timer and records its time.
    if done {
        if let Some(running) = timer::running(conn)? {
            let on_subtask: bool = conn.query_row(
                "SELECT count(*) > 0 FROM tasks WHERE id = ?1 AND parent_id = ?2",
                params![running.task_id, id],
                |r| r.get(0),
            )?;
            if running.task_id == id || on_subtask {
                timer::stop(conn)?;
            }
        }
    }
    let now = now_timestamp();
    let done_at = done.then_some(now.as_str());
    let changed = conn.execute(
        "UPDATE tasks SET done_at = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, done_at, now],
    )?;
    if changed == 0 {
        return Err(AppError::not_found("task", id));
    }
    if done {
        conn.execute(
            "UPDATE tasks SET done_at = ?2, updated_at = ?2
             WHERE parent_id = ?1 AND done_at IS NULL",
            params![id, now],
        )?;
    }
    query::get(conn, id)
}

/// Where a task stands on a project's board.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
pub enum TaskStage {
    Todo,
    Doing,
    Done,
}

/// Moves a task on the board. Doing keeps an earlier start time; To do
/// forgets it (and stops the timer on the task); Done completes the task.
pub fn set_stage(conn: &Connection, id: i64, stage: TaskStage) -> AppResult<Task> {
    if stage == TaskStage::Done {
        return set_done(conn, id, true);
    }
    if stage == TaskStage::Todo && timer::running(conn)?.is_some_and(|t| t.task_id == id) {
        timer::stop(conn)?;
    }
    let now = now_timestamp();
    let started = (stage == TaskStage::Doing).then_some(now.as_str());
    let changed = conn.execute(
        "UPDATE tasks SET done_at = NULL, updated_at = ?3,
             started_at = CASE WHEN ?2 IS NULL THEN NULL ELSE coalesce(started_at, ?2) END
         WHERE id = ?1",
        params![id, started, now],
    )?;
    if changed == 0 {
        return Err(AppError::not_found("task", id));
    }
    query::get(conn, id)
}

/// Puts the tasks of a list in the given order (a drag in the list): they
/// get the order numbers 0, 1, 2… Lists sort by these numbers after pinned
/// and done, so the dragged order shows in every list the tasks share.
pub fn reorder(conn: &mut Connection, ids: &[i64]) -> AppResult<()> {
    let tx = conn.transaction()?;
    for (i, id) in ids.iter().enumerate() {
        if tx.execute(
            "UPDATE tasks SET sort_order = ?2 WHERE id = ?1",
            params![id, i as f64],
        )? == 0
        {
            return Err(AppError::not_found("task", *id)); // dropping tx rolls back
        }
    }
    tx.commit()?;
    Ok(())
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    // Subtasks go with it (ON DELETE CASCADE).
    if conn.execute("DELETE FROM tasks WHERE id = ?1", params![id])? == 0 {
        return Err(AppError::not_found("task", id));
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Subtasks

/// Add a subtask at the bottom of a task's subtasks. It takes the parent's
/// project and module, so project views and the safety line see it there;
/// its dates and estimate are its own. Subtasks go one level deep.
pub fn add_subtask(
    conn: &Connection,
    parent_id: i64,
    title: &str,
    estimate: &Option<String>,
) -> AppResult<Task> {
    let title = clean_title(title)?;
    let minutes = estimate_minutes(estimate)?;
    let parent = query::get(conn, parent_id)?;
    if parent.parent_id.is_some() {
        return Err(AppError::invalid("a subtask cannot have subtasks"));
    }
    let bottom: f64 = conn.query_row(
        "SELECT coalesce(max(sort_order), 0) + 1 FROM tasks WHERE parent_id = ?1",
        params![parent_id],
        |r| r.get(0),
    )?;
    let now = now_timestamp();
    conn.execute(
        "INSERT INTO tasks (title, parent_id, project_id, module_id, estimate_minutes,
                            sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?7)",
        params![
            title,
            parent_id,
            parent.project_id,
            parent.module_id,
            minutes,
            bottom,
            now
        ],
    )?;
    query::get(conn, conn.last_insert_rowid())
}
