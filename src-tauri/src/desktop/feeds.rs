//! Refreshes the RSS feeds when EnvIO starts and then every three hours
//! (user decision 2026-11-20), on a thread of its own, and tells the
//! windows with a `feeds-changed` event.

use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};

use crate::api::feeds::refresh;
use crate::config::AppState;

const EVERY: Duration = Duration::from_secs(3 * 3600);

pub fn start(app: &AppHandle) {
    let app = app.clone();
    thread::spawn(move || loop {
        let state = app.state::<AppState>();
        match tauri::async_runtime::block_on(refresh(&state)) {
            Ok(list) if !list.is_empty() => {
                let _ = app.emit("feeds-changed", ());
            }
            Ok(_) => {}
            Err(e) => log::warn!("feed refresh failed: {e}"),
        }
        thread::sleep(EVERY);
    });
}
