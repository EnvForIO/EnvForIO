//! Today's safety line: gathers projects, estimates and capacity from the
//! database and hands them to `domain::safety_line`.
//!
//! The line is computed from the work left *at the start of today*: tasks
//! finished today still count as remaining. So finishing work does not lower
//! today's line; only changing the plan (estimates, dates, capacity) does.
//! Projects without a deadline have no line.

use std::collections::HashMap;

use chrono::{DateTime, Local, NaiveDate};
use rusqlite::Connection;
use serde::Serialize;
use specta::Type;

use crate::domain::day::{day_of, DEFAULT_DAY_START};
use crate::domain::safety_line::{allocate, Options, ProjectWork};
use crate::errors::{AppError, AppResult};
use crate::service::capacity::CapacityTable;

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ProjectLine {
    pub project_id: i64,
    pub name: String,
    pub color: String,
    pub minutes: i64,      // what the line asks for today
    pub done_minutes: i64, // estimates of this project's tasks finished today
}

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TodayLine {
    pub date: String,
    pub minutes: i64,
    pub done_minutes: i64,
    pub capacity: Option<i64>, // today's available minutes; None = no limit
    pub projects: Vec<ProjectLine>,
}

fn parse_date(s: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()
}

/// The EnvIO day a UTC `done_at` timestamp falls on, in local time.
fn done_day(done_at: &str) -> Option<NaiveDate> {
    let utc = DateTime::parse_from_rfc3339(done_at).ok()?;
    Some(day_of(
        utc.with_timezone(&Local).naive_local(),
        DEFAULT_DAY_START,
    ))
}

pub fn today_line(conn: &Connection, today: &str) -> AppResult<TodayLine> {
    let today_date = parse_date(today).ok_or_else(|| AppError::invalid("not a date"))?;

    // Remaining (at day start) and done-today minutes per project.
    let mut remaining: HashMap<i64, i64> = HashMap::new();
    let mut done_today: HashMap<i64, i64> = HashMap::new();
    let mut stmt = conn.prepare(
        "SELECT project_id, estimate_minutes, done_at FROM tasks
         WHERE project_id IS NOT NULL AND estimate_minutes IS NOT NULL",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, i64>(1)?,
            r.get::<_, Option<String>>(2)?,
        ))
    })?;
    for row in rows {
        let (project, minutes, done_at) = row?;
        match done_at.as_deref().map(done_day) {
            None => *remaining.entry(project).or_default() += minutes,
            Some(Some(day)) if day == today_date => {
                *remaining.entry(project).or_default() += minutes;
                *done_today.entry(project).or_default() += minutes;
            }
            Some(_) => {} // done on an earlier day
        }
    }

    let mut names: HashMap<i64, (String, String)> = HashMap::new();
    let mut work = Vec::new();
    let mut stmt = conn.prepare(
        "SELECT id, name, color, start_date, deadline, buffer_days FROM projects
         WHERE is_archived = 0 AND deadline IS NOT NULL",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, Option<String>>(3)?,
            r.get::<_, String>(4)?,
            r.get::<_, i64>(5)?,
        ))
    })?;
    for row in rows {
        let (id, name, color, start, deadline, buffer_days) = row?;
        let Some(deadline) = parse_date(&deadline) else {
            continue;
        };
        names.insert(id, (name, color));
        work.push(ProjectWork {
            id,
            start: start.as_deref().and_then(parse_date),
            deadline,
            buffer_days,
            remaining: remaining.get(&id).copied().unwrap_or(0),
        });
    }

    let capacity = CapacityTable::load(conn)?;
    let alloc = allocate(today_date, &work, &|d| capacity.on(d), Options::default());

    let mut projects: Vec<ProjectLine> = names
        .into_iter()
        .map(|(id, (name, color))| ProjectLine {
            project_id: id,
            name,
            color,
            minutes: alloc.get(&(today_date, id)).copied().unwrap_or(0),
            done_minutes: done_today.get(&id).copied().unwrap_or(0),
        })
        .filter(|p| p.minutes > 0 || p.done_minutes > 0)
        .collect();
    projects.sort_by(|a, b| {
        b.minutes
            .cmp(&a.minutes)
            .then(a.project_id.cmp(&b.project_id))
    });

    Ok(TodayLine {
        date: today.to_string(),
        minutes: projects.iter().map(|p| p.minutes).sum(),
        done_minutes: projects.iter().map(|p| p.done_minutes).sum(),
        capacity: capacity.on(today_date),
        projects,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use crate::service::projects::mutation::{self as projects, ProjectInput};
    use crate::service::tasks::mutation::set_done;

    #[test]
    fn finishing_work_today_does_not_lower_the_line() {
        let mut conn = open_in_memory();
        let today = crate::domain::day::today();
        let deadline = (parse_date(&today).unwrap() + chrono::Duration::days(1)).to_string();
        let input = ProjectInput {
            name: "paper".into(),
            color: "#3b82f6".into(),
            start_date: None,
            deadline: Some(deadline),
            buffer_days: 0,
            is_archived: false,
        };
        let p = projects::create(&mut conn, &input, "blank").unwrap();
        let a = projects::add_task(&conn, p.id, None, "a", &Some("2h".into())).unwrap();
        projects::add_task(&conn, p.id, None, "b", &Some("2h".into())).unwrap();

        // 4h over today and tomorrow, levelled: 2h today.
        let before = today_line(&conn, &today).unwrap();
        assert_eq!((before.minutes, before.done_minutes), (120, 0));

        set_done(&conn, a.id, true).unwrap();
        let after = today_line(&conn, &today).unwrap();
        assert_eq!((after.minutes, after.done_minutes), (120, 120));
        assert_eq!(after.projects[0].name, "paper");
    }
}
