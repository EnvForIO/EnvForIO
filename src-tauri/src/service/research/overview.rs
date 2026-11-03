//! The research overview: idea counts, ideas being worked on, upcoming
//! deadlines from ideas, projects and tasks, and the open todos and problems.

use chrono::{Days, NaiveDate};
use rusqlite::{params, Connection};
use serde::Serialize;
use specta::Type;

use crate::entity::idea::{Idea, IdeaStatus};
use crate::errors::{AppError, AppResult};
use crate::service::ideas::query::{self as ideas, IdeaFilter};

/// Ideas someone is working on right now.
const ACTIVE: [IdeaStatus; 3] = [
    IdeaStatus::Researching,
    IdeaStatus::InProgress,
    IdeaStatus::Writing,
];
/// Deadlines further back than this are not shown.
const OVERDUE_DAYS: u64 = 30;
const LIST_LIMIT: i64 = 20;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Type)]
pub enum DeadlineKind {
    Idea,
    Project,
    Task,
}

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Deadline {
    pub kind: DeadlineKind,
    pub id: i64,
    pub title: String,
    pub detail: String, // the venue of an idea, the project of a task
    pub date: String,
    pub days_left: i64, // negative when overdue
}

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct OpenTodo {
    pub id: i64,
    pub idea_id: i64,
    pub idea_title: String,
    pub title: String,
    pub due_date: Option<String>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct OpenProblem {
    pub id: i64,
    pub idea_id: i64,
    pub idea_title: String,
    pub problem: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ResearchOverview {
    pub by_status: Vec<(IdeaStatus, i64)>,
    pub unfinished: i64,
    pub open_todos: i64,    // in unfinished ideas
    pub open_problems: i64, // in unfinished ideas
    pub to_read: i64,
    pub active: Vec<Idea>,
    pub deadlines: Vec<Deadline>,
    pub todos: Vec<OpenTodo>,
    pub problems: Vec<OpenProblem>,
}

const UNFINISHED: &str = "i.status NOT IN ('Done', 'Dropped')";

fn date(text: &str) -> AppResult<NaiveDate> {
    NaiveDate::parse_from_str(text, "%Y-%m-%d")
        .map_err(|_| AppError::invalid(format!("bad date {text}")))
}

pub fn overview(conn: &Connection, today: &str) -> AppResult<ResearchOverview> {
    let counts = ideas::counts(conn)?;
    let count = |sql: &str| conn.query_row(sql, [], |r| r.get::<_, i64>(0));
    let open_todos = count(&format!(
        "SELECT count(*) FROM tasks d JOIN ideas i ON i.id = d.idea_id
         WHERE d.done_at IS NULL AND {UNFINISHED}"
    ))?;
    let open_problems = count(&format!(
        "SELECT count(*) FROM idea_problems p JOIN ideas i ON i.id = p.idea_id
         WHERE p.is_solved = 0 AND {UNFINISHED}"
    ))?;
    let to_read = count("SELECT count(*) FROM papers WHERE status = 'ToRead'")?;
    let active = ideas::list(
        conn,
        &IdeaFilter {
            unfinished: true,
            ..IdeaFilter::default()
        },
    )?
    .into_iter()
    .filter(|i| ACTIVE.contains(&i.status))
    .collect();
    Ok(ResearchOverview {
        by_status: counts.by_status,
        unfinished: counts.unfinished,
        open_todos,
        open_problems,
        to_read,
        active,
        deadlines: deadlines(conn, today)?,
        todos: todos(conn)?,
        problems: problems(conn)?,
    })
}

/// Idea, project and open-task deadlines from a month ago on, soonest first.
fn deadlines(conn: &Connection, today: &str) -> AppResult<Vec<Deadline>> {
    let today = date(today)?;
    let from = (today - Days::new(OVERDUE_DAYS)).to_string();
    let mut stmt = conn.prepare(
        "SELECT 'Idea', id, title, venue, deadline FROM ideas
           WHERE deadline >= ?1 AND status NOT IN ('Submitted', 'Done', 'Dropped')
         UNION ALL
         SELECT 'Project', id, name, '', deadline FROM projects
           WHERE deadline >= ?1 AND is_archived = 0
         UNION ALL
         SELECT 'Task', t.id, t.title, coalesce(p.name, i.title, ''), t.due_date
           FROM tasks t LEFT JOIN projects p ON p.id = t.project_id
                        LEFT JOIN ideas i ON i.id = t.idea_id
           WHERE t.due_date >= ?1 AND t.done_at IS NULL
         ORDER BY 5, 1, 2 LIMIT 40",
    )?;
    let rows = stmt.query_map(params![from], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, i64>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, String>(3)?,
            r.get::<_, String>(4)?,
        ))
    })?;
    let mut list = Vec::new();
    for row in rows {
        let (kind, id, title, detail, day) = row?;
        let kind = match kind.as_str() {
            "Idea" => DeadlineKind::Idea,
            "Project" => DeadlineKind::Project,
            _ => DeadlineKind::Task,
        };
        let days_left = (date(&day)? - today).num_days();
        list.push(Deadline {
            kind,
            id,
            title,
            detail,
            date: day,
            days_left,
        });
    }
    Ok(list)
}

/// Open todos of unfinished ideas, dated ones first.
fn todos(conn: &Connection) -> AppResult<Vec<OpenTodo>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT d.id, i.id, i.title, d.title, d.due_date
         FROM tasks d JOIN ideas i ON i.id = d.idea_id
         WHERE d.done_at IS NULL AND {UNFINISHED}
         ORDER BY d.due_date IS NULL, d.due_date, i.priority DESC, d.sort_order LIMIT ?1"
    ))?;
    let rows = stmt.query_map(params![LIST_LIMIT], |r| {
        Ok(OpenTodo {
            id: r.get(0)?,
            idea_id: r.get(1)?,
            idea_title: r.get(2)?,
            title: r.get(3)?,
            due_date: r.get(4)?,
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

/// Unsolved problems of unfinished ideas, newest first.
fn problems(conn: &Connection) -> AppResult<Vec<OpenProblem>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT p.id, i.id, i.title, p.problem
         FROM idea_problems p JOIN ideas i ON i.id = p.idea_id
         WHERE p.is_solved = 0 AND {UNFINISHED}
         ORDER BY p.created_at DESC, p.id DESC LIMIT ?1"
    ))?;
    let rows = stmt.query_map(params![LIST_LIMIT], |r| {
        Ok(OpenProblem {
            id: r.get(0)?,
            idea_id: r.get(1)?,
            idea_title: r.get(2)?,
            problem: r.get(3)?,
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}
