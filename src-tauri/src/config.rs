//! `AppState`: what every command can reach through `tauri::State`.
//!
//! The database connection and the undo stack. SQLite connections are not
//! `Sync`, so it sits behind a mutex; EnvForIO is single-user and its queries
//! are small, so one connection is enough. Lock order: database, then undo.

use std::sync::{Mutex, MutexGuard};

use rusqlite::Connection;
use tauri::{AppHandle, Manager};

use crate::db;
use crate::entity::task::Task;
use crate::errors::{AppError, AppResult};
use crate::service::settings;
use crate::service::undo::UndoStack;

// Kept from before the rename to EnvForIO (2026-11-21), so existing data opens.
const DATABASE_FILE: &str = "envio.db";

pub struct AppState {
    db: Mutex<Connection>,
    undo: Mutex<UndoStack>,
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
        // Without the user's folder: the log may be attached to a public bug report.
        let home = app.path().home_dir().ok();
        log::info!(
            "opening database at {}",
            crate::domain::feedback::shareable_path(&path, None, home.as_deref())
        );
        let conn = db::open(&path)?;
        // The saved day start decides what "today" is, so apply it before any command runs.
        settings::apply(&conn)?;
        Ok(Self {
            db: Mutex::new(conn),
            undo: Mutex::new(UndoStack::default()),
        })
    }

    pub fn db(&self) -> MutexGuard<'_, Connection> {
        // A poisoned lock only means another command panicked mid-query; the connection is still usable.
        self.db
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    pub fn undo_stack(&self) -> MutexGuard<'_, UndoStack> {
        self.undo
            .lock()
            .unwrap_or_else(|poisoned| poisoned.into_inner())
    }

    /// Change existing tasks so the change can be undone: snapshot `ids` first.
    pub fn changing<T>(
        &self,
        label: &str,
        ids: &[i64],
        change: impl FnOnce(&mut Connection) -> AppResult<T>,
    ) -> AppResult<T> {
        let mut db = self.db();
        self.undo_stack().record(&db, label, ids)?;
        let result = change(&mut db);
        if result.is_err() {
            self.undo_stack().discard_last(); // nothing changed
        }
        result
    }

    /// Create a task so the creation can be undone (undo deletes it).
    pub fn creating(
        &self,
        label: &str,
        create: impl FnOnce(&Connection) -> AppResult<Task>,
    ) -> AppResult<Task> {
        let db = self.db();
        let task = create(&db)?;
        self.undo_stack().record_created(label, task.id);
        Ok(task)
    }
}
