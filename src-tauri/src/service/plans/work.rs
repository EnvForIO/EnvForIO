//! Reading what the safety line needs from the database: projects with a
//! deadline or dated phases, and the estimated minutes per project and
//! phase (left, and done per day).
//!
//! Phases (user decision 2026-11-20): a module with an end date is a phase.
//! Its work is planned between the previous phase's end and its own, so a
//! project's time is split instead of spread evenly to the deadline. Work
//! outside dated phases is planned up to the project's deadline.
//!
//! Budgets: a phase can carry a time budget. Its tasks without an estimate
//! share what the estimated ones leave of it, so a phase can be planned
//! before every task is estimated. A budgeted phase with no tasks yet
//! counts its whole budget until its end date.

use std::collections::HashMap;

use chrono::{Duration, NaiveDate};
use rusqlite::Connection;

use crate::domain::day::day_of_timestamp;
use crate::domain::safety_line::ProjectWork;
use crate::errors::AppResult;

/// Where a task's work is planned: a dated phase (its module id), or the
/// project as a whole (None).
pub type Unit = Option<i64>;

pub struct Phase {
    pub module: i64,
    pub end: NaiveDate,
}

pub struct ProjectRow {
    pub id: i64,
    pub name: String,
    pub color: String,
    pub start: Option<NaiveDate>,
    pub deadline: Option<NaiveDate>,
    pub buffer_days: i64,
    pub phases: Vec<Phase>, // dated modules, earliest end first
}

pub fn parse_date(s: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()
}

/// Open projects that have a deadline or a dated phase (the ones with a safety line).
pub fn projects(conn: &Connection) -> AppResult<Vec<ProjectRow>> {
    let mut phases: HashMap<i64, Vec<Phase>> = HashMap::new();
    let mut stmt = conn.prepare(
        "SELECT project_id, id, end_date FROM modules
         WHERE end_date IS NOT NULL ORDER BY end_date, sort_order, id",
    )?;
    for row in stmt.query_map([], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, i64>(1)?,
            r.get::<_, String>(2)?,
        ))
    })? {
        let (project, module, end) = row?;
        if let Some(end) = parse_date(&end) {
            phases
                .entry(project)
                .or_default()
                .push(Phase { module, end });
        }
    }

    let mut stmt = conn.prepare(
        "SELECT id, name, color, start_date, deadline, buffer_days FROM projects
         WHERE is_archived = 0 ORDER BY id",
    )?;
    let rows = stmt.query_map([], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, Option<String>>(3)?,
            r.get::<_, Option<String>>(4)?,
            r.get::<_, i64>(5)?,
        ))
    })?;
    let mut out = Vec::new();
    for row in rows {
        let (id, name, color, start, deadline, buffer_days) = row?;
        let deadline = deadline.as_deref().and_then(parse_date);
        let phases = phases.remove(&id).unwrap_or_default();
        if deadline.is_none() && phases.is_empty() {
            continue;
        }
        out.push(ProjectRow {
            id,
            name,
            color,
            start: start.as_deref().and_then(parse_date),
            deadline,
            buffer_days,
            phases,
        });
    }
    Ok(out)
}

/// Estimated minutes per project and unit: still open, and done on each day.
pub struct Estimates {
    open: HashMap<(i64, Unit), i64>,
    done_on: HashMap<(NaiveDate, i64, Unit), i64>,
    /// A budgeted phase with no tasks yet: (project, module) -> (budget, end).
    untasked: HashMap<(i64, i64), (i64, Option<NaiveDate>)>,
    /// Open tasks per project, estimated or not.
    open_tasks: HashMap<i64, i64>,
}

struct TaskRow {
    project: i64,
    module: Option<i64>,
    estimate: Option<i64>,
    done_at: Option<String>,
    phase: bool, // its module has an end date
}

