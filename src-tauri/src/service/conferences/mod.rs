//! Conference deadlines: ccfddl's list as last downloaded, and the
//! conference projects made from it. A conference project is
//! created from the new-project dialog: its deadline is the
//! full-paper deadline's day here, its phases are what the dialog sends,
//! and an abstract deadline becomes a task due that day.

pub mod fetch;

use std::collections::HashMap;

use chrono::{Local, TimeZone};
use rusqlite::{params, Connection, OptionalExtension};

use crate::entity::conference::{Conference, ConferenceList, Edition, ProjectRound, RoundRef};
use crate::entity::project::Project;
use crate::errors::{AppError, AppResult};
use crate::service::ideas::mutation as ideas;
use crate::service::projects::mutation::{self as projects, PhaseInput, ProjectInput};
use crate::service::projects::query as project_query;

fn json_error(e: serde_json::Error) -> AppError {
    AppError::invalid(format!("conference data: {e}"))
}

/// Replaces the saved list with a fresh download. Projects made from it are kept.
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
        conferences.push(c);
    }
    Ok(ConferenceList {
        fetched_at,
        conferences,
    })
}

/// The day a moment falls on here, 'YYYY-MM-DD'.
fn local_day(ms: i64) -> Option<String> {
    Local
        .timestamp_millis_opt(ms)
        .single()
        .map(|d| d.date_naive().to_string())
}

/// A conference's title and one of its editions, as last downloaded.
fn edition(conn: &Connection, key: &str, edition_id: &str) -> AppResult<(String, Edition)> {
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
        .into_iter()
        .find(|e| e.id == edition_id)
        .ok_or_else(|| AppError::invalid(format!("no edition {edition_id}")))?;
    Ok((title, edition))
}

/// Creates the project for one round of a conference, with the dialog's
/// name, colour and phases; its deadline is the round's paper deadline.
/// Making a project for an edition that has one opens that one instead.
/// From an idea, the idea is linked to the project (its todos join it).
pub fn create_project(
    conn: &mut Connection,
    input: &ProjectInput,
    phases: &[PhaseInput],
    round: &RoundRef,
    today: &str,
    idea_id: Option<i64>,
) -> AppResult<Project> {
    let project = create_once(conn, input, phases, round, today)?;
    if let Some(idea) = idea_id {
        ideas::set_project(conn, idea, Some(project.id))?;
    }
    project_query::get(conn, project.id)
}

