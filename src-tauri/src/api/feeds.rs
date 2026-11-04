//! RSS reader commands; storage is in `service::feeds`, parsing in
//! `domain::feed`. Downloads never hold the database lock across the
//! network call. `refresh` also runs on start and every three hours
//! (`desktop::refresh`).

use chrono::Utc;
use tauri::State;

use crate::config::AppState;
use crate::domain::day::today;
use crate::entity::feed::{Feed, FeedItem};
use crate::errors::{AppError, AppResult};
use crate::service::feeds::{self, fetch};

/// Downloads every feed; a feed that fails keeps its items and records why.
pub async fn refresh(state: &AppState) -> AppResult<Vec<Feed>> {
    let targets: Vec<(i64, String)> = feeds::list(&state.db())?
        .into_iter()
        .map(|f| (f.id, f.url))
        .collect();
    for (id, url) in targets {
        match fetch::download(&url).await {
            Ok((_, parsed)) => {
                let now = Utc::now().timestamp_millis();
                feeds::store(&mut state.db(), id, &parsed, now)?;
            }
            Err(e) => feeds::set_error(&state.db(), id, &e.to_string())?,
        }
    }
    feeds::list(&state.db())
}

#[tauri::command]
#[specta::specta]
pub fn list_feeds(state: State<'_, AppState>) -> AppResult<Vec<Feed>> {
    feeds::list(&state.db())
}

/// Subscribes to a feed, or to the feed a web page names.
#[tauri::command]
#[specta::specta]
pub async fn add_feed(state: State<'_, AppState>, url: String) -> AppResult<Feed> {
    let url = url.trim();
    let url = if url.starts_with("http://") || url.starts_with("https://") {
        url.to_string()
    } else {
        format!("https://{url}")
    };
    if url.len() <= "https://".len() {
        return Err(AppError::invalid("paste the address of a feed or a site"));
    }
    let (feed_url, parsed) = fetch::download(&url).await?;
    feeds::add(
        &mut state.db(),
        &feed_url,
        &parsed,
        Utc::now().timestamp_millis(),
    )
}

#[tauri::command]
#[specta::specta]
pub fn remove_feed(state: State<'_, AppState>, id: i64) -> AppResult<()> {
    feeds::remove(&state.db(), id)
}

#[tauri::command]
#[specta::specta]
pub async fn refresh_feeds(state: State<'_, AppState>) -> AppResult<Vec<Feed>> {
    refresh(&state).await
}

/// Items of one feed (or all, with None), newest first.
#[tauri::command]
#[specta::specta]
pub fn list_feed_items(
    state: State<'_, AppState>,
    feed_id: Option<i64>,
    unread_only: bool,
) -> AppResult<Vec<FeedItem>> {
    feeds::items(&state.db(), feed_id, unread_only)
}

#[tauri::command]
#[specta::specta]
pub fn set_feed_item_read(state: State<'_, AppState>, id: i64, read: bool) -> AppResult<FeedItem> {
    feeds::set_read(&state.db(), id, read)
}

#[tauri::command]
#[specta::specta]
pub fn mark_feed_read(state: State<'_, AppState>, feed_id: Option<i64>) -> AppResult<()> {
    feeds::mark_all_read(&state.db(), feed_id)
}

/// Makes a todo "Read: <title>" with the link in its note.
#[tauri::command]
#[specta::specta]
pub fn add_feed_item_to_todos(state: State<'_, AppState>, id: i64) -> AppResult<FeedItem> {
    feeds::add_to_todos(&state.db(), id, &today())
}
