//! Conference deadlines: ccfddl's list as last downloaded, the conferences
//! the user follows, and submissions planned from them. Planning makes a
//! paper project whose deadline is the full-paper deadline's day here, plus
//! a task due on the abstract deadline (user decision 2026-11-20).

pub mod fetch;

use std::collections::{HashMap, HashSet};

use chrono::{Local, TimeZone};
use rusqlite::{params, Connection, OptionalExtension};

use crate::entity::conference::{Conference, ConferenceList, Edition};
use crate::entity::project::Project;
use crate::errors::{AppError, AppResult};
use crate::service::ideas::mutation as ideas;
use crate::service::projects::mutation::{self as projects, ProjectInput};
use crate::service::projects::query as project_query;

/// Planned submissions get the colour of a deadline.
const COLOR: &str = "#f97316";

fn json_error(e: serde_json::Error) -> AppError {
    AppError::invalid(format!("conference data: {e}"))
}

/// Replaces the saved list with a fresh download. Follows and planned
/// projects are kept.
pub fn replace_all(conn: &mut Connection, list: &[Conference], now: &str) -> AppResult<()> {
    let tx = conn.transaction()?;
    tx.execute("DELETE FROM conferences", [])?;
    {
        let mut insert = tx.prepare(
            "INSERT INTO conferences (key, title, description, area, ccf, core, editions)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
        )?;
        for c in list {
            let editions = serde_json::to_string(&c.editions).map_err(json_error)?;
            insert.execute(params![
                c.key,
                c.title,
                c.description,
                c.area,
                c.ccf,
                c.core,
                editions
            ])?;
        }
    }
    tx.execute(
        "INSERT INTO conference_source (id, fetched_at) VALUES (1, ?1)
         ON CONFLICT (id) DO UPDATE SET fetched_at = excluded.fetched_at",
        [now],
    )?;
    tx.commit()?;
    Ok(())
}

/// Every conference by title, with editions from `since_year` on (older
/// ones are only ccfddl's history).
pub fn list(conn: &Connection, since_year: i32) -> AppResult<ConferenceList> {
    let fetched_at = conn
        .query_row(
            "SELECT fetched_at FROM conference_source WHERE id = 1",
            [],
            |r| r.get(0),
        )
        .optional()?;
    let followed: HashSet<String> = conn
        .prepare("SELECT key FROM conference_follows")?
        .query_map([], |r| r.get(0))?
        .collect::<Result<_, _>>()?;
    let planned: HashMap<String, i64> = conn
        .prepare("SELECT edition_id, project_id FROM conference_projects")?
        .query_map([], |r| Ok((r.get(0)?, r.get(1)?)))?
        .collect::<Result<_, _>>()?;

    let mut stmt = conn.prepare(
        "SELECT key, title, description, area, ccf, core, editions
         FROM conferences ORDER BY title COLLATE NOCASE",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok((
            Conference {
                key: r.get(0)?,
                title: r.get(1)?,
                description: r.get(2)?,
                area: r.get(3)?,
                ccf: r.get(4)?,
                core: r.get(5)?,
                followed: false,
                editions: Vec::new(),
            },
            r.get::<_, String>(6)?,
        ))
    })?;
    let mut conferences = Vec::new();
    for row in rows {
        let (mut c, editions) = row?;
        let editions: Vec<Edition> = serde_json::from_str(&editions).map_err(json_error)?;
        c.editions = editions
            .into_iter()
            .filter(|e| e.year >= since_year)
            .map(|mut e| {
                e.project_id = planned.get(&e.id).copied();
                e
            })
            .collect();
        c.followed = followed.contains(&c.key);
        conferences.push(c);
    }
    Ok(ConferenceList {
        fetched_at,
        conferences,
    })
}

pub fn set_followed(conn: &Connection, key: &str, on: bool) -> AppResult<()> {
    let sql = if on {
        "INSERT OR IGNORE INTO conference_follows (key) VALUES (?1)"
    } else {
        "DELETE FROM conference_follows WHERE key = ?1"
    };
    conn.execute(sql, [key])?;
    Ok(())
}

/// The day a moment falls on here, 'YYYY-MM-DD'.
fn local_day(ms: i64) -> Option<String> {
    Local
        .timestamp_millis_opt(ms)
        .single()
        .map(|d| d.date_naive().to_string())
}

/// Plans a submission to one round (`stage`) of an edition. Planning the
/// same edition again opens the project already made. Planned from an
/// idea, the idea is linked to the project (its todos join it).
pub fn plan(
    conn: &mut Connection,
    key: &str,
    edition_id: &str,
    stage: usize,
    today: &str,
    idea_id: Option<i64>,
) -> AppResult<Project> {
    let project = plan_project(conn, key, edition_id, stage, today)?;
    match idea_id {
        Some(idea) => {
            ideas::set_project(conn, idea, Some(project.id))?;
            project_query::get(conn, project.id)
        }
        None => Ok(project),
    }
}

