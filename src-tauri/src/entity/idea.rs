//! The `ideas`, `tags`, `idea_steps` and `idea_links` tables as Rust types.

use rusqlite::types::{FromSql, FromSqlError, FromSqlResult, ToSql, ToSqlOutput, ValueRef};
use rusqlite::Row;
use serde::{Deserialize, Serialize};
use specta::Type;

/// Where an idea is, from first spark to submission.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Type)]
pub enum IdeaStatus {
    Spark,
    Researching,
    InProgress,
    Writing,
    Submitted,
    Done,
    OnHold,
    Dropped,
}

impl IdeaStatus {
    pub const ALL: [IdeaStatus; 8] = [
        Self::Spark,
        Self::Researching,
        Self::InProgress,
        Self::Writing,
        Self::Submitted,
        Self::Done,
        Self::OnHold,
        Self::Dropped,
    ];

    pub fn as_str(self) -> &'static str {
        match self {
            Self::Spark => "Spark",
            Self::Researching => "Researching",
            Self::InProgress => "InProgress",
            Self::Writing => "Writing",
            Self::Submitted => "Submitted",
            Self::Done => "Done",
            Self::OnHold => "OnHold",
            Self::Dropped => "Dropped",
        }
    }
}

impl ToSql for IdeaStatus {
    fn to_sql(&self) -> rusqlite::Result<ToSqlOutput<'_>> {
        Ok(ToSqlOutput::from(self.as_str()))
    }
}

impl FromSql for IdeaStatus {
    fn column_result(value: ValueRef<'_>) -> FromSqlResult<Self> {
        let text = value.as_str()?;
        Self::ALL
            .into_iter()
            .find(|s| s.as_str() == text)
            .ok_or_else(|| FromSqlError::Other(format!("unknown idea status {text}").into()))
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: i64,
    pub name: String,
    pub color: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Idea {
    pub id: i64,
    pub title: String,
    pub description: String,
    pub status: IdeaStatus,
    pub priority: i64, // 0 none, 1 low, 2 medium, 3 high
    pub is_pinned: bool,
    pub venue: String,
    pub deadline: Option<String>,
    pub step_count: i64,
    pub steps_done: i64,
    pub current_step: Option<String>, // the first step not yet ticked
    pub tags: Vec<Tag>,
    pub created_at: String,
}

/// Columns in the order `Idea::from_row` reads them; tags are filled in afterwards.
pub const IDEA_COLUMNS: &str = "i.id, i.title, i.description, i.status, i.priority, i.is_pinned, \
     i.venue, i.deadline, \
     (SELECT count(*) FROM idea_steps s WHERE s.idea_id = i.id), \
     (SELECT count(*) FROM idea_steps s WHERE s.idea_id = i.id AND s.done_on IS NOT NULL), \
     (SELECT s.title FROM idea_steps s WHERE s.idea_id = i.id AND s.done_on IS NULL \
        ORDER BY s.sort_order, s.id LIMIT 1), \
     i.created_at";

impl Idea {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            title: row.get(1)?,
            description: row.get(2)?,
            status: row.get(3)?,
            priority: row.get(4)?,
            is_pinned: row.get(5)?,
            venue: row.get(6)?,
            deadline: row.get(7)?,
            step_count: row.get(8)?,
            steps_done: row.get(9)?,
            current_step: row.get(10)?,
            tags: Vec::new(),
            created_at: row.get(11)?,
        })
    }
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IdeaStep {
    pub id: i64,
    pub idea_id: i64,
    pub title: String,
    pub done_on: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IdeaLink {
    pub id: i64,
    pub idea_id: i64,
    pub label: String,
    pub url: String,
}
