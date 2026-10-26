//! Export commands. The UI asks for a file name with the system save dialog
//! and passes the chosen path here; Rust writes the file.

use std::path::PathBuf;

use tauri::State;

use crate::config::AppState;
use crate::domain::day::now_timestamp;
use crate::errors::{AppError, AppResult};
use crate::service::export::{self, format, Export, ExportScope};
use crate::service::research::archive as research;

fn write(path: &str, bytes: &[u8]) -> AppResult<()> {
    std::fs::write(PathBuf::from(path), bytes)
        .map_err(|e| AppError::invalid(format!("could not write {path}: {e}")))
}

/// The rows of an export, for the on-screen preview (PDF and image are made from it).
#[tauri::command]
#[specta::specta]
pub fn get_export(state: State<'_, AppState>, scope: ExportScope) -> AppResult<Export> {
    export::export(&state.db(), &scope)
}

#[tauri::command]
#[specta::specta]
pub fn export_csv(state: State<'_, AppState>, scope: ExportScope, path: String) -> AppResult<()> {
    let rows = export::export(&state.db(), &scope)?.rows;
    write(&path, format::csv(&rows).as_bytes())
}

#[tauri::command]
#[specta::specta]
pub fn export_ics(state: State<'_, AppState>, scope: ExportScope, path: String) -> AppResult<()> {
    let rows = export::export(&state.db(), &scope)?.rows;
    let stamp = chrono::Utc::now().format("%Y%m%dT%H%M%SZ").to_string();
    write(&path, format::ics(&rows, &stamp).as_bytes())
}

/// Every idea and paper as one JSON file.
#[tauri::command]
#[specta::specta]
pub fn export_research_json(state: State<'_, AppState>, path: String) -> AppResult<()> {
    let archive = research::archive(&state.db(), &now_timestamp())?;
    write(&path, research::to_json(&archive)?.as_bytes())
}

/// Save bytes the UI produced (a PNG of the preview or the share card).
#[tauri::command]
#[specta::specta]
pub fn save_image(path: String, bytes: Vec<u8>) -> AppResult<()> {
    write(&path, &bytes)
}
