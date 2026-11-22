//! Window commands: switching between the main window and mini mode, and
//! what the tray menu window asks for.

use tauri::{AppHandle, Emitter, WebviewWindow};

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

/// Bring the main window back on My Day (the tray menu's today row).
#[tauri::command]
#[specta::specta]
pub fn open_my_day(app: AppHandle) {
    duo::leave_mini_mode(&app);
    let _ = app.emit_to("main", "open-my-day", ());
}

/// The tray menu page's height in logical px; the window fits it and stays
/// anchored at the cursor. Does nothing on Linux, which keeps a native menu.
#[tauri::command]
#[specta::specta]
pub fn fit_tray_menu(window: WebviewWindow, height: f64) {
    #[cfg(not(target_os = "linux"))]
    crate::desktop::tray_menu::fit(&window, height);
    #[cfg(target_os = "linux")]
    let _ = (window, height);
}

/// Quit EnvForIO (the tray menu's last row); closing the window only hides it.
#[tauri::command]
#[specta::specta]
pub fn quit_app(app: AppHandle) {
    app.exit(0);
}
