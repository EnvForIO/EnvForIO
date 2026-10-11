//! `AppState`: what every command can reach through `tauri::State`.
//!
//! For now that is the database connection. SQLite connections are not
//! `Sync`, so it sits behind a mutex; EnvIO is single-user and its queries
//! are small, so one connection is enough.

use std::sync::{Mutex, MutexGuard};

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::db;
use crate::errors::{AppError, AppResult};

const DATABASE_FILE: &str = "envio.db";

pub struct AppState {
    db: Mutex<Connection>,
}

impl AppState {
    /// Open the database in the app data folder
    /// (`%APPDATA%\io.github.envforio` on Windows).
    pub fn open(app: &AppHandle) -> AppResult<Self> {
        let dir = app
            .path()
            .app_data_dir()
            .map_err(|e| AppError::invalid(format!("no app data folder: {e}")))?;
        std::fs::create_dir_all(&dir)
            .map_err(|e| AppError::invalid(format!("cannot create {}: {e}", dir.display())))?;
        let path = dir.join(DATABASE_FILE);
        log::info!("opening database at {}", path.display());
        Ok(Self {
            db: Mutex::new(db::open(&path)?),
        })
    }

    pub fn db(&self) -> MutexGuard<'_, Connection> {
        // A poisoned lock only means another command panicked mid-query; the connection is still usable.
        self.db
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }
}
