//! Timer and partial-completion commands.

use tauri::State;

use crate::config::AppState;
use crate::domain::day::today;
use crate::entity::task::Task;
use crate::errors::AppResult;
use crate::service::tasks::partial;
use crate::service::timer::{self, RunningTimer};

#[tauri::command]
#[specta::specta]
pub fn get_running_timer(state: State<'_, AppState>) -> AppResult<Option<RunningTimer>> {
    timer::running(&state.db())
}

/// Start timing a task; a timer already running on another task stops first.
#[tauri::command]
#[specta::specta]
pub fn start_timer(state: State<'_, AppState>, task_id: i64) -> AppResult<RunningTimer> {
    timer::start(&state.db(), task_id)
}

/// Stop the running timer; returns the minutes added to its task.
#[tauri::command]
#[specta::specta]
pub fn stop_timer(state: State<'_, AppState>) -> AppResult<i64> {
    timer::stop(&state.db())
}

/// Finish part of a task (`done` is typed, e.g. "45m"); returns the new task with the rest.
#[tauri::command]
#[specta::specta]
pub fn complete_task_partially(
    state: State<'_, AppState>,
    id: i64,
    done: String,
) -> AppResult<Task> {
    partial::complete_partially(&state.db(), id, &done, &today())
}
