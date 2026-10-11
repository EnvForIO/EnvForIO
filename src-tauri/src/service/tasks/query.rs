//! Reading tasks: the four built-in lists and a task's steps.
//!
//! Every list shows pinned tasks first, then open before done, then the
//! user's manual order. Done tasks stay in the list; the UI folds them
//! into a "Completed" section like Microsoft To Do.

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::entity::task::{Task, TaskStep, STEP_COLUMNS, TASK_COLUMNS};
use crate::errors::{AppError, AppResult};

/// The built-in lists in the sidebar.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
pub enum TaskView {
    MyDay,     // added to My Day today
    Important, // flagged
    Planned,   // has a due date
    Tasks,     // everything not in a project (the task pool)
}

const ORDER: &str = "ORDER BY t.is_pinned DESC, (t.done_at IS NOT NULL), t.sort_order, t.id";

pub fn list(conn: &Connection, view: TaskView, today: &str) -> AppResult<Vec<Task>> {
    let filter = match view {
        TaskView::MyDay => "t.my_day_date = ?1",
        TaskView::Important => "t.is_important = 1 AND ?1 IS NOT NULL",
        // Planned is ordered by date first: the nearest deadline on top.
        TaskView::Planned => "t.due_date IS NOT NULL AND ?1 IS NOT NULL",
        TaskView::Tasks => "t.project_id IS NULL AND ?1 IS NOT NULL",
    };
    let order = if view == TaskView::Planned {
        "ORDER BY t.is_pinned DESC, (t.done_at IS NOT NULL), t.due_date, t.sort_order, t.id"
    } else {
        ORDER
    };
    // `?1 IS NOT NULL` keeps one parameter in every query so they share one code path.
    let sql = format!("SELECT {TASK_COLUMNS} FROM tasks t WHERE {filter} {order}");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![today], Task::from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<Task> {
    let sql = format!("SELECT {TASK_COLUMNS} FROM tasks t WHERE t.id = ?1");
    conn.query_row(&sql, params![id], Task::from_row)
        .optional()?
        .ok_or_else(|| AppError::not_found("task", id))
}

pub fn steps(conn: &Connection, task_id: i64) -> AppResult<Vec<TaskStep>> {
    let sql =
        format!("SELECT {STEP_COLUMNS} FROM task_steps WHERE task_id = ?1 ORDER BY sort_order, id");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![task_id], TaskStep::from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn get_step(conn: &Connection, id: i64) -> AppResult<TaskStep> {
    let sql = format!("SELECT {STEP_COLUMNS} FROM task_steps WHERE id = ?1");
    conn.query_row(&sql, params![id], TaskStep::from_row)
        .optional()?
        .ok_or_else(|| AppError::not_found("step", id))
}
