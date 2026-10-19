//! Task commands the frontend can call. Each one takes the lock, works out
//! "today", and hands over to `service::tasks`; no logic lives here.

use tauri::State;

use crate::config::AppState;
use crate::domain::day::today;
use crate::entity::task::{Task, TaskStep};
use crate::errors::AppResult;
use crate::service::tasks::items::{self, ItemStatus};
use crate::service::tasks::mutation::{self, TaskUpdate};
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
    mutation::create(&state.db(), &title, view, &today())
}

#[tauri::command]
#[specta::specta]
pub fn update_task(state: State<'_, AppState>, id: i64, update: TaskUpdate) -> AppResult<Task> {
    mutation::update(&state.db(), id, &update, &today())
}

#[tauri::command]
#[specta::specta]
pub fn set_task_done(state: State<'_, AppState>, id: i64, done: bool) -> AppResult<Task> {
    mutation::set_done(&state.db(), id, done)
}

#[tauri::command]
#[specta::specta]
pub fn delete_task(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    mutation::delete(&state.db(), id)
}

#[tauri::command]
#[specta::specta]
pub fn list_task_steps(state: State<'_, AppState>, task_id: i64) -> AppResult<Vec<TaskStep>> {
    query::steps(&state.db(), task_id)
}

#[tauri::command]
#[specta::specta]
pub fn add_task_step(
    state: State<'_, AppState>,
    task_id: i64,
    title: String,
) -> AppResult<TaskStep> {
    mutation::add_step(&state.db(), task_id, &title)
}

#[tauri::command]
#[specta::specta]
pub fn set_task_step_done(state: State<'_, AppState>, id: i64, done: bool) -> AppResult<TaskStep> {
    mutation::set_step_done(&state.db(), id, done)
}

#[tauri::command]
#[specta::specta]
pub fn delete_task_step(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    mutation::delete_step(&state.db(), id)
}

// ---------------------------------------------------------------------------
// Days (Todo Duo)

#[tauri::command]
#[specta::specta]
pub fn list_day_tasks(state: State<'_, AppState>, date: String) -> AppResult<Vec<Task>> {
    query::list_day(&state.db(), &date)
}

#[tauri::command]
#[specta::specta]
pub fn create_day_task(state: State<'_, AppState>, title: String, date: String) -> AppResult<Task> {
    mutation::create_on_day(&state.db(), &title, &date, &today())
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
