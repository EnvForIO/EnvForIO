//! The desktop calendar widget (phase 4 step 7): a small frameless month
//! view that stays under other windows, on its own and independent of
//! Todo Duo (user decision 2026-11-20). The tray menu shows and hides it;
//! whether it is shown is remembered, its place and size are kept by the
//! window-state plugin.

use tauri::webview::WebviewWindowBuilder;
use tauri::{AppHandle, Emitter, Manager, WebviewUrl, WebviewWindow, WindowEvent};
use tauri_plugin_window_state::{StateFlags, WindowExt};

use crate::config::AppState;
use crate::service::month::{set_widget_visible, widget_visible};

pub const LABEL: &str = "month-widget";
const NAME: &str = "month";

fn remember(app: &AppHandle, visible: bool) {
    if let Err(e) = set_widget_visible(&app.state::<AppState>().db(), NAME, visible) {
        log::warn!("could not remember the calendar widget: {e}");
    }
}

pub fn create(app: &AppHandle) -> tauri::Result<()> {
    let window = WebviewWindowBuilder::new(
        app,
        LABEL,
        WebviewUrl::App(format!("index.html?window={LABEL}").into()),
    )
    .title("EnvIO calendar")
    .inner_size(300.0, 380.0)
    .min_inner_size(240.0, 260.0)
    .decorations(false)
    .transparent(true)
    .shadow(false)
    .skip_taskbar(true)
    .resizable(true)
    .always_on_bottom(true) // a desktop widget, not a window to switch to
    .visible(false)
    .build()?;
    // Windows made after start-up are not restored by the plugin by itself.
    let _ = window.restore_state(StateFlags::POSITION | StateFlags::SIZE);

    let handle = app.clone();
    window.on_window_event(move |event| {
        if let WindowEvent::CloseRequested { api, .. } = event {
            api.prevent_close();
            hide(&handle);
        }
    });

    let shown = widget_visible(&app.state::<AppState>().db(), NAME).unwrap_or(false);
    if shown {
        window.show()?;
    }
    Ok(())
}

fn window(app: &AppHandle) -> Option<WebviewWindow> {
    app.get_webview_window(LABEL)
}

pub fn hide(app: &AppHandle) {
    if let Some(w) = window(app) {
        let _ = w.hide();
    }
    remember(app, false);
}

/// Shows the widget if hidden, hides it if shown (the tray menu item).
pub fn toggle(app: &AppHandle) {
    let Some(w) = window(app) else { return };
    if w.is_visible().unwrap_or(false) {
        hide(app);
    } else {
        let _ = w.show();
        remember(app, true);
    }
}

/// Brings up the main window on the calendar page at `date`.
pub fn open_day(app: &AppHandle, date: &str) {
    if let Some(main) = app.get_webview_window("main") {
        let _ = main.show();
        let _ = main.unminimize();
        let _ = main.set_focus();
        let _ = app.emit_to("main", "open-calendar-day", date);
    }
}
