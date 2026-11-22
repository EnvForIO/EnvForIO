//! The tray icon. EnvForIO keeps running in the tray when its window is closed,
//! so a left click brings the window back. A right click opens the tray menu
//! (`tray_menu.rs`): the running timer, My Day, quick add, the window, mini
//! mode and Quit.
//!
//! NOTE: Linux keeps a native menu, as its tray sends no click events. Its
//! labels are plain English constants: it is built before translations load.

use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::AppHandle;

use super::duo::leave_mini_mode;
#[cfg(not(target_os = "linux"))]
use super::tray_menu;

/// Passed by the OS when EnvForIO starts at login, so it starts hidden in the tray.
pub const AUTOSTART_ARG: &str = "--autostart";

pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let mut tray = TrayIconBuilder::with_id("main")
        .tooltip("EnvForIO")
        .on_tray_icon_event(|tray, event| {
            let TrayIconEvent::Click {
                button,
                button_state: MouseButtonState::Up,
                position,
                ..
            } = event
            else {
                return;
            };
            match button {
                MouseButton::Left => leave_mini_mode(tray.app_handle()),
                #[cfg(not(target_os = "linux"))]
                MouseButton::Right => tray_menu::open(tray.app_handle(), position),
                _ => {}
            }
            #[cfg(target_os = "linux")]
            let _ = position; // only the menu window reads it
        });
    if let Some(icon) = app.default_window_icon() {
        tray = tray.icon(icon.clone());
    }

    #[cfg(target_os = "linux")]
    {
        tray = tray
            .menu(&native_menu(app)?)
            .on_menu_event(|app, event| match event.id.as_ref() {
                "show" => leave_mini_mode(app),
                "mini" => super::duo::enter_mini_mode(app),
                "quit" => app.exit(0),
                _ => {}
            });
    }
    #[cfg(not(target_os = "linux"))]
    tray_menu::create(app)?;

    tray.build(app)?;
    Ok(())
}

#[cfg(target_os = "linux")]
fn native_menu(app: &AppHandle) -> tauri::Result<tauri::menu::Menu<tauri::Wry>> {
    use tauri::menu::{Menu, MenuItem};
    let show = MenuItem::with_id(app, "show", "Show EnvForIO", true, None::<&str>)?;
    let mini = MenuItem::with_id(app, "mini", "Mini mode", true, None::<&str>)?;
    let quit = MenuItem::with_id(app, "quit", "Quit EnvForIO", true, None::<&str>)?;
    Menu::with_items(app, &[&show, &mini, &quit])
}
