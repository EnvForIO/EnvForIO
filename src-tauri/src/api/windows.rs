//! Window commands: switching between the main window and mini mode.

use tauri::AppHandle;

use crate::desktop::duo;

/// Keep the Todo Duo sticky on top of other windows, or not.
#[tauri::command]
#[specta::specta]
pub fn set_mini_pinned(app: AppHandle, pinned: bool) {
    duo::set_pinned(&app, pinned);
}

/// Shrink the main window into the Todo Duo sticky (the title bar's float button).
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

/// Close the sticky to the tray (the capsule's close button).
#[tauri::command]
#[specta::specta]
pub fn close_mini_mode(app: AppHandle) {
    duo::hide_both(&app);
}

/// Open the main window's calendar at a day (double-click in the Duo card's month).
#[tauri::command]
#[specta::specta]
pub fn open_calendar_day(app: AppHandle, date: String) {
    duo::open_calendar_day(&app, &date);
}
