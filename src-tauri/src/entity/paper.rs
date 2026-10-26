//! The `papers` and `idea_papers` tables as Rust types.

use rusqlite::types::{FromSql, FromSqlError, FromSqlResult, ToSql, ToSqlOutput, ValueRef};
use rusqlite::Row;
use serde::{Deserialize, Serialize};
use specta::Type;

/// Text enums stored by name, so the database stays readable.
macro_rules! sql_enum {
    ($name:ident { $($variant:ident),+ $(,)? }) => {
        #[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize, Type)]
        pub enum $name { $($variant),+ }

        impl $name {
            pub const ALL: &[$name] = &[$(Self::$variant),+];

            pub fn as_str(self) -> &'static str {
                match self { $(Self::$variant => stringify!($variant)),+ }
            }
        }

        impl ToSql for $name {
            fn to_sql(&self) -> rusqlite::Result<ToSqlOutput<'_>> {
                Ok(ToSqlOutput::from(self.as_str()))
            }
        }

        impl FromSql for $name {
            fn column_result(value: ValueRef<'_>) -> FromSqlResult<Self> {
                let text = value.as_str()?;
                Self::ALL
                    .iter()
                    .copied()
                    .find(|s| s.as_str() == text)
                    .ok_or_else(|| FromSqlError::Other(format!("unknown {} {text}", stringify!($name)).into()))
            }
        }
    };
}

sql_enum!(ReadingStatus {
    ToRead,
    Reading,
    Read
});

// Why a paper matters to an idea.
sql_enum!(PaperRelation {
    Inspiration,
    Baseline,
    Competing,
    Reference
});

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Paper {
    pub id: i64,
    pub title: String,
    pub authors: Vec<String>,
    pub year: Option<i64>,
    pub venue: String,
    pub kind: String,
    pub doi: Option<String>,
    pub arxiv_id: Option<String>,
    pub url: String,
    pub summary: String,
    pub status: ReadingStatus,
    pub notes: String,
    pub idea_count: i64,
    pub created_at: String,
}

/// The columns `Paper::from_row` reads, in order.
pub const PAPER_COLUMNS: &str = "p.id, p.title, p.authors, p.year, p.venue, p.kind, p.doi, \
     p.arxiv_id, p.url, p.summary, p.status, p.notes, \
     (SELECT count(*) FROM idea_papers ip WHERE ip.paper_id = p.id), p.created_at";

impl Paper {
    pub fn from_row(row: &Row<'_>) -> rusqlite::Result<Self> {
        let authors: String = row.get(2)?;
        Ok(Self {
            id: row.get(0)?,
            title: row.get(1)?,
            authors: authors.lines().map(str::to_string).collect(),
            year: row.get(3)?,
            venue: row.get(4)?,
            kind: row.get(5)?,
            doi: row.get(6)?,
            arxiv_id: row.get(7)?,
            url: row.get(8)?,
            summary: row.get(9)?,
            status: row.get(10)?,
            notes: row.get(11)?,
            idea_count: row.get(12)?,
            created_at: row.get(13)?,
        })
    }
}

/// A paper as attached to one idea.
#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IdeaPaper {
    pub paper: Paper,
    pub relation: PaperRelation,
    pub note: String,
}

/// An idea a paper is attached to (shown on the paper).
#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PaperIdea {
    pub idea_id: i64,
    pub title: String,
    pub relation: PaperRelation,
}
