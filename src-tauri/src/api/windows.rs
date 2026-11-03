//! Window commands: switching between the main window and mini mode, and
//! the desktop calendar widget.

use tauri::AppHandle;

use crate::desktop::{duo, month_widget};

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

/// Hide the desktop calendar widget (its close button); the tray brings it back.
#[tauri::command]
#[specta::specta]
pub fn hide_month_widget(app: AppHandle) {
    month_widget::hide(&app);
}

/// Open the main window's calendar at a day (double-click in the widget).
#[tauri::command]
#[specta::specta]
pub fn open_calendar_day(app: AppHandle, date: String) {
    month_widget::open_day(&app, &date);
}