impl Estimates {
    pub fn load(conn: &Connection) -> AppResult<Self> {
        let mut stmt = conn.prepare(
            "SELECT t.project_id, t.module_id, t.estimate_minutes, t.done_at, m.end_date IS NOT NULL
             FROM tasks t LEFT JOIN modules m ON m.id = t.module_id
             WHERE t.project_id IS NOT NULL",
        )?;
        let tasks: Vec<TaskRow> = stmt
            .query_map([], |r| {
                Ok(TaskRow {
                    project: r.get(0)?,
                    module: r.get(1)?,
                    estimate: r.get(2)?,
                    done_at: r.get(3)?,
                    phase: r.get::<_, Option<bool>>(4)?.unwrap_or(false),
                })
            })?
            .collect::<Result<_, _>>()?;

        // What an unestimated task in a budgeted module counts for: the
        // budget the estimated tasks leave, shared out equally.
        let mut budgets: HashMap<i64, (i64, i64, Option<NaiveDate>)> = HashMap::new(); // module -> (project, budget, end)
        let mut stmt = conn.prepare(
            "SELECT id, project_id, budget_minutes, end_date FROM modules WHERE budget_minutes > 0",
        )?;
        for row in stmt.query_map([], |r| {
            Ok((
                r.get::<_, i64>(0)?,
                r.get::<_, i64>(1)?,
                r.get::<_, i64>(2)?,
                r.get::<_, Option<String>>(3)?,
            ))
        })? {
            let (module, project, budget, end) = row?;
            budgets.insert(
                module,
                (project, budget, end.as_deref().and_then(parse_date)),
            );
        }
        let mut share: HashMap<i64, i64> = HashMap::new();
        let mut untasked = HashMap::new();
        for (module, (project, budget, end)) in &budgets {
            let in_module = tasks.iter().filter(|t| t.module == Some(*module));
            let estimated: i64 = in_module.clone().filter_map(|t| t.estimate).sum();
            let unestimated = in_module.clone().filter(|t| t.estimate.is_none()).count() as i64;
            if in_module.count() == 0 {
                untasked.insert((*project, *module), (*budget, *end));
            } else if unestimated > 0 {
                share.insert(*module, (budget - estimated).max(0) / unestimated);
            }
        }

        let mut open: HashMap<(i64, Unit), i64> = HashMap::new();
        let mut done_on: HashMap<(NaiveDate, i64, Unit), i64> = HashMap::new();
        let mut open_tasks: HashMap<i64, i64> = HashMap::new();
        for t in &tasks {
            if t.done_at.is_none() {
                *open_tasks.entry(t.project).or_default() += 1;
            }
            let minutes = t
                .estimate
                .or_else(|| t.module.and_then(|m| share.get(&m).copied()));
            let Some(minutes) = minutes else {
                continue;
            };
            let unit = t.module.filter(|_| t.phase);
            match t.done_at.as_deref().map(day_of_timestamp) {
                None => *open.entry((t.project, unit)).or_default() += minutes,
                Some(Some(day)) => *done_on.entry((day, t.project, unit)).or_default() += minutes,
                Some(None) => {} // unreadable timestamp: ignore
            }
        }
        Ok(Self {
            open,
            done_on,
            untasked,
            open_tasks,
        })
    }

    /// Work left in one unit at the start of `day`: open tasks plus tasks
    /// finished on or after it, plus an untasked phase's budget until its end.
    pub fn remaining_in(&self, day: NaiveDate, project: i64, unit: Unit) -> i64 {
        let later: i64 = self
            .done_on
            .iter()
            .filter(|((d, p, u), _)| *p == project && *u == unit && *d >= day)
            .map(|(_, m)| m)
            .sum();
        let budget: i64 = self
            .untasked
            .iter()
            .filter(|((p, module), (_, end))| {
                *p == project && end.is_none_or(|end| day <= end) && unit == end.map(|_| *module)
            })
            .map(|(_, (minutes, _))| minutes)
            .sum();
        self.open.get(&(project, unit)).copied().unwrap_or(0) + later + budget
    }

    /// Minutes of one unit's tasks finished on `day`.
    pub fn done_in(&self, day: NaiveDate, project: i64, unit: Unit) -> i64 {
        self.done_on
            .get(&(day, project, unit))
            .copied()
            .unwrap_or(0)
    }

    pub fn done_on(&self, day: NaiveDate, project: i64) -> i64 {
        self.done_on
            .iter()
            .filter(|((d, p, _), _)| *d == day && *p == project)
            .map(|(_, m)| m)
            .sum()
    }

    pub fn done_on_day(&self, day: NaiveDate) -> i64 {
        self.done_on
            .iter()
            .filter(|((d, _, _), _)| *d == day)
            .map(|(_, m)| m)
            .sum()
    }

    pub fn open_tasks(&self, project: i64) -> i64 {
        self.open_tasks.get(&project).copied().unwrap_or(0)
    }
}

/// One project's units for the safety line on `day`: each dated phase in
/// its own window, then the rest of the project up to its deadline. They
/// all carry the project's id, so the allocation adds them up per project.
pub fn units_at(p: &ProjectRow, estimates: &Estimates, day: NaiveDate) -> Vec<(Unit, ProjectWork)> {
    let mut out = Vec::new();
    let mut from = p.start;
    for phase in &p.phases {
        // The buffer moves only a phase that ends with the project.
        let buffer = match p.deadline {
            Some(deadline) if phase.end >= deadline => p.buffer_days,
            _ => 0,
        };
        out.push((
            Some(phase.module),
            ProjectWork {
                id: p.id,
                start: from,
                deadline: phase.end,
                buffer_days: buffer,
                remaining: estimates.remaining_in(day, p.id, Some(phase.module)),
            },
        ));
        from = Some(phase.end + Duration::days(1));
    }
    if let Some(deadline) = p.deadline {
        out.push((
            None,
            ProjectWork {
                id: p.id,
                start: p.start,
                deadline,
                buffer_days: p.buffer_days,
                remaining: estimates.remaining_in(day, p.id, None),
            },
        ));
    }
    out
}

/// The safety line's input for `day`: every project's units.
pub fn work_at(rows: &[ProjectRow], estimates: &Estimates, day: NaiveDate) -> Vec<ProjectWork> {
    rows.iter()
        .flat_map(|p| units_at(p, estimates, day))
        .map(|(_, work)| work)
        .collect()
}
