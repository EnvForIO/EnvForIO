//! Background downloads: subscribed calendars
//! on start and every hour, RSS feeds on start and every three hours. Each
//! runs on a thread of its own and tells the windows with an event when it
//! had anything to refresh.

use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager};

use crate::api::{calendars, feeds};
use crate::config::AppState;
use crate::errors::AppResult;

pub const CALENDARS_CHANGED: &str = "calendars-changed";
pub const FEEDS_CHANGED: &str = "feeds-changed";

pub fn start(app: &AppHandle) {
    every(
        app,
        Duration::from_secs(3600),
        CALENDARS_CHANGED,
        "calendar",
        |state| {
            tauri::async_runtime::block_on(calendars::refresh(state, None)).map(|l| !l.is_empty())
        },
    );
    every(
        app,
        Duration::from_secs(3 * 3600),
        FEEDS_CHANGED,
        "feed",
        |state| tauri::async_runtime::block_on(feeds::refresh(state)).map(|l| !l.is_empty()),
    );
}

/// Runs `work` now and then every `interval`; emits `event` when it says
/// something was refreshed, logs when it fails.
fn every<F>(app: &AppHandle, interval: Duration, event: &'static str, what: &'static str, work: F)
where
    F: Fn(&AppState) -> AppResult<bool> + Send + 'static,
{
    let app = app.clone();
    thread::spawn(move || loop {
        match work(&app.state::<AppState>()) {
            Ok(true) => {
                let _ = app.emit(event, ());
            }
            Ok(false) => {}
            Err(e) => log::warn!("{what} refresh failed: {e}"),
        }
        thread::sleep(interval);
    });
}
