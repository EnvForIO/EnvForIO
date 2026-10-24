//! The parts inside an idea: its research steps and its links.

use rusqlite::{params, Connection};

use super::query;
use crate::entity::idea::{IdeaLink, IdeaStep};
use crate::errors::{AppError, AppResult};
use crate::service::validate::clean_name;

pub fn add_step(conn: &Connection, idea_id: i64, title: &str) -> AppResult<Vec<IdeaStep>> {
    let title = clean_name(title)?;
    query::get(conn, idea_id)?;
    conn.execute(
        "INSERT INTO idea_steps (idea_id, title, sort_order)
         VALUES (?1, ?2, (SELECT coalesce(max(sort_order), 0) + 1 FROM idea_steps WHERE idea_id = ?1))",
        params![idea_id, title],
    )?;
    query::steps(conn, idea_id)
}

/// Tick a step (recording `today`) or untick it.
pub fn set_step_done(
    conn: &Connection,
    id: i64,
    done: bool,
    today: &str,
) -> AppResult<Vec<IdeaStep>> {
    let idea_id: i64 = conn
        .query_row(
            "SELECT idea_id FROM idea_steps WHERE id = ?1",
            params![id],
            |r| r.get(0),
        )
        .map_err(|_| AppError::not_found("step", id))?;
    conn.execute(
        "UPDATE idea_steps SET done_on = ?2 WHERE id = ?1",
        params![id, done.then_some(today)],
    )?;
    query::steps(conn, idea_id)
}

pub fn delete_step(conn: &Connection, id: i64) -> AppResult<()> {
    if conn.execute("DELETE FROM idea_steps WHERE id = ?1", params![id])? == 0 {
        return Err(AppError::not_found("step", id));
    }
    Ok(())
}

pub fn add_link(conn: &Connection, idea_id: i64, label: &str, url: &str) -> AppResult<IdeaLink> {
    let url = url.trim();
    if !(url.starts_with("http://") || url.starts_with("https://")) {
        return Err(AppError::invalid("a link starts with http:// or https://"));
    }
    query::get(conn, idea_id)?;
    let label = if label.trim().is_empty() {
        url
    } else {
        label.trim()
    };
    conn.execute(
        "INSERT INTO idea_links (idea_id, label, url) VALUES (?1, ?2, ?3)",
        params![idea_id, label, url],
    )?;
    Ok(IdeaLink {
        id: conn.last_insert_rowid(),
        idea_id,
        label: label.into(),
        url: url.into(),
    })
}

pub fn delete_link(conn: &Connection, id: i64) -> AppResult<()> {
    if conn.execute("DELETE FROM idea_links WHERE id = ?1", params![id])? == 0 {
        return Err(AppError::not_found("link", id));
    }
    Ok(())
}
