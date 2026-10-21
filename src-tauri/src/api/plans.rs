//! Planning commands: the safety line, check-ins, forecast, project health,
//! available time and planning settings.

use tauri::State;

use crate::config::AppState;
use crate::domain::day::today;
use crate::errors::AppResult;
use crate::service::capacity::{self, DayOverride, WeekCapacity};
use crate::service::plans::forecast::{self, ForecastDay, ProjectHealth};
use crate::service::plans::history::{self, CheckIns};
use crate::service::plans::today::{self as line, TodayLine};
use crate::service::settings::{self, PlanningSettings};

#[tauri::command]
#[specta::specta]
pub fn get_today_line(state: State<'_, AppState>) -> AppResult<TodayLine> {
    line::today_line(&state.db(), &today())
}

/// The last 14 days' results, the streak, and yesterday's shortfall.
#[tauri::command]
#[specta::specta]
pub fn get_check_ins(state: State<'_, AppState>) -> AppResult<CheckIns> {
    history::check_ins(&state.db(), &today(), 14)
}

/// Planned project work for each of the next 14 days.
#[tauri::command]
#[specta::specta]
pub fn get_load_forecast(state: State<'_, AppState>) -> AppResult<Vec<ForecastDay>> {
    forecast::load_forecast(&state.db(), &today(), 14)
}

#[tauri::command]
#[specta::specta]
pub fn get_project_health(state: State<'_, AppState>) -> AppResult<Vec<ProjectHealth>> {
    forecast::project_health(&state.db(), &today())
}

#[tauri::command]
#[specta::specta]
pub fn get_planning_settings(state: State<'_, AppState>) -> AppResult<PlanningSettings> {
    settings::load(&state.db())
}

#[tauri::command]
#[specta::specta]
pub fn save_planning_settings(
    state: State<'_, AppState>,
    settings: PlanningSettings,
) -> AppResult<PlanningSettings> {
    settings::save(&state.db(), &settings)
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