fn plan_project(
    conn: &mut Connection,
    key: &str,
    edition_id: &str,
    stage: usize,
    today: &str,
) -> AppResult<Project> {
    let existing: Option<i64> = conn
        .query_row(
            "SELECT project_id FROM conference_projects WHERE edition_id = ?1",
            [edition_id],
            |r| r.get(0),
        )
        .optional()?;
    if let Some(id) = existing {
        return project_query::get(conn, id);
    }

    let (title, editions): (String, String) = conn
        .query_row(
            "SELECT title, editions FROM conferences WHERE key = ?1",
            [key],
            |r| Ok((r.get(0)?, r.get(1)?)),
        )
        .optional()?
        .ok_or_else(|| AppError::invalid(format!("no conference {key}")))?;
    let editions: Vec<Edition> = serde_json::from_str(&editions).map_err(json_error)?;
    let edition = editions
        .iter()
        .find(|e| e.id == edition_id)
        .ok_or_else(|| AppError::invalid(format!("no edition {edition_id}")))?;
    let round = edition
        .stages
        .get(stage)
        .ok_or_else(|| AppError::invalid("no such submission round"))?;
    let deadline = round
        .deadline_at
        .and_then(local_day)
        .ok_or_else(|| AppError::invalid("this deadline has not been announced"))?;
    if deadline.as_str() < today {
        return Err(AppError::invalid("this deadline has passed"));
    }

    let mut name = format!("{title} {}", edition.year);
    if edition.stages.len() > 1 && !round.comment.is_empty() {
        name = format!("{name} ({})", round.comment);
    }
    let input = ProjectInput {
        name,
        color: COLOR.into(),
        start_date: Some(today.into()),
        deadline: Some(deadline),
        buffer_days: 0,
        is_archived: false,
    };
    let project = projects::create(conn, &input, "paper")?;

    if let Some(day) = round.abstract_at.and_then(local_day) {
        if day.as_str() >= today {
            let module = project_query::modules(conn, project.id)?
                .into_iter()
                .find(|m| m.name == "Submission")
                .map(|m| m.id);
            let task = projects::add_task(
                conn,
                project.id,
                module,
                &format!("{title} abstract"),
                &None,
            )?;
            conn.execute(
                "UPDATE tasks SET due_date = ?2 WHERE id = ?1",
                params![task.id, day],
            )?;
        }
    }
    conn.execute(
        "INSERT INTO conference_projects (edition_id, project_id) VALUES (?1, ?2)",
        params![edition_id, project.id],
    )?;
    project_query::get(conn, project.id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use crate::domain::conference::{parse_all, tests::SAMPLE};

    fn loaded() -> Connection {
        let mut conn = open_in_memory();
        replace_all(
            &mut conn,
            &parse_all(SAMPLE).unwrap(),
            "2026-11-20T00:00:00Z",
        )
        .unwrap();
        conn
    }

    #[test]
    fn a_download_replaces_the_list_and_keeps_follows() {
        let mut conn = loaded();
        set_followed(&conn, "nips", true).unwrap();
        let first = list(&conn, 2026).unwrap();
        assert_eq!(first.fetched_at.as_deref(), Some("2026-11-20T00:00:00Z"));
        let titles: Vec<_> = first.conferences.iter().map(|c| c.title.as_str()).collect();
        assert_eq!(titles, ["MICCAI", "NeurIPS"]);
        assert!(first.conferences[1].followed && !first.conferences[0].followed);

        replace_all(
            &mut conn,
            &parse_all(SAMPLE).unwrap(),
            "2026-11-21T00:00:00Z",
        )
        .unwrap();
        assert!(list(&conn, 2026).unwrap().conferences[1].followed);
        assert!(list(&conn, 3000).unwrap().conferences[1]
            .editions
            .is_empty());
        set_followed(&conn, "nips", false).unwrap();
        assert!(!list(&conn, 2026).unwrap().conferences[1].followed);
    }

    #[test]
    fn planning_makes_a_paper_project_with_an_abstract_task() {
        let mut conn = loaded();
        let p = plan(&mut conn, "nips", "nips99", 0, "2026-11-20", None).unwrap();
        let stage = &parse_all(SAMPLE).unwrap()[0].editions[0].stages[0];
        assert_eq!(p.name, "NeurIPS 2099");
        assert_eq!(p.deadline, local_day(stage.deadline_at.unwrap()));
        assert_eq!(p.task_count, 1);
        let tasks = project_query::tasks(&conn, p.id).unwrap();
        let abstract_task = &tasks[0];
        assert_eq!(abstract_task.title, "NeurIPS abstract");
        assert_eq!(
            abstract_task.due_date,
            local_day(stage.abstract_at.unwrap())
        );

        // Again: the same project, and the edition shows it.
        assert_eq!(
            plan(&mut conn, "nips", "nips99", 0, "2026-11-20", None)
                .unwrap()
                .id,
            p.id
        );
        let nips = &list(&conn, 2026).unwrap().conferences[1];
        assert_eq!(nips.editions[0].project_id, Some(p.id));

        // Deleting the project frees the edition.
        projects::delete(&mut conn, p.id).unwrap();
        assert_eq!(
            list(&conn, 2026).unwrap().conferences[1].editions[0].project_id,
            None
        );
    }

    #[test]
    fn planning_from_an_idea_links_it_and_moves_its_todos() {
        let mut conn = loaded();
        let idea = crate::service::ideas::mutation::create(&mut conn, "Sparse attention").unwrap();
        crate::service::ideas::notes::add_todo(&conn, idea.id, "run baseline", None).unwrap();
        let p = plan(&mut conn, "nips", "nips99", 0, "2026-11-20", Some(idea.id)).unwrap();
        assert_eq!(
            crate::service::ideas::query::get(&conn, idea.id)
                .unwrap()
                .project_id,
            Some(p.id)
        );
        assert_eq!(p.task_count, 2); // the abstract task and the idea's todo
    }

    #[test]
    fn unannounced_or_past_deadlines_cannot_be_planned() {
        let mut conn = loaded();
        assert!(plan(&mut conn, "miccai", "miccai99", 0, "2026-11-20", None).is_err());
        assert!(plan(&mut conn, "nips", "nips99", 0, "2100-01-01", None).is_err());
        assert!(plan(&mut conn, "nips", "nips99", 5, "2026-11-20", None).is_err());
    }
}
