//! Conference deadline commands; the work is in `service::conferences`.
//! The download never holds the database lock across the network call.

use chrono::{Datelike, Local};
use tauri::State;

use crate::config::AppState;
use crate::domain::conference::parse_all;
use crate::domain::day::{now_timestamp, today};
use crate::entity::conference::{ConferenceList, ProjectRound, RoundRef};
use crate::entity::project::Project;
use crate::errors::{AppError, AppResult};
use crate::service::conferences::{self, fetch};
use crate::service::projects::mutation::{PhaseInput, ProjectInput};

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

/// A conference paper project for one round (see `conferences::create_project`).
#[tauri::command]
#[specta::specta]
pub fn create_conference_project(
    state: State<'_, AppState>,
    input: ProjectInput,
    phases: Vec<PhaseInput>,
    round: RoundRef,
    idea_id: Option<i64>,
) -> AppResult<Project> {
    conferences::create_project(&mut state.db(), &input, &phases, &round, &today(), idea_id)
}

/// The conference round a project was made for, if any.
#[tauri::command]
#[specta::specta]
pub fn get_project_round(
    state: State<'_, AppState>,
    project_id: i64,
) -> AppResult<Option<ProjectRound>> {
    conferences::project_round(&state.db(), project_id)
}
