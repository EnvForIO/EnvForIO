//! Creating, editing and deleting ideas and tags.

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use specta::Type;

use super::query;
use crate::domain::day::now_timestamp;
use crate::entity::idea::{Idea, IdeaStatus, Tag};
use crate::errors::{AppError, AppResult};
use crate::service::validate::{check_date, clean_name};

/// The research workflow every new idea starts with (as in Seedbank).
pub const DEFAULT_STEPS: [&str; 8] = [
    "Literature review",
    "Hypothesis",
    "Experiment design",
    "Implementation",
    "Analysis",
    "Writing",
    "Submission prep",
    "Wrap-up",
];

/// Everything the idea detail can edit, sent whole on every save.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IdeaUpdate {
    pub title: String,
    pub description: String,
    pub status: IdeaStatus,
    pub priority: i64,
    pub is_pinned: bool,
    pub venue: String,
    pub deadline: Option<String>,
    pub tag_ids: Vec<i64>,
}

/// A new idea at the top of the list, with the default steps.
pub fn create(conn: &mut Connection, title: &str) -> AppResult<Idea> {
    let title = clean_name(title)?;
    let now = now_timestamp();
    let tx = conn.transaction()?;
    let top: f64 = tx.query_row(
        "SELECT coalesce(min(sort_order), 0) - 1 FROM ideas",
        [],
        |r| r.get(0),
    )?;
    tx.execute(
        "INSERT INTO ideas (title, sort_order, created_at, updated_at) VALUES (?1, ?2, ?3, ?3)",
        params![title, top, now],
    )?;
    let id = tx.last_insert_rowid();
    for (i, step) in DEFAULT_STEPS.iter().enumerate() {
        tx.execute(
            "INSERT INTO idea_steps (idea_id, title, sort_order) VALUES (?1, ?2, ?3)",
            params![id, step, i as f64],
        )?;
    }
    tx.commit()?;
    query::get(conn, id)
}

/// Links an idea to a project, or unlinks it with `None`. Its todos move
/// with it: into the project (outside any module), or back to the task pool.
pub fn set_project(conn: &mut Connection, id: i64, project_id: Option<i64>) -> AppResult<Idea> {
    if let Some(project) = project_id {
        crate::service::projects::query::get(conn, project)?;
    }
    let tx = conn.transaction()?;
    let changed = tx.execute(
        "UPDATE ideas SET project_id = ?2, updated_at = ?3 WHERE id = ?1",
        params![id, project_id, now_timestamp()],
    )?;
    if changed == 0 {
        return Err(AppError::not_found("idea", id));
    }
    tx.execute(
        "UPDATE tasks SET project_id = ?2, module_id = NULL
         WHERE idea_id = ?1 AND project_id IS NOT ?2",
        params![id, project_id],
    )?;
    tx.commit()?;
    query::get(conn, id)
}

pub fn update(conn: &mut Connection, id: i64, update: &IdeaUpdate) -> AppResult<Idea> {
    let title = clean_name(&update.title)?;
    check_date(&update.deadline)?;
    if !(0..=3).contains(&update.priority) {
        return Err(AppError::invalid("priority is 0-3"));
    }
    let tx = conn.transaction()?;
    let changed = tx.execute(
        "UPDATE ideas SET title = ?2, description = ?3, status = ?4, priority = ?5,
             is_pinned = ?6, venue = ?7, deadline = ?8, updated_at = ?9
         WHERE id = ?1",
        params![
            id,
            title,
            update.description,
            update.status,
            update.priority,
            update.is_pinned,
            update.venue.trim(),
            update.deadline,
            now_timestamp()
        ],
    )?;
    if changed == 0 {
        return Err(AppError::not_found("idea", id));
    }
    tx.execute("DELETE FROM idea_tags WHERE idea_id = ?1", params![id])?;
    for tag in &update.tag_ids {
        tx.execute(
            "INSERT OR IGNORE INTO idea_tags (idea_id, tag_id) VALUES (?1, ?2)",
            params![id, tag],
        )?;
    }
    tx.commit()?;
    query::get(conn, id)
}

pub fn delete(conn: &Connection, id: i64) -> AppResult<()> {
    // Steps, links and tag links go with it (ON DELETE CASCADE).
    if conn.execute("DELETE FROM ideas WHERE id = ?1", params![id])? == 0 {
        return Err(AppError::not_found("idea", id));
    }
    Ok(())
}

pub fn create_tag(conn: &Connection, name: &str, color: &str) -> AppResult<Tag> {
    let name = clean_name(name)?;
    conn.execute(
        "INSERT INTO tags (name, color) VALUES (?1, ?2) ON CONFLICT (name) DO NOTHING",
        params![name, color],
    )?;
    let tag = conn.query_row(
        "SELECT id, name, color FROM tags WHERE name = ?1",
        params![name],
        |r| {
            Ok(Tag {
                id: r.get(0)?,
                name: r.get(1)?,
                color: r.get(2)?,
            })
        },
    )?;
    Ok(tag)
}

pub fn delete_tag(conn: &Connection, id: i64) -> AppResult<()> {
    if conn.execute("DELETE FROM tags WHERE id = ?1", params![id])? == 0 {
        return Err(AppError::not_found("tag", id));
    }
    Ok(())
}
