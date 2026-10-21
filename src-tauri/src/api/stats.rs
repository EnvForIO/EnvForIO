//! Statistics commands.

use tauri::State;

use crate::config::AppState;
use crate::domain::day::today;
use crate::errors::AppResult;
use crate::service::stats::{self, range::Period, Stats};

/// Stats for the week, month or year `offset` periods from the current one (0 = current).
#[tauri::command]
#[specta::specta]
pub fn get_stats(state: State<'_, AppState>, period: Period, offset: i32) -> AppResult<Stats> {
    stats::stats(&state.db(), period, &today(), offset)
}
