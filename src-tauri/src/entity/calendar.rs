//! External calendars (read-only ICS subscriptions) and their events, as
//! the UI receives them. Event times are Unix ms.

use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Calendar {
    pub id: i64,
    pub name: String,
    pub url: String, // the subscription link; private, stays on this machine
    pub color: String,
    pub is_visible: bool,
    pub fetched_at: Option<String>, // last successful download, RFC 3339
    pub error: Option<String>,      // why the last download failed
    pub event_count: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CalendarEvent {
    pub id: i64,
    pub calendar_id: i64,
    pub color: String, // the calendar's
    pub title: String,
    pub location: String,
    pub start_ms: i64,
    pub end_ms: i64,
    pub all_day: bool,
}
