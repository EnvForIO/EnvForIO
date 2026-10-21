//! Reading what the safety line needs from the database: projects with a
//! deadline, and the estimated minutes per project (left, and done per day).
//! Only tasks in a project with an estimate count.

use std::collections::HashMap;

use chrono::NaiveDate;
use rusqlite::Connection;

use crate::domain::day::day_of_timestamp;
use crate::domain::safety_line::ProjectWork;
use crate::errors::AppResult;

pub struct ProjectRow {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub start: Option<NaiveDate>,
    pub deadline: NaiveDate,
    pub buffer_days: i64,
}

impl ProjectRow {
    /// Deadline minus buffer: the date the plan aims for.
    pub fn plan_date(&self) -> NaiveDate {
        self.deadline - chrono::Duration::days(self.buffer_days)
    }
}

pub fn parse_date(s: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()
}

/// Open projects that have a deadline (the ones with a safety line).
pub fn projects(conn: &Connection) -> AppResult<Vec<ProjectRow>> {
    let mut stmt = conn.prepare(
        "SELECT id, name, color, start_date, deadline, buffer_days FROM projects
         WHERE is_archived = 0 AND deadline IS NOT NULL ORDER BY id",
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
    let mut out = Vec::new();
    for row in rows {
        let (id, name, color, start, deadline, buffer_days) = row?;
        if let Some(deadline) = parse_date(&deadline) {
            let start = start.as_deref().and_then(parse_date);
            out.push(ProjectRow {
                id,
                name,
                color,
                start,
                deadline,
                buffer_days,
            });
        }
    }
    Ok(out)
}

/// Estimated minutes per project: still open, and done on each day.
pub struct Estimates {
    open: HashMap<i64, i64>,
    done_on: HashMap<(NaiveDate, i64), i64>,
}

impl Estimates {
    pub fn load(conn: &Connection) -> AppResult<Self> {
        let mut open: HashMap<i64, i64> = HashMap::new();
        let mut done_on: HashMap<(NaiveDate, i64), i64> = HashMap::new();
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
            match done_at.as_deref().map(day_of_timestamp) {
                None => *open.entry(project).or_default() += minutes,
                Some(Some(day)) => *done_on.entry((day, project)).or_default() += minutes,
                Some(None) => {} // unreadable timestamp: ignore
            }
        }
        Ok(Self { open, done_on })
    }

    /// Work left at the start of `day`: open tasks plus tasks finished on or after it.
    pub fn remaining_at(&self, day: NaiveDate, project: i64) -> i64 {
        let later: i64 = self
            .done_on
            .iter()
            .filter(|((d, p), _)| *p == project && *d >= day)
            .map(|(_, m)| m)
            .sum();
        self.open.get(&project).copied().unwrap_or(0) + later
    }

    pub fn done_on(&self, day: NaiveDate, project: i64) -> i64 {
        self.done_on.get(&(day, project)).copied().unwrap_or(0)
    }

    pub fn done_on_day(&self, day: NaiveDate) -> i64 {
        self.done_on
            .iter()
            .filter(|((d, _), _)| *d == day)
            .map(|(_, m)| m)
            .sum()
    }
}

/// The safety line's input for `day`: each project with the work left at its start.
pub fn work_at(rows: &[ProjectRow], estimates: &Estimates, day: NaiveDate) -> Vec<ProjectWork> {
    rows.iter()
        .map(|p| ProjectWork {
            id: p.id,
            start: p.start,
            deadline: p.deadline,
            buffer_days: p.buffer_days,
            remaining: estimates.remaining_at(day, p.id),
        })
        .collect()
}
