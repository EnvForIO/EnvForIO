//! Window commands: switching between the main window and mini mode.

use tauri::AppHandle;

use crate::desktop::duo;

/// Shrink the main window into the Todo Duo sticky (the minimize button).
#[tauri::command]
#[specta::specta]
pub fn enter_mini_mode(app: AppHandle) {
    duo::enter_mini_mode(&app);
}

/// Bring the main window back from the sticky.
#[tauri::command]
#[specta::specta]
pub fn leave_mini_mode(app: AppHandle) {
    duo::leave_mini_mode(&app);
}
