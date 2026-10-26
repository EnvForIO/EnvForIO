//! Reading the paper library and the papers attached to ideas.

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::domain::paper_ref::{bibtex as to_bibtex, PaperMeta, PaperRef};
use crate::entity::paper::{IdeaPaper, Paper, PaperIdea, ReadingStatus, PAPER_COLUMNS};
use crate::errors::{AppError, AppResult};

#[derive(Debug, Clone, Default, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PaperFilter {
    pub status: Option<ReadingStatus>,
    /// Matches title, authors or venue.
    pub search: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PaperCounts {
    pub all: i64,
    pub by_status: Vec<(ReadingStatus, i64)>,
}

/// Newest first.
pub fn list(conn: &Connection, filter: &PaperFilter) -> AppResult<Vec<Paper>> {
    let search = filter
        .search
        .as_deref()
        .map(str::trim)
        .filter(|s| !s.is_empty())
        .map(|s| format!("%{s}%"));
    let sql = format!(
        "SELECT {PAPER_COLUMNS} FROM papers p
         WHERE (?1 IS NULL OR p.status = ?1)
           AND (?2 IS NULL OR p.title LIKE ?2 OR p.authors LIKE ?2 OR p.venue LIKE ?2)
         ORDER BY p.created_at DESC, p.id DESC"
    );
    let mut stmt = conn.prepare(&sql)?;
    let papers = stmt
        .query_map(params![filter.status, search], Paper::from_row)?
        .collect::<Result<_, _>>()?;
    Ok(papers)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<Paper> {
    conn.query_row(
        &format!("SELECT {PAPER_COLUMNS} FROM papers p WHERE p.id = ?1"),
        params![id],
        Paper::from_row,
    )
    .optional()?
    .ok_or_else(|| AppError::not_found("paper", id))
}

/// The library copy of a DOI or arXiv paper, if it is already there.
pub fn find(conn: &Connection, paper: &PaperRef) -> AppResult<Option<Paper>> {
    let (column, value) = match paper {
        PaperRef::Doi(doi) => ("doi", doi),
        PaperRef::Arxiv(id) => ("arxiv_id", id),
    };
    Ok(conn
        .query_row(
            &format!("SELECT {PAPER_COLUMNS} FROM papers p WHERE p.{column} = ?1"),
            params![value],
            Paper::from_row,
        )
        .optional()?)
}

pub fn counts(conn: &Connection) -> AppResult<PaperCounts> {
    let mut stmt = conn.prepare("SELECT status, count(*) FROM papers GROUP BY status")?;
    let found: Vec<(ReadingStatus, i64)> = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?
        .collect::<Result<_, _>>()?;
    let by_status: Vec<(ReadingStatus, i64)> = ReadingStatus::ALL
        .iter()
        .map(|&s| (s, found.iter().find(|f| f.0 == s).map_or(0, |f| f.1)))
        .collect();
    Ok(PaperCounts {
        all: by_status.iter().map(|s| s.1).sum(),
        by_status,
    })
}

pub fn bibtex(conn: &Connection, id: i64) -> AppResult<String> {
    let p = get(conn, id)?;
    Ok(to_bibtex(&PaperMeta {
        title: p.title,
        authors: p.authors,
        year: p.year,
        venue: p.venue,
        kind: p.kind,
        doi: p.doi,
        arxiv_id: p.arxiv_id,
        url: p.url,
        summary: p.summary,
    }))
}

/// The papers attached to an idea, in the order they were attached.
pub fn idea_papers(conn: &Connection, idea_id: i64) -> AppResult<Vec<IdeaPaper>> {
    let sql = format!(
        "SELECT {PAPER_COLUMNS}, ip.relation, ip.note
         FROM idea_papers ip JOIN papers p ON p.id = ip.paper_id
         WHERE ip.idea_id = ?1 ORDER BY ip.rowid"
    );
    let mut stmt = conn.prepare(&sql)?;
    let papers = stmt
        .query_map(params![idea_id], |r| {
            Ok(IdeaPaper {
                paper: Paper::from_row(r)?,
                relation: r.get(14)?,
                note: r.get(15)?,
            })
        })?
        .collect::<Result<_, _>>()?;
    Ok(papers)
}

/// The ideas a paper is attached to.
pub fn paper_ideas(conn: &Connection, paper_id: i64) -> AppResult<Vec<PaperIdea>> {
    let mut stmt = conn.prepare(
        "SELECT i.id, i.title, ip.relation FROM idea_papers ip JOIN ideas i ON i.id = ip.idea_id
         WHERE ip.paper_id = ?1 ORDER BY i.title",
    )?;
    let ideas = stmt
        .query_map(params![paper_id], |r| {
            Ok(PaperIdea {
                idea_id: r.get(0)?,
                title: r.get(1)?,
                relation: r.get(2)?,
            })
        })?
        .collect::<Result<_, _>>()?;
    Ok(ideas)
}
