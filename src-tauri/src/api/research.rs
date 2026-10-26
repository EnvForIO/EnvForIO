//! The research overview page; the work is in `service::research`.
//! The JSON export of ideas and papers lives with the other exports.

use tauri::State;

use crate::config::AppState;
use crate::domain::day::today;
use crate::errors::AppResult;
use crate::service::research::overview::{self, ResearchOverview};

#[tauri::command]
#[specta::specta]
pub fn get_research_overview(state: State<'_, AppState>) -> AppResult<ResearchOverview> {
    overview::overview(&state.db(), &today())
}
