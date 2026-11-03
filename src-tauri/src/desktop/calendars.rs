//! Refreshes the external calendars when EnvIO starts and then every hour
//! (user decision 2026-11-20), on a thread of its own, and tells the
//! windows with a `calendars-changed` event.

use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};

use crate::api::calendars::refresh;
use crate::config::AppState;

pub const CHANGED: &str = "calendars-changed";
const EVERY: Duration = Duration::from_secs(3600);

pub fn start(app: &AppHandle) {
    let app = app.clone();
    thread::spawn(move || loop {
        let state = app.state::<AppState>();
        match tauri::async_runtime::block_on(refresh(&state, None)) {
            Ok(list) if !list.is_empty() => {
                let _ = app.emit(CHANGED, ());
            }
            Ok(_) => {}
            Err(e) => log::warn!("calendar refresh failed: {e}"),
        }
        thread::sleep(EVERY);
    });
}
