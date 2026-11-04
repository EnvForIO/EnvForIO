//! RSS / Atom feeds and their items, as the UI receives them.

use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Feed {
    pub id: i64,
    pub title: String,
    pub url: String,
    pub site: String,
    pub fetched_at: Option<String>,
    pub error: Option<String>,
    pub unread: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct FeedItem {
    pub id: i64,
    pub feed_id: i64,
    pub feed_title: String,
    pub title: String,
    pub link: String,
    pub author: String,
    pub summary: String, // plain text; paragraphs separated by blank lines
    pub image: Option<String>,
    pub date_ms: i64, // published, or first seen when undated
    pub is_read: bool,
    pub task_id: Option<i64>, // the todo made from it, if any
}
