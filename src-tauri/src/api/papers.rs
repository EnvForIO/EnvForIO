//! Paper library commands (Seedbank); the work is in `service::papers`.
//!
//! The async commands never hold the database lock across a network call.

use tauri::State;

use crate::config::AppState;
use crate::domain::paper_ref::{parse_ref, PaperMeta};
use crate::entity::paper::{IdeaPaper, Paper, PaperIdea, PaperRelation};
use crate::errors::AppResult;
use crate::service::papers::fetch;
use crate::service::papers::mutation::{self, PaperUpdate};
use crate::service::papers::query::{self, PaperCounts, PaperFilter};

#[tauri::command]
#[specta::specta]
pub fn list_papers(state: State<'_, AppState>, filter: PaperFilter) -> AppResult<Vec<Paper>> {
    query::list(&state.db(), &filter)
}

#[tauri::command]
#[specta::specta]
pub fn get_paper(state: State<'_, AppState>, id: i64) -> AppResult<Paper> {
    query::get(&state.db(), id)
}

#[tauri::command]
#[specta::specta]
pub fn get_paper_counts(state: State<'_, AppState>) -> AppResult<PaperCounts> {
    query::counts(&state.db())
}

/// Add from a DOI, an arXiv id or link (looked up online), or a plain title.
#[tauri::command]
#[specta::specta]
pub async fn add_paper(state: State<'_, AppState>, input: String) -> AppResult<Paper> {
    let input = input.trim().to_string();
    let Some(paper) = parse_ref(&input) else {
        let meta = PaperMeta {
            title: input,
            ..PaperMeta::default()
        };
        return mutation::insert(&state.db(), &meta);
    };
    let known = query::find(&state.db(), &paper)?;
    if let Some(found) = known {
        return Ok(found);
    }
    let meta = fetch::lookup(&paper).await?;
    mutation::insert(&state.db(), &meta)
}

#[tauri::command]
#[specta::specta]
pub fn update_paper(state: State<'_, AppState>, id: i64, update: PaperUpdate) -> AppResult<Paper> {
    mutation::update(&state.db(), id, &update)
}

#[tauri::command]
#[specta::specta]
pub fn delete_paper(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    mutation::delete(&state.db(), id)
}

#[tauri::command]
#[specta::specta]
pub fn paper_bibtex(state: State<'_, AppState>, id: i64) -> AppResult<String> {
    query::bibtex(&state.db(), id)
}

#[tauri::command]
#[specta::specta]
pub fn list_idea_papers(state: State<'_, AppState>, idea_id: i64) -> AppResult<Vec<IdeaPaper>> {
    query::idea_papers(&state.db(), idea_id)
}

#[tauri::command]
#[specta::specta]
pub fn list_paper_ideas(state: State<'_, AppState>, paper_id: i64) -> AppResult<Vec<PaperIdea>> {
    query::paper_ideas(&state.db(), paper_id)
}

#[tauri::command]
#[specta::specta]
pub fn link_paper(
    state: State<'_, AppState>,
    idea_id: i64,
    paper_id: i64,
    relation: PaperRelation,
    note: String,
) -> AppResult<()> {
    mutation::link(&state.db(), idea_id, paper_id, relation, &note)
}

#[tauri::command]
#[specta::specta]
pub fn unlink_paper(state: State<'_, AppState>, idea_id: i64, paper_id: i64) -> AppResult<()> {
    mutation::unlink(&state.db(), idea_id, paper_id)
}
