//! Planning commands: today's safety line and the available-time settings.

use tauri::State;

use crate::config::AppState;
use crate::domain::day::today;
use crate::errors::AppResult;
use crate::service::capacity::{self, DayOverride, WeekCapacity};
use crate::service::plans::{self, TodayLine};

#[tauri::command]
#[specta::specta]
pub fn get_today_line(state: State<'_, AppState>) -> AppResult<TodayLine> {
    plans::today_line(&state.db(), &today())
}

#[tauri::command]
#[specta::specta]
pub fn get_week_capacity(state: State<'_, AppState>) -> AppResult<WeekCapacity> {
    capacity::week(&state.db())
}

/// `weekday` 0 = Monday; `minutes` None = no limit, 0 = rest day.
#[tauri::command]
#[specta::specta]
pub fn set_weekday_capacity(
    state: State<'_, AppState>,
    weekday: u8,
    minutes: Option<i64>,
) -> AppResult<WeekCapacity> {
    capacity::set_weekday(&state.db(), weekday, minutes)
}

#[tauri::command]
#[specta::specta]
pub fn list_day_overrides(
    state: State<'_, AppState>,
    from: String,
    to: String,
) -> AppResult<Vec<DayOverride>> {
    capacity::overrides(&state.db(), &from, &to)
}

#[tauri::command]
#[specta::specta]
pub fn set_day_override(
    state: State<'_, AppState>,
    date: String,
    minutes: Option<i64>,
) -> AppResult<()> {
    capacity::set_override(&state.db(), &date, minutes)
}
