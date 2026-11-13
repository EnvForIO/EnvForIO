//! Reading what the safety line needs from the database: projects with a
//! deadline or dated phases, and the estimated minutes per project and
//! phase (left, and done per day).
//!
//! Phases (user decision 2026-11-20): a module with an end date is a phase.
//! Its work is planned between the previous phase's end and its own, so a
//! project's time is split instead of spread evenly to the deadline. Work
//! outside dated phases is planned up to the project's deadline.
//!
//! A task's own dates (user report 2026-11-21): a task planned for a day
//! ("Do on", today or later) is asked for on that day; a task due before
//! its phase or project ends is planned up to its due date. Either way its
//! minutes are no longer spread thin up to the deadline.
//!
//! Budgets: a phase can carry a time budget. Its tasks without an estimate
//! share what the estimated ones leave of it, so a phase can be planned
//! before every task is estimated. A budgeted phase with no tasks yet
//! counts its whole budget until its end date.

use std::collections::{BTreeSet, HashMap};

use chrono::{Duration, NaiveDate};
use rusqlite::Connection;
use serde::Serialize;
use specta::Type;

use crate::domain::day::day_of_timestamp;
use crate::domain::safety_line::ProjectWork;
use crate::errors::AppResult;

/// Where a task's work is planned: a dated phase (its module id), or the
/// project as a whole (None).
pub type Unit = Option<i64>;

pub struct Phase {
    pub module: i64,
    pub name: String,
    pub end: NaiveDate,
}

/// What a piece of planned work has to be finished by, so the UI can say
/// why a day is full ("for phase Method, ending Sun, Nov 22").
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Type)]
pub enum LimitKind {
    Deadline, // the project's own deadline (minus finish-early days)
    Phase,    // a dated phase's end
    Due,      // tasks due on a day before their phase or project ends
    DoOn,     // tasks planned for one day
}

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Limit {
    pub kind: LimitKind,
    pub name: String, // the phase's name; "" for the other kinds
    pub date: String, // the day the work must be done by, 'YYYY-MM-DD'
}

