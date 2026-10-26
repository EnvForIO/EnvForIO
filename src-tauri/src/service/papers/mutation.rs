//! Writing the paper library and attaching papers to ideas.

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use specta::Type;

use super::query;
use crate::domain::day::now_timestamp;
use crate::domain::paper_ref::{PaperMeta, PaperRef};
use crate::entity::paper::{Paper, PaperRelation, ReadingStatus};
use crate::errors::{AppError, AppResult};
use crate::service::ideas::query as ideas;
use crate::service::validate::clean_name;

/// Add a paper; a DOI or arXiv id already in the library returns that paper.
pub fn insert(conn: &Connection, meta: &PaperMeta) -> AppResult<Paper> {
    let title = clean_name(&meta.title)?;
    let known = [
        meta.doi.clone().map(PaperRef::Doi),
        meta.arxiv_id.clone().map(PaperRef::Arxiv),
    ];
    for paper in known.iter().flatten() {
        if let Some(found) = query::find(conn, paper)? {
            return Ok(found);
        }
    }
    let now = now_timestamp();
    conn.execute(
        "INSERT INTO papers (title, authors, year, venue, kind, doi, arxiv_id, url, summary,
                             pdf_url, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?11)",
        params![
            title,
            meta.authors.join("\n"),
            meta.year,
            meta.venue,
            if meta.kind.is_empty() {
                "misc"
            } else {
                &meta.kind
            },
            meta.doi,
            meta.arxiv_id,
            meta.url,
            meta.summary,
            meta.pdf_url,
            now
        ],
    )?;
    query::get(conn, conn.last_insert_rowid())
}

/// Everything the paper page edits.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PaperUpdate {
    pub title: String,
    pub authors: Vec<String>,
    pub year: Option<i64>,
    pub venue: String,
    pub status: ReadingStatus,
    pub notes: String,
}

pub fn update(conn: &Connection, id: i64, update: &PaperUpdate) -> AppResult<Paper> {
    let title = clean_name(&update.title)?;
    let authors: Vec<&str> = update
        .authors
        .iter()
        .map(|a| a.trim())
        .filter(|a| !a.is_empty())
        .collect();
    let changed = conn.execute(
        "UPDATE papers SET title = ?2, authors = ?3, year = ?4, venue = ?5, status = ?6,
                           notes = ?7, updated_at = ?8
         WHERE id = ?1",
        params![
            id,
            title,
            authors.join("\n"),
            update.year,
            update.venue.trim(),
            update.status,
            update.notes,
            now_timestamp()
        ],
    )?;
    if changed == 0 {
        return Err(AppError::not_found("paper", id));
    }
    query::get(conn, id)
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    if conn.execute("DELETE FROM papers WHERE id = ?1", params![id])? == 0 {
        return Err(AppError::not_found("paper", id));
    }
    Ok(())
}

pub fn set_has_pdf(conn: &Connection, id: i64, has_pdf: bool) -> AppResult<()> {
    conn.execute(
        "UPDATE papers SET has_pdf = ?2 WHERE id = ?1",
        params![id, has_pdf],
    )?;
    Ok(())
}

/// Attach a paper to an idea, or change how it is attached.
pub fn link(
    conn: &Connection,
    idea_id: i64,
    paper_id: i64,
    relation: PaperRelation,
    note: &str,
) -> AppResult<()> {
    ideas::get(conn, idea_id)?;
    query::get(conn, paper_id)?;
    conn.execute(
        "INSERT INTO idea_papers (idea_id, paper_id, relation, note) VALUES (?1, ?2, ?3, ?4)
         ON CONFLICT (idea_id, paper_id) DO UPDATE SET relation = excluded.relation, note = excluded.note",
        params![idea_id, paper_id, relation, note.trim()],
    )?;
    Ok(())
}

pub fn unlink(conn: &Connection, idea_id: i64, paper_id: i64) -> AppResult<()> {
    conn.execute(
        "DELETE FROM idea_papers WHERE idea_id = ?1 AND paper_id = ?2",
        params![idea_id, paper_id],
    )?;
    Ok(())
}
