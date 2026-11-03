//! Calendar commands: scheduled tasks, day notes and per-day available time.

use tauri::State;

use crate::config::AppState;
use crate::entity::task::Task;
use crate::errors::AppResult;
use crate::service::days::{self, DayNote};
use crate::service::month::{self, DayMarks};
use crate::service::tasks::schedule;

#[tauri::command]
#[specta::specta]
pub fn list_calendar_tasks(
    state: State<'_, AppState>,
    from: String,
    to: String,
) -> AppResult<Vec<Task>> {
    schedule::in_range(&state.db(), &from, &to)
}

#[tauri::command]
#[specta::specta]
pub fn list_unscheduled_tasks(state: State<'_, AppState>) -> AppResult<Vec<Task>> {
    schedule::unscheduled(&state.db())
}

#[tauri::command]
#[specta::specta]
pub fn schedule_task(state: State<'_, AppState>, id: i64, date: Option<String>) -> AppResult<Task> {
    state.changing("Schedule task", &[id], |db| {
        schedule::schedule(db, id, date)
    })
}

#[tauri::command]
#[specta::specta]
pub fn create_scheduled_task(
    state: State<'_, AppState>,
    title: String,
    date: String,
) -> AppResult<Task> {
    state.creating("Add task", |db| schedule::create_on(db, &title, &date))
}

#[tauri::command]
#[specta::specta]
pub fn list_day_notes(
    state: State<'_, AppState>,
    from: String,
    to: String,
) -> AppResult<Vec<DayNote>> {
    days::notes(&state.db(), &from, &to)
}

#[tauri::command]
#[specta::specta]
pub fn set_day_note(state: State<'_, AppState>, date: String, text: String) -> AppResult<()> {
    days::set_note(&state.db(), &date, &text)
}

/// Each day's marks for the desktop calendar widget, `from` to `to` inclusive.
#[tauri::command]
#[specta::specta]
pub fn month_marks(
    state: State<'_, AppState>,
    from: String,
    to: String,
) -> AppResult<Vec<DayMarks>> {
    month::marks(&state.db(), &from, &to)
}