fn create_once(
    conn: &mut Connection,
    input: &ProjectInput,
    phases: &[PhaseInput],
    round: &RoundRef,
    today: &str,
) -> AppResult<Project> {
    let existing: Option<i64> = conn
        .query_row(
            "SELECT project_id FROM conference_projects WHERE edition_id = ?1",
            [&round.edition_id],
            |r| r.get(0),
        )
        .optional()?;
    if let Some(id) = existing {
        return project_query::get(conn, id);
    }

    let (title, edition) = edition(conn, &round.key, &round.edition_id)?;
    let stage = edition
        .stages
        .get(round.stage as usize)
        .ok_or_else(|| AppError::invalid("no such submission round"))?;
    let deadline = stage
        .deadline_at
        .and_then(local_day)
        .ok_or_else(|| AppError::invalid("this deadline has not been announced"))?;
    if deadline.as_str() < today {
        return Err(AppError::invalid("this deadline has passed"));
    }
    // ccfddl decides the deadline, whatever the dialog showed.
    let input = ProjectInput {
        deadline: Some(deadline),
        ..input.clone()
    };
    let project = projects::create(conn, &input, "conference", Some(phases))?;

    if let Some(day) = stage.abstract_at.and_then(local_day) {
        if day.as_str() >= today {
            // In the first phase still open on the abstract's day.
            let module = project_query::modules(conn, project.id)?
                .into_iter()
                .filter(|m| m.end_date.as_deref().is_some_and(|end| end >= day.as_str()))
                .min_by(|a, b| a.end_date.cmp(&b.end_date))
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
        "INSERT INTO conference_projects (edition_id, project_id, conference_key, stage)
         VALUES (?1, ?2, ?3, ?4)",
        params![round.edition_id, project.id, round.key, round.stage],
    )?;
    project_query::get(conn, project.id)
}

/// The round a project was made for, as ccfddl has it now; None for a
/// project not made from a conference, or one ccfddl's list no longer has.
pub fn project_round(conn: &Connection, project_id: i64) -> AppResult<Option<ProjectRound>> {
    let link: Option<(String, Option<String>, u32)> = conn
        .query_row(
            "SELECT edition_id, conference_key, stage FROM conference_projects WHERE project_id = ?1",
            [project_id],
            |r| Ok((r.get(0)?, r.get(1)?, r.get(2)?)),
        )
        .optional()?;
    let Some((edition_id, Some(key), stage)) = link else {
        return Ok(None);
    };
    match edition(conn, &key, &edition_id) {
        Ok((title, mut edition)) => {
            edition.project_id = Some(project_id);
            Ok(Some(ProjectRound {
                title,
                edition,
                stage,
            }))
        }
        Err(AppError::Invalid { .. }) => Ok(None),
        Err(e) => Err(e),
    }
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

    fn input() -> ProjectInput {
        ProjectInput {
            name: "NeurIPS 2099".into(),
            color: "#f97316".into(),
            start_date: Some("2026-11-20".into()),
            deadline: None, // set from the round
            buffer_days: 0,
            is_archived: false,
        }
    }

    fn nips(stage: u32) -> RoundRef {
        RoundRef {
            key: "nips".into(),
            edition_id: "nips99".into(),
            stage,
        }
    }

    fn phases() -> Vec<PhaseInput> {
        vec![PhaseInput {
            name: "Experiments".into(),
            end_date: Some("2026-12-01".into()),
            budget: None,
        }]
    }

    #[test]
    fn a_download_replaces_the_list() {
        let mut conn = loaded();
        let first = list(&conn, 2026).unwrap();
        assert_eq!(first.fetched_at.as_deref(), Some("2026-11-20T00:00:00Z"));
        let titles: Vec<_> = first.conferences.iter().map(|c| c.title.as_str()).collect();
        assert_eq!(titles, ["MICCAI", "NeurIPS"]);

        replace_all(
            &mut conn,
            &parse_all(SAMPLE).unwrap(),
            "2026-11-21T00:00:00Z",
        )
        .unwrap();
        assert!(list(&conn, 3000).unwrap().conferences[1]
            .editions
            .is_empty());
    }

    #[test]
    fn a_conference_project_takes_the_rounds_deadline_and_the_dialogs_phases() {
        let mut conn = loaded();
        let p =
            create_project(&mut conn, &input(), &phases(), &nips(0), "2026-11-20", None).unwrap();
        let stage = &parse_all(SAMPLE).unwrap()[0].editions[0].stages[0];
        assert_eq!(p.name, "NeurIPS 2099");
        assert_eq!(p.deadline, local_day(stage.deadline_at.unwrap()));
        let modules = project_query::modules(&conn, p.id).unwrap();
        assert_eq!(modules.len(), 1);
        // The abstract deadline is the only task.
        let tasks = project_query::tasks(&conn, p.id).unwrap();
        assert_eq!(tasks.len(), 1);
        assert_eq!(tasks[0].title, "NeurIPS abstract");
        assert_eq!(tasks[0].due_date, local_day(stage.abstract_at.unwrap()));

        // The project knows its round; the list shows the edition taken.
        let round = project_round(&conn, p.id).unwrap().unwrap();
        assert_eq!((round.title.as_str(), round.stage), ("NeurIPS", 0));
        assert_eq!(round.edition.id, "nips99");
        let listed = &list(&conn, 2026).unwrap().conferences[1];
        assert_eq!(listed.editions[0].project_id, Some(p.id));

        // Again: the same project.
        let again = create_project(&mut conn, &input(), &[], &nips(0), "2026-11-20", None).unwrap();
        assert_eq!(again.id, p.id);

        // Deleting the project frees the edition.
        projects::delete(&mut conn, p.id).unwrap();
        assert_eq!(
            list(&conn, 2026).unwrap().conferences[1].editions[0].project_id,
            None
        );
        assert!(project_round(&conn, p.id).unwrap().is_none());
    }

    #[test]
    fn a_conference_project_from_an_idea_links_it_and_moves_its_todos() {
        let mut conn = loaded();
        let idea = crate::service::ideas::mutation::create(&mut conn, "Sparse attention").unwrap();
        crate::service::ideas::notes::add_todo(&conn, idea.id, "run baseline", None).unwrap();
        let p = create_project(
            &mut conn,
            &input(),
            &[],
            &nips(0),
            "2026-11-20",
            Some(idea.id),
        )
        .unwrap();
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
        let miccai = RoundRef {
            key: "miccai".into(),
            edition_id: "miccai99".into(),
            stage: 0,
        };
        assert!(create_project(&mut conn, &input(), &[], &miccai, "2026-11-20", None).is_err());
        assert!(create_project(&mut conn, &input(), &[], &nips(0), "2100-01-01", None).is_err());
        assert!(create_project(&mut conn, &input(), &[], &nips(5), "2026-11-20", None).is_err());
    }
}
