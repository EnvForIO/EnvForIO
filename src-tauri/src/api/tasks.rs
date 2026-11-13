//! Task commands the frontend can call. Each one takes the lock, works out
//! "today", and hands over to `service::tasks`; no logic lives here.

use tauri::State;

use crate::config::AppState;
use crate::domain::day::today;
use crate::entity::task::Task;
use crate::errors::AppResult;
use crate::service::tasks::items::{self, ItemStatus};
use crate::service::tasks::mutation::{self, TaskStage, TaskUpdate};
use crate::service::tasks::query::{self, DayCompletion, TaskView};

/// Today as EnvIO counts it (the day starts at 07:00), 'YYYY-MM-DD'.
/// The UI uses it to show "My Day" and overdue dates without its own day logic.
#[tauri::command]
#[specta::specta]
pub fn get_today() -> String {
    today()
}

#[tauri::command]
#[specta::specta]
pub fn list_tasks(state: State<'_, AppState>, view: TaskView) -> AppResult<Vec<Task>> {
    query::list(&state.db(), view, &today())
}

#[tauri::command]
#[specta::specta]
pub fn create_task(state: State<'_, AppState>, title: String, view: TaskView) -> AppResult<Task> {
    state.creating("Add task", |db| {
        mutation::create(db, &title, view, &today())
    })
}

#[tauri::command]
#[specta::specta]
pub fn update_task(state: State<'_, AppState>, id: i64, update: TaskUpdate) -> AppResult<Task> {
    state.changing("Edit task", &[id], |db| mutation::update(db, id, &update))
}

/// Puts a list's tasks in the order the user dragged them into.
#[tauri::command]
#[specta::specta]
pub fn reorder_tasks(state: State<'_, AppState>, ids: Vec<i64>) -> AppResult<()> {
    state.changing("Reorder tasks", &ids, |db| mutation::reorder(db, &ids))
}

/// Moves a task to To do, Doing or Done on a project's board.
#[tauri::command]
#[specta::specta]
pub fn set_task_stage(state: State<'_, AppState>, id: i64, stage: TaskStage) -> AppResult<Task> {
    state.changing("Move task", &[id], |db| mutation::set_stage(db, id, stage))
}

#[tauri::command]
#[specta::specta]
pub fn set_task_done(state: State<'_, AppState>, id: i64, done: bool) -> AppResult<Task> {
    let label = if done { "Complete task" } else { "Reopen task" };
    state.changing(label, &[id], |db| mutation::set_done(db, id, done))
}

#[tauri::command]
#[specta::specta]
pub fn delete_task(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    state.changing("Delete task", &[id], |db| mutation::delete(db, id))
}

/// A task's subtasks, open first. Ticking, editing and deleting one use the
/// ordinary task commands.
#[tauri::command]
#[specta::specta]
pub fn list_subtasks(state: State<'_, AppState>, parent_id: i64) -> AppResult<Vec<Task>> {
    query::subtasks(&state.db(), parent_id)
}

/// A new subtask at the bottom of a task's subtasks, with an optional
/// estimate typed like "45m".
#[tauri::command]
#[specta::specta]
pub fn add_subtask(
    state: State<'_, AppState>,
    parent_id: i64,
    title: String,
    estimate: Option<String>,
) -> AppResult<Task> {
    state.creating("Add subtask", |db| {
        mutation::add_subtask(db, parent_id, &title, &estimate)
    })
}

// ---------------------------------------------------------------------------
// Days (Todo Duo and the calendar)

#[tauri::command]
#[specta::specta]
pub fn list_day_tasks(state: State<'_, AppState>, date: String) -> AppResult<Vec<Task>> {
    query::list_day(&state.db(), &date)
}

/// A new task planned for `date` (the Todo Duo card, the calendar's day dialog).
#[tauri::command]
#[specta::specta]
pub fn create_day_task(state: State<'_, AppState>, title: String, date: String) -> AppResult<Task> {
    state.creating("Add task", |db| mutation::create_on_day(db, &title, &date))
}

#[tauri::command]
#[specta::specta]
pub fn get_day_completion(
    state: State<'_, AppState>,
    from: String,
    to: String,
) -> AppResult<Vec<DayCompletion>> {
    query::day_completion(&state.db(), &from, &to)
}

/// One task by id, for the details pane (wherever it was opened from).
#[tauri::command]
#[specta::specta]
pub fn get_task(state: State<'_, AppState>, id: i64) -> AppResult<Task> {
    query::get(&state.db(), id)
}

/// The item list: tasks filtered by status and project
/// (`project` None = any, 0 = outside projects).
#[tauri::command]
#[specta::specta]
pub fn list_items(
    state: State<'_, AppState>,
    status: ItemStatus,
    project: Option<i64>,
) -> AppResult<Vec<Task>> {
    items::list(&state.db(), status, project)
}

/// Undo the most recent task change; returns what was undone (e.g. "Delete task").
#[tauri::command]
#[specta::specta]
pub fn undo(state: State<'_, AppState>) -> AppResult<String> {
    let mut db = state.db();
    let label = state.undo_stack().undo(&mut db)?;
    Ok(label)
}

/// What `undo` would undo next, if anything.
#[tauri::command]
#[specta::specta]
pub fn peek_undo(state: State<'_, AppState>) -> Option<String> {
    state.undo_stack().peek()
}
