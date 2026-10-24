//! Idea commands (Seedbank); the work is in `service::ideas`.

use tauri::State;

use crate::config::AppState;
use crate::domain::day::today;
use crate::entity::idea::{Idea, IdeaLink, IdeaStep, Tag};
use crate::errors::AppResult;
use crate::service::ideas::mutation::{self, IdeaUpdate};
use crate::service::ideas::notes::{self, IdeaLog, IdeaProblem, IdeaTodo};
use crate::service::ideas::parts;
use crate::service::ideas::query::{self, IdeaCounts, IdeaFilter};

#[tauri::command]
#[specta::specta]
pub fn list_ideas(state: State<'_, AppState>, filter: IdeaFilter) -> AppResult<Vec<Idea>> {
    query::list(&state.db(), &filter)
}

#[tauri::command]
#[specta::specta]
pub fn get_idea(state: State<'_, AppState>, id: i64) -> AppResult<Idea> {
    query::get(&state.db(), id)
}

#[tauri::command]
#[specta::specta]
pub fn get_idea_counts(state: State<'_, AppState>) -> AppResult<IdeaCounts> {
    query::counts(&state.db())
}

#[tauri::command]
#[specta::specta]
pub fn create_idea(state: State<'_, AppState>, title: String) -> AppResult<Idea> {
    mutation::create(&mut state.db(), &title)
}

#[tauri::command]
#[specta::specta]
pub fn update_idea(state: State<'_, AppState>, id: i64, update: IdeaUpdate) -> AppResult<Idea> {
    mutation::update(&mut state.db(), id, &update)
}

#[tauri::command]
#[specta::specta]
pub fn delete_idea(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    mutation::delete(&state.db(), id)
}

#[tauri::command]
#[specta::specta]
pub fn list_tags(state: State<'_, AppState>) -> AppResult<Vec<Tag>> {
    query::tags(&state.db())
}

#[tauri::command]
#[specta::specta]
pub fn create_tag(state: State<'_, AppState>, name: String, color: String) -> AppResult<Tag> {
    mutation::create_tag(&state.db(), &name, &color)
}

#[tauri::command]
#[specta::specta]
pub fn delete_tag(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    mutation::delete_tag(&state.db(), id)
}

#[tauri::command]
#[specta::specta]
pub fn list_idea_steps(state: State<'_, AppState>, idea_id: i64) -> AppResult<Vec<IdeaStep>> {
    query::steps(&state.db(), idea_id)
}

#[tauri::command]
#[specta::specta]
pub fn add_idea_step(
    state: State<'_, AppState>,
    idea_id: i64,
    title: String,
) -> AppResult<Vec<IdeaStep>> {
    parts::add_step(&state.db(), idea_id, &title)
}

#[tauri::command]
#[specta::specta]
pub fn set_idea_step_done(
    state: State<'_, AppState>,
    id: i64,
    done: bool,
) -> AppResult<Vec<IdeaStep>> {
    parts::set_step_done(&state.db(), id, done, &today())
}

#[tauri::command]
#[specta::specta]
pub fn delete_idea_step(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    parts::delete_step(&state.db(), id)
}

#[tauri::command]
#[specta::specta]
pub fn list_idea_links(state: State<'_, AppState>, idea_id: i64) -> AppResult<Vec<IdeaLink>> {
    query::links(&state.db(), idea_id)
}

#[tauri::command]
#[specta::specta]
pub fn add_idea_link(
    state: State<'_, AppState>,
    idea_id: i64,
    label: String,
    url: String,
) -> AppResult<IdeaLink> {
    parts::add_link(&state.db(), idea_id, &label, &url)
}

#[tauri::command]
#[specta::specta]
pub fn delete_idea_link(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    parts::delete_link(&state.db(), id)
}

// ---------------------------------------------------------------------------
// Notes, todos, problems and the log inside an idea

#[tauri::command]
#[specta::specta]
pub fn get_idea_notes(state: State<'_, AppState>, idea_id: i64) -> AppResult<String> {
    notes::notes(&state.db(), idea_id)
}

#[tauri::command]
#[specta::specta]
pub fn set_idea_notes(state: State<'_, AppState>, idea_id: i64, notes: String) -> AppResult<()> {
    notes::set_notes(&state.db(), idea_id, &notes)
}

#[tauri::command]
#[specta::specta]
pub fn list_idea_todos(state: State<'_, AppState>, idea_id: i64) -> AppResult<Vec<IdeaTodo>> {
    notes::todos(&state.db(), idea_id)
}

#[tauri::command]
#[specta::specta]
pub fn add_idea_todo(
    state: State<'_, AppState>,
    idea_id: i64,
    title: String,
    due_date: Option<String>,
) -> AppResult<()> {
    notes::add_todo(&state.db(), idea_id, &title, due_date)
}

#[tauri::command]
#[specta::specta]
pub fn set_idea_todo_done(state: State<'_, AppState>, id: i64, done: bool) -> AppResult<()> {
    notes::set_todo_done(&state.db(), id, done)
}

#[tauri::command]
#[specta::specta]
pub fn delete_idea_todo(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    notes::delete_todo(&state.db(), id)
}

#[tauri::command]
#[specta::specta]
pub fn list_idea_problems(state: State<'_, AppState>, idea_id: i64) -> AppResult<Vec<IdeaProblem>> {
    notes::problems(&state.db(), idea_id)
}

#[tauri::command]
#[specta::specta]
pub fn add_idea_problem(
    state: State<'_, AppState>,
    idea_id: i64,
    problem: String,
) -> AppResult<()> {
    notes::add_problem(&state.db(), idea_id, &problem)
}

#[tauri::command]
#[specta::specta]
pub fn update_idea_problem(
    state: State<'_, AppState>,
    id: i64,
    solution: String,
    solved: bool,
) -> AppResult<()> {
    notes::update_problem(&state.db(), id, &solution, solved)
}

#[tauri::command]
#[specta::specta]
pub fn delete_idea_problem(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    notes::delete_problem(&state.db(), id)
}

#[tauri::command]
#[specta::specta]
pub fn list_idea_logs(state: State<'_, AppState>, idea_id: i64) -> AppResult<Vec<IdeaLog>> {
    notes::logs(&state.db(), idea_id)
}

#[tauri::command]
#[specta::specta]
pub fn add_idea_log(state: State<'_, AppState>, idea_id: i64, text: String) -> AppResult<()> {
    notes::add_log(&state.db(), idea_id, &text, &today())
}

#[tauri::command]
#[specta::specta]
pub fn delete_idea_log(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    notes::delete_log(&state.db(), id)
}
