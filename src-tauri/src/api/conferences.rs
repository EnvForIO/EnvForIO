//! Conference deadline commands; the work is in `service::conferences`.
//! The download never holds the database lock across the network call.

use chrono::{Datelike, Local};
use tauri::State;

use crate::config::AppState;
use crate::domain::conference::parse_all;
use crate::domain::day::{now_timestamp, today};
use crate::entity::conference::ConferenceList;
use crate::entity::project::Project;
use crate::errors::{AppError, AppResult};
use crate::service::conferences::{self, fetch};

/// Editions from last year on: this year's may still be open.
fn since_year() -> i32 {
    Local::now().year() - 1
}

#[tauri::command]
#[specta::specta]
pub fn list_conferences(state: State<'_, AppState>) -> AppResult<ConferenceList> {
    conferences::list(&state.db(), since_year())
}

/// Downloads ccfddl's list again and returns it.
#[tauri::command]
#[specta::specta]
pub async fn refresh_conferences(state: State<'_, AppState>) -> AppResult<ConferenceList> {
    let yaml = fetch::download().await?;
    let list = parse_all(&yaml).map_err(AppError::invalid)?;
    if list.is_empty() {
        return Err(AppError::invalid("ccfddl's list came back empty"));
    }
    let mut db = state.db();
    conferences::replace_all(&mut db, &list, &now_timestamp())?;
    conferences::list(&db, since_year())
}

#[tauri::command]
#[specta::specta]
pub fn follow_conference(state: State<'_, AppState>, key: String, on: bool) -> AppResult<()> {
    conferences::set_followed(&state.db(), &key, on)
}

/// Plans a submission to one round of an edition (see `conferences::plan`).
#[tauri::command]
#[specta::specta]
pub fn plan_conference(
    state: State<'_, AppState>,
    key: String,
    edition_id: String,
    stage: u32,
) -> AppResult<Project> {
    conferences::plan(&mut state.db(), &key, &edition_id, stage as usize, &today())
}
