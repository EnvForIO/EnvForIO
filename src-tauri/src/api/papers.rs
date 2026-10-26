//! Paper library commands (Seedbank); the work is in `service::papers`.
//!
//! The async commands never hold the database lock across a network call.

use std::path::{Path, PathBuf};

use tauri::{AppHandle, Manager, State};
use tauri_plugin_opener::OpenerExt;

use crate::config::AppState;
use crate::domain::paper_ref::{parse_ref, PaperMeta};
use crate::entity::paper::{IdeaPaper, Paper, PaperIdea, PaperRelation};
use crate::errors::{AppError, AppResult};
use crate::service::papers::mutation::{self, PaperUpdate};
use crate::service::papers::query::{self, PaperCounts, PaperFilter};
use crate::service::papers::{fetch, pdf};

fn pdf_dir(app: &AppHandle) -> AppResult<PathBuf> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| AppError::invalid(format!("no app data folder: {e}")))?;
    Ok(dir.join("papers"))
}

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
pub fn delete_paper(app: AppHandle, state: State<'_, AppState>, id: i64) -> AppResult<()> {
    mutation::delete(&state.db(), id)?;
    pdf::remove(&pdf_dir(&app)?, id);
    Ok(())
}

#[tauri::command]
#[specta::specta]
pub fn paper_bibtex(state: State<'_, AppState>, id: i64) -> AppResult<String> {
    query::bibtex(&state.db(), id)
}

/// Download the open-access PDF the lookup found (arXiv, or a Crossref link).
#[tauri::command]
#[specta::specta]
pub async fn download_paper_pdf(
    app: AppHandle,
    state: State<'_, AppState>,
    id: i64,
) -> AppResult<Paper> {
    let paper = query::get(&state.db(), id)?;
    let url = paper.pdf_url.ok_or_else(|| {
        AppError::invalid("no open-access PDF is known for this paper; import a local file")
    })?;
    let bytes = fetch::download_pdf(&url).await?;
    pdf::save(&pdf_dir(&app)?, id, &bytes)?;
    let db = state.db();
    mutation::set_has_pdf(&db, id, true)?;
    query::get(&db, id)
}

#[tauri::command]
#[specta::specta]
pub fn import_paper_pdf(
    app: AppHandle,
    state: State<'_, AppState>,
    id: i64,
    path: String,
) -> AppResult<Paper> {
    let db = state.db();
    query::get(&db, id)?;
    pdf::import(&pdf_dir(&app)?, id, Path::new(&path))?;
    mutation::set_has_pdf(&db, id, true)?;
    query::get(&db, id)
}

/// Open the library copy in the default PDF reader.
#[tauri::command]
#[specta::specta]
pub fn open_paper_pdf(app: AppHandle, id: i64) -> AppResult<()> {
    let path = pdf::path(&pdf_dir(&app)?, id);
    if !path.exists() {
        return Err(AppError::invalid("this paper has no PDF yet"));
    }
    app.opener()
        .open_path(path.to_string_lossy(), None::<&str>)
        .map_err(|e| AppError::invalid(format!("cannot open the PDF: {e}")))
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
