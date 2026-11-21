//! Reading tasks: the built-in lists and a task's subtasks.
//!
//! Every list shows pinned tasks first, then open before done, then the
//! user's manual order. Done tasks stay in the list; the UI folds them
//! into a "Completed" section like Microsoft To Do.

use std::collections::HashSet;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::entity::task::{Task, TASK_COLUMNS};
use crate::errors::{AppError, AppResult};

/// The built-in lists in the sidebar.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
pub enum TaskView {
    MyDay,     // on today (see ON_DAY), plus what is overdue
    Important, // flagged
    Tasks,     // everything not in a project (the task pool)
}

const ORDER: &str = "ORDER BY t.is_pinned DESC, (t.done_at IS NOT NULL), t.sort_order, t.id";

// ---------------------------------------------------------------------------
// Which day a task is on
//
// One rule for every view: a task is on a day
// when it is planned for that day (`scheduled_date`) or due that day
// (`due_date`). It can be on two days: planned Monday, due Friday. My Day,
// the Todo Duo card, the heatmap, the calendar and stats all read it here.

/// "On day ?1". Needs the `tasks` table aliased as `t`.
pub const ON_DAY: &str = "(t.scheduled_date = ?1 OR t.due_date = ?1)";

/// "On a day from ?1 to ?2", both included.
pub const IN_DAYS: &str = "(t.scheduled_date BETWEEN ?1 AND ?2 OR t.due_date BETWEEN ?1 AND ?2)";

pub fn list(conn: &Connection, view: TaskView, today: &str) -> AppResult<Vec<Task>> {
    // Today also keeps what is overdue and still open, so a missed deadline
    // cannot slip out of sight.
    let my_day = format!("({ON_DAY} OR (t.due_date < ?1 AND t.done_at IS NULL))");
    let filter = match view {
        TaskView::MyDay => my_day.as_str(),
        TaskView::Important => "t.is_important = 1 AND ?1 IS NOT NULL",
        TaskView::Tasks => "t.project_id IS NULL AND ?1 IS NOT NULL",
    };
    // `?1 IS NOT NULL` keeps one parameter in every query so they share one code path.
    let sql = format!("SELECT {TASK_COLUMNS} FROM tasks t WHERE {filter} {ORDER}");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![today], Task::from_row)?;
    with_subtasks(conn, rows.collect::<Result<_, _>>()?)
}

// ---------------------------------------------------------------------------
// Days (Todo Duo card and heatmap)

/// How much of one day's tasks are done: one heatmap cell.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
pub struct DayCompletion {
    pub date: String, // 'YYYY-MM-DD'
    pub total: i64,
    pub done: i64,
}

pub fn list_day(conn: &Connection, date: &str) -> AppResult<Vec<Task>> {
    let sql = format!("SELECT {TASK_COLUMNS} FROM tasks t WHERE {ON_DAY} {ORDER}");
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![date], Task::from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

/// Completion for every day in `from..=to` that has at least one task.
/// Days without tasks are left out; the UI draws them empty.
pub fn day_completion(conn: &Connection, from: &str, to: &str) -> AppResult<Vec<DayCompletion>> {
    // The ON_DAY rule, one row per (task, day). UNION (not UNION ALL) so a
    // task planned and due on the same day counts once.
    let mut stmt = conn.prepare(
        "SELECT day, count(*), sum(done) FROM (
             SELECT id, scheduled_date AS day, done_at IS NOT NULL AS done
               FROM tasks WHERE scheduled_date BETWEEN ?1 AND ?2
             UNION
             SELECT id, due_date, done_at IS NOT NULL
               FROM tasks WHERE due_date BETWEEN ?1 AND ?2
         ) GROUP BY day ORDER BY day",
    )?;
    let rows = stmt.query_map(params![from, to], |row| {
        Ok(DayCompletion {
            date: row.get(0)?,
            total: row.get(1)?,
            done: row.get(2)?,
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

// ---------------------------------------------------------------------------
// Single rows

pub fn get(conn: &Connection, id: i64) -> AppResult<Task> {
    let sql = format!("SELECT {TASK_COLUMNS} FROM tasks t WHERE t.id = ?1");
    conn.query_row(&sql, params![id], Task::from_row)
        .optional()?
        .ok_or_else(|| AppError::not_found("task", id))
}

// ---------------------------------------------------------------------------
// Subtasks

/// A task's subtasks: open first, then in their order.
pub fn subtasks(conn: &Connection, parent: i64) -> AppResult<Vec<Task>> {
    let sql = format!(
        "SELECT {TASK_COLUMNS} FROM tasks t WHERE t.parent_id = ?1
         ORDER BY (t.done_at IS NOT NULL), t.sort_order, t.id"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![parent], Task::from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

/// A list with the subtasks of every parent in it: a list that shows a
/// task shows its subtasks under it. A
/// subtask that is in the list on its own, without its parent, stays as
/// it is; the UI shows it with its parent's title.
pub fn with_subtasks(conn: &Connection, mut tasks: Vec<Task>) -> AppResult<Vec<Task>> {
    let listed: HashSet<i64> = tasks.iter().map(|t| t.id).collect();
    let parents: Vec<i64> = tasks
        .iter()
        .filter(|t| t.subtask_count > 0)
        .map(|t| t.id)
        .collect();
    for parent in parents {
        let missing = subtasks(conn, parent)?
            .into_iter()
            .filter(|s| !listed.contains(&s.id));
        tasks.extend(missing);
    }
    Ok(tasks)
}
