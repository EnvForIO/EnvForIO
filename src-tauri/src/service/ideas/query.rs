//! Reading ideas: the filtered list, one idea, counts for the filter chips,
//! tags, steps and links.

use std::collections::HashMap;

use rusqlite::{params, Connection, OptionalExtension};
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::entity::idea::{Idea, IdeaLink, IdeaStatus, IdeaStep, Tag, IDEA_COLUMNS};
use crate::errors::{AppError, AppResult};

/// Which ideas the list shows. All None / false = every idea.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IdeaFilter {
    pub status: Option<IdeaStatus>,
    pub pinned: bool,
    pub unfinished: bool,
    pub tag_id: Option<i64>,
}

const ORDER: &str = "ORDER BY i.is_pinned DESC, i.priority DESC, i.sort_order, i.id DESC";

fn tags_by_idea(conn: &Connection) -> AppResult<HashMap<i64, Vec<Tag>>> {
    let mut stmt = conn.prepare(
        "SELECT it.idea_id, t.id, t.name, t.color FROM idea_tags it
         JOIN tags t ON t.id = it.tag_id ORDER BY t.name",
    )?;
    let mut map: HashMap<i64, Vec<Tag>> = HashMap::new();
    for row in stmt.query_map([], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            Tag {
                id: r.get(1)?,
                name: r.get(2)?,
                color: r.get(3)?,
            },
        ))
    })? {
        let (idea, tag) = row?;
        map.entry(idea).or_default().push(tag);
    }
    Ok(map)
}

fn with_tags(conn: &Connection, mut ideas: Vec<Idea>) -> AppResult<Vec<Idea>> {
    let mut tags = tags_by_idea(conn)?;
    for idea in &mut ideas {
        idea.tags = tags.remove(&idea.id).unwrap_or_default();
    }
    Ok(ideas)
}

pub fn list(conn: &Connection, filter: &IdeaFilter) -> AppResult<Vec<Idea>> {
    let mut clauses = vec!["1".to_string()];
    if filter.pinned {
        clauses.push("i.is_pinned = 1".into());
    }
    if filter.unfinished {
        clauses.push("i.status NOT IN ('Done', 'Dropped')".into());
    }
    if filter.status.is_some() {
        clauses.push("i.status = ?1".into());
    } else {
        clauses.push("?1 IS NULL".into());
    }
    if filter.tag_id.is_some() {
        clauses.push("i.id IN (SELECT idea_id FROM idea_tags WHERE tag_id = ?2)".into());
    } else {
        clauses.push("?2 IS NULL".into());
    }
    let sql = format!(
        "SELECT {IDEA_COLUMNS} FROM ideas i WHERE {} {ORDER}",
        clauses.join(" AND ")
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![filter.status, filter.tag_id], Idea::from_row)?;
    with_tags(conn, rows.collect::<Result<_, _>>()?)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<Idea> {
    let sql = format!("SELECT {IDEA_COLUMNS} FROM ideas i WHERE i.id = ?1");
    let idea = conn
        .query_row(&sql, params![id], Idea::from_row)
        .optional()?
        .ok_or_else(|| AppError::not_found("idea", id))?;
    Ok(with_tags(conn, vec![idea])?.remove(0))
}

/// Counts for the filter chips.
#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IdeaCounts {
    pub all: i64,
    pub pinned: i64,
    pub unfinished: i64,
    pub by_status: Vec<(IdeaStatus, i64)>, // every status, in pipeline order
    pub by_tag: Vec<(i64, i64)>,           // (tag id, ideas)
}

pub fn counts(conn: &Connection) -> AppResult<IdeaCounts> {
    let (all, pinned, unfinished) = conn.query_row(
        "SELECT count(*), coalesce(sum(is_pinned), 0),
                coalesce(sum(status NOT IN ('Done', 'Dropped')), 0) FROM ideas",
        [],
        |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
    )?;
    let mut per: HashMap<IdeaStatus, i64> = HashMap::new();
    let mut stmt = conn.prepare("SELECT status, count(*) FROM ideas GROUP BY status")?;
    for row in stmt.query_map([], |r| {
        Ok((r.get::<_, IdeaStatus>(0)?, r.get::<_, i64>(1)?))
    })? {
        let (status, n) = row?;
        per.insert(status, n);
    }
    let mut stmt = conn.prepare("SELECT tag_id, count(*) FROM idea_tags GROUP BY tag_id")?;
    let by_tag = stmt
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?
        .collect::<Result<_, _>>()?;
    Ok(IdeaCounts {
        all,
        pinned,
        unfinished,
        by_status: IdeaStatus::ALL
            .iter()
            .map(|s| (*s, per.get(s).copied().unwrap_or(0)))
            .collect(),
        by_tag,
    })
}

pub fn tags(conn: &Connection) -> AppResult<Vec<Tag>> {
    let mut stmt = conn.prepare("SELECT id, name, color FROM tags ORDER BY name")?;
    let rows = stmt.query_map([], |r| {
        Ok(Tag {
            id: r.get(0)?,
            name: r.get(1)?,
            color: r.get(2)?,
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn steps(conn: &Connection, idea_id: i64) -> AppResult<Vec<IdeaStep>> {
    let mut stmt = conn.prepare(
        "SELECT id, idea_id, title, done_on FROM idea_steps WHERE idea_id = ?1 ORDER BY sort_order, id",
    )?;
    let rows = stmt.query_map(params![idea_id], |r| {
        Ok(IdeaStep {
            id: r.get(0)?,
            idea_id: r.get(1)?,
            title: r.get(2)?,
            done_on: r.get(3)?,
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn links(conn: &Connection, idea_id: i64) -> AppResult<Vec<IdeaLink>> {
    let mut stmt = conn
        .prepare("SELECT id, idea_id, label, url FROM idea_links WHERE idea_id = ?1 ORDER BY id")?;
    let rows = stmt.query_map(params![idea_id], |r| {
        Ok(IdeaLink {
            id: r.get(0)?,
            idea_id: r.get(1)?,
            label: r.get(2)?,
            url: r.get(3)?,
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}
