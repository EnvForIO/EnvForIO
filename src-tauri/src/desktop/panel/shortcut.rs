//! The global shortcut that shows or hides the panel.

use std::sync::Mutex;

use tauri::AppHandle;
use tauri_plugin_global_shortcut::{GlobalShortcutExt, Shortcut, ShortcutState};

use crate::types::DEFAULT_PANEL_SHORTCUT;

/// The shortcut registered now, to unregister it when it changes.
static CURRENT: Mutex<Option<Shortcut>> = Mutex::new(None);

/// Register `wanted` (None = the default), replacing the previous one. A
/// key another program already holds is logged and skipped.
pub fn register(app: &AppHandle, wanted: Option<&str>) {
    let keys = wanted.unwrap_or(DEFAULT_PANEL_SHORTCUT);
    let global = app.global_shortcut();
    let mut current = CURRENT.lock().unwrap();
    if let Some(old) = current.take() {
        let _ = global.unregister(old);
    }
    let Ok(shortcut) = keys.parse::<Shortcut>() else {
        log::warn!("panel shortcut '{keys}' is not a valid shortcut");
        return;
    };
    let registered = global.on_shortcut(shortcut, |app, _, event| {
        if event.state == ShortcutState::Pressed {
            super::toggle(app);
        }
    });
    match registered {
        Ok(()) => *current = Some(shortcut),
        Err(e) => log::warn!("could not register the panel shortcut '{keys}': {e}"),
    }
}