impl Limit {
    fn new(kind: LimitKind, name: &str, date: NaiveDate) -> Self {
        Self {
            kind,
            name: name.to_string(),
            date: date.to_string(),
        }
    }
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
        "SELECT project_id, id, end_date, name FROM modules
         WHERE end_date IS NOT NULL ORDER BY end_date, sort_order, id",
    )?;
    for row in stmt.query_map([], |r| {
        Ok((
            r.get::<_, i64>(0)?,
            r.get::<_, i64>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, String>(3)?,
        ))
    })? {
        let (project, module, end, name) = row?;
        if let Some(end) = parse_date(&end) {
            phases
                .entry(project)
                .or_default()
                .push(Phase { module, name, end });
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

/// A task's own dates, which can pull its work out of its unit's window.
#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, PartialOrd, Ord)]
struct Due {
    on: Option<NaiveDate>,  // planned for this day ("Do on")
    due: Option<NaiveDate>, // due by this day
}

/// Estimated minutes per project, unit and due date: still open, and done on each day.
pub struct Estimates {
    open: HashMap<(i64, Unit, Due), i64>,
    done_on: HashMap<(NaiveDate, i64, Unit, Due), i64>,
    /// A budgeted phase with no tasks yet: (project, module) -> (budget, end).
    untasked: HashMap<(i64, i64), (i64, Option<NaiveDate>)>,
    /// Per project, estimated or not: (tasks, open tasks).
    task_counts: HashMap<i64, (i64, i64)>,
}

struct TaskRow {
    project: i64,
    module: Option<i64>,
    estimate: Option<i64>,
    done_at: Option<String>,
    due: Due,
    phase: bool, // its module has an end date
}

impl Estimates {
    pub fn load(conn: &Connection) -> AppResult<Self> {
        let mut stmt = conn.prepare(
            "SELECT t.project_id, t.module_id, t.estimate_minutes, t.done_at, m.end_date IS NOT NULL,
                    t.due_date, t.scheduled_date
             FROM tasks t LEFT JOIN modules m ON m.id = t.module_id
             WHERE t.project_id IS NOT NULL",
        )?;
        let date = |s: Option<String>| s.as_deref().and_then(parse_date);
        let tasks: Vec<TaskRow> = stmt
            .query_map([], |r| {
                Ok(TaskRow {
                    project: r.get(0)?,
                    module: r.get(1)?,
                    estimate: r.get(2)?,
                    done_at: r.get(3)?,
                    phase: r.get::<_, Option<bool>>(4)?.unwrap_or(false),
                    due: Due {
                        due: date(r.get(5)?),
                        on: date(r.get(6)?),
                    },
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

        let mut open: HashMap<(i64, Unit, Due), i64> = HashMap::new();
        let mut done_on: HashMap<(NaiveDate, i64, Unit, Due), i64> = HashMap::new();
        let mut task_counts: HashMap<i64, (i64, i64)> = HashMap::new();
        for t in &tasks {
            let counts = task_counts.entry(t.project).or_default();
            counts.0 += 1;
            counts.1 += i64::from(t.done_at.is_none());
            let minutes = t
                .estimate
                .or_else(|| t.module.and_then(|m| share.get(&m).copied()));
            let Some(minutes) = minutes else {
                continue;
            };
            let unit = t.module.filter(|_| t.phase);
            match t.done_at.as_deref().map(day_of_timestamp) {
                None => *open.entry((t.project, unit, t.due)).or_default() += minutes,
                Some(Some(day)) => {
                    *done_on.entry((day, t.project, unit, t.due)).or_default() += minutes
                }
                Some(None) => {} // unreadable timestamp: ignore
            }
        }
        Ok(Self {
            open,
            done_on,
            untasked,
            task_counts,
        })
    }

    /// Work left in one unit's tasks due on `due` (None = undated) at the
    /// start of `day`: open tasks plus tasks finished later, plus tasks
    /// finished on `day` itself when `with_today` (today's line counts them,
    /// so finishing work does not lower it; health does not).
    fn remaining(
        &self,
        day: NaiveDate,
        project: i64,
        unit: Unit,
        due: Due,
        with_today: bool,
    ) -> i64 {
        let later: i64 = self
            .done_on
            .iter()
            .filter(|((d, p, u, du), _)| {
                *p == project && *u == unit && *du == due && (*d > day || (with_today && *d == day))
            })
            .map(|(_, m)| m)
            .sum();
        self.open.get(&(project, unit, due)).copied().unwrap_or(0) + later
    }

    /// An untasked budgeted phase's budget in `unit` on `day` (until its end).
    fn budget(&self, day: NaiveDate, project: i64, unit: Unit) -> i64 {
        self.untasked
            .iter()
            .filter(|((p, module), (_, end))| {
                *p == project && end.is_none_or(|end| day <= end) && unit == end.map(|_| *module)
            })
            .map(|(_, (minutes, _))| minutes)
            .sum()
    }

    /// The due dates a unit's tasks have (None for undated ones).
    fn dues(&self, project: i64, unit: Unit) -> BTreeSet<Due> {
        let open = self.open.keys().map(|(p, u, due)| (*p, *u, *due));
        let done = self.done_on.keys().map(|(_, p, u, due)| (*p, *u, *due));
        open.chain(done)
            .filter(|(p, u, _)| *p == project && *u == unit)
            .map(|(_, _, due)| due)
            .collect()
    }

    pub fn done_on(&self, day: NaiveDate, project: i64) -> i64 {
        self.done_on
            .iter()
            .filter(|((d, p, _, _), _)| *d == day && *p == project)
            .map(|(_, m)| m)
            .sum()
    }

    pub fn done_on_day(&self, day: NaiveDate) -> i64 {
        self.done_on
            .iter()
            .filter(|((d, _, _, _), _)| *d == day)
            .map(|(_, m)| m)
            .sum()
    }

    /// Every task is finished, and there is at least one: a project with no
    /// tasks yet is not done, only not planned.
    pub fn all_done(&self, project: i64) -> bool {
        self.task_counts
            .get(&project)
            .is_some_and(|(tasks, open)| *tasks > 0 && *open == 0)
    }
}

/// One unit's work, split by the tasks' own dates (user report 2026-11-21):
/// a task planned for a day still to come ("Do on") is asked for on that
/// day; a task due before the unit's target gets a window ending on its due
/// date (200 minutes due tomorrow are done by tomorrow, not spread to the
/// deadline); the rest share the unit's window. A planned day that has
/// passed unfinished no longer counts, as in "To schedule".
fn split_by_due(
    estimates: &Estimates,
    p: &ProjectRow,
    unit: Unit,
    (limit, window): (Limit, ProjectWork),
    day: NaiveDate,
    with_today: bool,
) -> Vec<(Limit, ProjectWork)> {
    let target = window.deadline - Duration::days(window.buffer_days);
    let mut out = Vec::new();
    let mut rest = estimates.budget(day, p.id, unit);
    for dates in estimates.dues(p.id, unit) {
        let minutes = estimates.remaining(day, p.id, unit, dates, with_today);
        match (dates.on, dates.due) {
            (Some(on), _) if on >= day => out.push((
                Limit::new(LimitKind::DoOn, "", on),
                ProjectWork {
                    start: Some(on),
                    deadline: on,
                    buffer_days: 0,
                    remaining: minutes,
                    ..window.clone()
                },
            )),
            (_, Some(due)) if due < target => out.push((
                Limit::new(LimitKind::Due, "", due),
                ProjectWork {
                    deadline: due,
                    buffer_days: 0,
                    remaining: minutes,
                    ..window.clone()
                },
            )),
            _ => rest += minutes,
        }
    }
    out.push((
        limit,
        ProjectWork {
            remaining: rest,
            ..window
        },
    ));
    out
}

/// One project's units for the safety line on `day`: each dated phase in
/// its own window, then the rest of the project up to its deadline, and
/// within each, tasks due earlier in windows of their own. They all carry
/// the project's id, so the allocation adds them up per project.
/// `with_today`: count work finished today as still left (today's line).
/// Each unit comes with what it must be finished by.
pub fn units_at(
    p: &ProjectRow,
    estimates: &Estimates,
    day: NaiveDate,
    with_today: bool,
) -> Vec<(Limit, ProjectWork)> {
    let mut windows = Vec::new();
    let mut from = p.start;
    let mut previous: Option<(Option<NaiveDate>, NaiveDate)> = None; // (from, end)
    for phase in &p.phases {
        // Phases ending on the same day share a window; starting the second
        // one the day after the first ended would leave it no days at all
        // (user report 2026-11-21: 37h piled onto today).
        if let Some((prev_from, prev_end)) = previous {
            from = if prev_end < phase.end {
                Some(prev_end + Duration::days(1))
            } else {
                prev_from
            };
        }
        // The buffer moves only a phase that ends with the project.
        let buffer = match p.deadline {
            Some(deadline) if phase.end >= deadline => p.buffer_days,
            _ => 0,
        };
        windows.push((
            Some(phase.module),
            Limit::new(LimitKind::Phase, &phase.name, phase.end),
            ProjectWork {
                id: p.id,
                start: from,
                deadline: phase.end,
                buffer_days: buffer,
                remaining: 0,
            },
        ));
        previous = Some((from, phase.end));
    }
    if let Some(deadline) = p.deadline {
        let target = deadline - Duration::days(p.buffer_days);
        windows.push((
            None,
            Limit::new(LimitKind::Deadline, "", target),
            ProjectWork {
                id: p.id,
                start: p.start,
                deadline,
                buffer_days: p.buffer_days,
                remaining: 0,
            },
        ));
    }
    windows
        .into_iter()
        .flat_map(|(unit, limit, window)| {
            split_by_due(estimates, p, unit, (limit, window), day, with_today)
        })
        .collect()
}

/// The safety line's input for `day`: every project's units.
pub fn work_at(rows: &[ProjectRow], estimates: &Estimates, day: NaiveDate) -> Vec<ProjectWork> {
    rows.iter()
        .flat_map(|p| units_at(p, estimates, day, true))
        .map(|(_, work)| work)
        .collect()
}
