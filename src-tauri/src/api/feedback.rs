//! Help commands: open a prefilled bug report, open the log folder, check
//! for a newer release. No telemetry: the first two only open the user's
//! browser or file manager, and the update check is one anonymous request
//! for GitHub's public release list, made only when the user asks or has
//! turned on the startup check.

use std::path::PathBuf;

use tauri::{AppHandle, Manager};
use tauri_plugin_opener::OpenerExt;

use crate::domain::feedback;
use crate::domain::updates::UpdateCheck;
use crate::errors::{AppError, AppResult};
use crate::service::updates;

/// Is a newer EnvForIO published? Only tells; the user downloads it.
#[tauri::command]
#[specta::specta]
pub async fn check_for_updates(app: AppHandle) -> AppResult<UpdateCheck> {
    updates::check(&app.package_info().version.to_string()).await
}

fn log_dir(app: &AppHandle) -> AppResult<PathBuf> {
    app.path()
        .app_log_dir()
        .map_err(|e| AppError::invalid(format!("no log folder: {e}")))
}

/// Open a new GitHub issue on the bug-report form, with the app version,
/// the system and the log file's location filled in.
#[tauri::command]
#[specta::specta]
pub fn report_problem(app: AppHandle) -> AppResult<()> {
    let log_file = log_dir(&app)?.join(format!("{}.log", feedback::LOG_FILE_NAME));
    let local_app_data = std::env::var_os("LOCALAPPDATA").map(PathBuf::from);
    let home = app.path().home_dir().ok();
    let url = feedback::issue_url(
        &app.package_info().version.to_string(),
        &feedback::system_text(
            tauri_plugin_os::platform(),
            &tauri_plugin_os::version().to_string(),
            tauri_plugin_os::arch(),
        ),
        &feedback::shareable_path(&log_file, local_app_data.as_deref(), home.as_deref()),
    );
    app.opener()
        .open_url(url, None::<&str>)
        .map_err(|e| AppError::invalid(format!("cannot open the browser: {e}")))
}

/// Show the folder with EnvForIO's log file.
#[tauri::command]
#[specta::specta]
pub fn open_log_folder(app: AppHandle) -> AppResult<()> {
    let dir = log_dir(&app)?;
    std::fs::create_dir_all(&dir)
        .map_err(|e| AppError::invalid(format!("cannot create {}: {e}", dir.display())))?;
    app.opener()
        .open_path(dir.to_string_lossy(), None::<&str>)
        .map_err(|e| AppError::invalid(format!("cannot open the log folder: {e}")))
}
