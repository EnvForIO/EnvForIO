//! Project commands the frontend can call; the work is in `service::projects`.

use tauri::State;

use crate::config::AppState;
use crate::entity::project::{Module, Project};
use crate::entity::task::Task;
use crate::errors::AppResult;
use crate::service::projects::mutation::{self, ProjectInput};
use crate::service::projects::query;
use crate::service::projects::templates::{ProjectTemplate, TEMPLATES};

#[tauri::command]
#[specta::specta]
pub fn list_project_templates() -> Vec<ProjectTemplate> {
    TEMPLATES.to_vec()
}

#[tauri::command]
#[specta::specta]
pub fn list_projects(state: State<'_, AppState>) -> AppResult<Vec<Project>> {
    query::list(&state.db())
}

#[tauri::command]
#[specta::specta]
pub fn create_project(
    state: State<'_, AppState>,
    input: ProjectInput,
    template: String,
) -> AppResult<Project> {
    mutation::create(&mut state.db(), &input, &template)
}

#[tauri::command]
#[specta::specta]
pub fn update_project(
    state: State<'_, AppState>,
    id: i64,
    input: ProjectInput,
) -> AppResult<Project> {
    mutation::update(&state.db(), id, &input)
}

#[tauri::command]
#[specta::specta]
pub fn delete_project(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    mutation::delete(&mut state.db(), id)
}

#[tauri::command]
#[specta::specta]
pub fn list_modules(state: State<'_, AppState>, project_id: i64) -> AppResult<Vec<Module>> {
    query::modules(&state.db(), project_id)
}

#[tauri::command]
#[specta::specta]
pub fn add_module(state: State<'_, AppState>, project_id: i64, name: String) -> AppResult<Module> {
    mutation::add_module(&state.db(), project_id, &name)
}

#[tauri::command]
#[specta::specta]
pub fn rename_module(state: State<'_, AppState>, id: i64, name: String) -> AppResult<Module> {
    mutation::rename_module(&state.db(), id, &name)
}

#[tauri::command]
#[specta::specta]
pub fn delete_module(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    mutation::delete_module(&state.db(), id)
}

#[tauri::command]
#[specta::specta]
pub fn list_project_tasks(state: State<'_, AppState>, project_id: i64) -> AppResult<Vec<Task>> {
    query::tasks(&state.db(), project_id)
}

#[tauri::command]
#[specta::specta]
pub fn add_project_task(
    state: State<'_, AppState>,
    project_id: i64,
    module_id: Option<i64>,
    title: String,
    estimate: Option<String>,
) -> AppResult<Task> {
    mutation::add_task(&state.db(), project_id, module_id, &title, &estimate)
}
