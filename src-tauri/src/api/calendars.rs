//! External calendar commands; storage is in `service::calendars`, parsing
//! in `domain::ics`. Downloads never hold the database lock across the
//! network call. `refresh` is also run on start and hourly by
//! `desktop::refresh`.

use chrono::Utc;
use tauri::State;

use crate::config::AppState;
use crate::domain::day::now_timestamp;
use crate::domain::ics::occurrences;
use crate::entity::calendar::{Calendar, CalendarEvent};
use crate::errors::AppResult;
use crate::service::calendars::{self, fetch, KEEP_AHEAD_MS, KEEP_BACK_MS};

/// Downloads and stores the given calendars (all when `only` is None).
/// A calendar that fails keeps its old events and records why.
pub async fn refresh(state: &AppState, only: Option<i64>) -> AppResult<Vec<Calendar>> {
    let targets: Vec<(i64, String)> = calendars::list(&state.db())?
        .into_iter()
        .filter(|c| only.is_none_or(|id| id == c.id))
        .map(|c| (c.id, c.url))
        .collect();
    for (id, url) in targets {
        let now = Utc::now().timestamp_millis();
        match fetch::download(&url).await {
            Ok(ics) => {
                let events = occurrences(&ics, now - KEEP_BACK_MS, now + KEEP_AHEAD_MS);
                calendars::store(&mut state.db(), id, &events, &now_timestamp())?;
            }
            Err(e) => calendars::set_error(&state.db(), id, &e.to_string())?,
        }
    }
    calendars::list(&state.db())
}

#[tauri::command]
#[specta::specta]
pub fn list_calendars(state: State<'_, AppState>) -> AppResult<Vec<Calendar>> {
    calendars::list(&state.db())
}

/// Subscribes and downloads it at once (a failed first download is kept
/// as the calendar's error, not refused, so the link can be fixed later).
#[tauri::command]
#[specta::specta]
pub async fn add_calendar(
    state: State<'_, AppState>,
    name: String,
    url: String,
    color: String,
) -> AppResult<Vec<Calendar>> {
    let calendar = calendars::add(&state.db(), &name, &url, &color)?;
    refresh(&state, Some(calendar.id)).await
}

#[tauri::command]
#[specta::specta]
pub fn update_calendar(
    state: State<'_, AppState>,
    id: i64,
    name: String,
    color: String,
    visible: bool,
) -> AppResult<Calendar> {
    calendars::update(&state.db(), id, &name, &color, visible)
}

#[tauri::command]
#[specta::specta]
pub fn remove_calendar(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    calendars::remove(&state.db(), id)
}

#[tauri::command]
#[specta::specta]
pub async fn refresh_calendars(state: State<'_, AppState>) -> AppResult<Vec<Calendar>> {
    refresh(&state, None).await
}

/// Events of visible calendars overlapping `from_ms`..`to_ms` (Unix ms).
#[tauri::command]
#[specta::specta]
pub fn list_calendar_events(
    state: State<'_, AppState>,
    from_ms: i64,
    to_ms: i64,
) -> AppResult<Vec<CalendarEvent>> {
    calendars::events(&state.db(), from_ms, to_ms)
}
