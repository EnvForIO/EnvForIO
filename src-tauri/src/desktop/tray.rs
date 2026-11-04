//! The tray icon. EnvIO keeps running in the tray when its window is closed,
//! so a left click (or "Show EnvIO") brings the window back and "Quit" exits.
//! "Mini mode" shrinks the window into the Todo Duo sticky.
//!
//! NOTE: the menu labels are plain English constants, not i18n strings;
//! the tray is built in Rust before the frontend's translations exist.

use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::AppHandle;

use super::duo::{enter_mini_mode, leave_mini_mode};

/// Passed by the OS when EnvIO starts at login, so it starts hidden in the tray.
pub const AUTOSTART_ARG: &str = "--autostart";

const SHOW_ID: &str = "show";
const MINI_ID: &str = "mini";
const QUIT_ID: &str = "quit";

pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let show = MenuItem::with_id(app, SHOW_ID, "Show EnvIO", true, None::<&str>)?;
    let mini = MenuItem::with_id(app, MINI_ID, "Mini mode", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, QUIT_ID, "Quit EnvIO", true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show, &mini, &quit])?;

    let mut tray = TrayIconBuilder::with_id("main")
        .tooltip("EnvIO")
        .menu(&menu)
        .show_menu_on_left_click(false) // left click shows the window; right click opens the menu
        .on_menu_event(|app, event| match event.id.as_ref() {
            SHOW_ID => leave_mini_mode(app),
            MINI_ID => enter_mini_mode(app),
            QUIT_ID => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                leave_mini_mode(tray.app_handle());
            }
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }
    tray.build(app)?;
    Ok(())
}
