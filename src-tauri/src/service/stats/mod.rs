//! Statistics for a week, month or year: tasks done, timer time, completion
//! rate, active days, a trend, where time went, and the weekly rhythm.
//!
//! Days follow EnvForIO's day start, so a task finished at 01:00 counts for the
//! previous day. "Time" is timer time (time entries), credited to the day a
//! session ended.

pub mod range;

use std::collections::{BTreeMap, HashMap, HashSet};

use chrono::{Datelike, NaiveDate};
use rusqlite::{params, Connection};
use serde::Serialize;
use specta::Type;

use crate::domain::day::day_of_timestamp;
use crate::errors::{AppError, AppResult};
use crate::service::tasks::query::IN_DAYS;
use range::{bounds, Period};

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Bucket {
    pub key: String, // 'YYYY-MM-DD' (week, month) or 'YYYY-MM' (year)
    pub done: i64,
    pub minutes: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ProjectTime {
    pub project_id: Option<i64>, // None = not in a project
    pub name: Option<String>,
    pub color: Option<String>,
    pub minutes: i64,
    pub done: i64,
}

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Stats {
    pub from: String,
    pub to: String,
    pub done: i64,
    pub minutes: i64,
    pub planned: i64, // tasks with a day (My Day, scheduled or due) in the period
    pub planned_done: i64, // ... of which done: completion rate = planned_done / planned
    pub active_days: i64, // days with a finished task or timer time
    pub days: i64,    // days in the period
    pub trend: Vec<Bucket>,
    pub projects: Vec<ProjectTime>, // most time first
    pub weekdays: Vec<Bucket>,      // Monday first; key = 'mon'..'sun'
}

const WEEKDAYS: [&str; 7] = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"];

pub fn stats(conn: &Connection, period: Period, today: &str, offset: i32) -> AppResult<Stats> {
    let today = NaiveDate::parse_from_str(today, "%Y-%m-%d")
        .map_err(|_| AppError::invalid("not a date"))?;
    let (from, to) = bounds(period, today, offset);
    let in_range = |d: NaiveDate| d >= from && d <= to;
    let bucket = |d: NaiveDate| match period {
        Period::Year => format!("{:04}-{:02}", d.year(), d.month()),
        _ => d.to_string(),
    };

    // Every bucket, so empty days and months still show in the trend.
    let mut trend: BTreeMap<String, (i64, i64)> = BTreeMap::new();
    let mut day = from;
    while day <= to {
        trend.entry(bucket(day)).or_default();
        day = day.succ_opt().expect("dates go on");
    }
    let mut weekdays = [(0i64, 0i64); 7];
    let mut projects: HashMap<Option<i64>, (i64, i64)> = HashMap::new();
    let mut active: HashSet<NaiveDate> = HashSet::new();

    // Finished tasks
    let mut stmt =
        conn.prepare("SELECT project_id, done_at FROM tasks WHERE done_at IS NOT NULL")?;
    for row in stmt.query_map([], |r| {
        Ok((r.get::<_, Option<i64>>(0)?, r.get::<_, String>(1)?))
    })? {
        let (project, done_at) = row?;
        let Some(day) = day_of_timestamp(&done_at).filter(|d| in_range(*d)) else {
            continue;
        };
        trend.entry(bucket(day)).or_default().0 += 1;
        weekdays[day.weekday().num_days_from_monday() as usize].0 += 1;
        projects.entry(project).or_default().1 += 1;
        active.insert(day);
    }

    // Timer time
    let mut stmt = conn.prepare(
        "SELECT t.project_id, e.started_at, e.ended_at FROM time_entries e
         JOIN tasks t ON t.id = e.task_id WHERE e.ended_at IS NOT NULL",
    )?;
    for row in stmt.query_map([], |r| {
        Ok((
            r.get::<_, Option<i64>>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
        ))
    })? {
        let (project, started, ended) = row?;
        let Some(day) = day_of_timestamp(&ended).filter(|d| in_range(*d)) else {
            continue;
        };
        let minutes = session_minutes(&started, &ended);
        trend.entry(bucket(day)).or_default().1 += minutes;
        weekdays[day.weekday().num_days_from_monday() as usize].1 += minutes;
        projects.entry(project).or_default().0 += minutes;
        if minutes > 0 {
            active.insert(day);
        }
    }

    // Completion rate over tasks that had a day in the period.
    let (planned, planned_done): (i64, i64) = conn.query_row(
        &format!(
            "SELECT count(*), coalesce(sum(t.done_at IS NOT NULL), 0) FROM tasks t WHERE {IN_DAYS}"
        ),
        params![from.to_string(), to.to_string()],
        |r| Ok((r.get(0)?, r.get(1)?)),
    )?;

    let names = project_names(conn)?;
    let mut by_project: Vec<ProjectTime> = projects
        .into_iter()
        .map(|(id, (minutes, done))| {
            let (name, color) = id.and_then(|id| names.get(&id).cloned()).unzip();
            ProjectTime {
                project_id: id,
                name,
                color,
                minutes,
                done,
            }
        })
        .collect();
    by_project.sort_by(|a, b| b.minutes.cmp(&a.minutes).then(b.done.cmp(&a.done)));

    Ok(Stats {
        from: from.to_string(),
        to: to.to_string(),
        done: trend.values().map(|b| b.0).sum(),
        minutes: trend.values().map(|b| b.1).sum(),
        planned,
        planned_done,
        active_days: active.len() as i64,
        days: (to - from).num_days() + 1,
        trend: trend
            .into_iter()
            .map(|(key, (done, minutes))| Bucket { key, done, minutes })
            .collect(),
        projects: by_project,
        weekdays: WEEKDAYS
            .iter()
            .zip(weekdays)
            .map(|(key, (done, minutes))| Bucket {
                key: (*key).into(),
                done,
                minutes,
            })
            .collect(),
    })
}

fn session_minutes(started: &str, ended: &str) -> i64 {
    let parse = |s: &str| chrono::DateTime::parse_from_rfc3339(s).ok();
    match (parse(started), parse(ended)) {
        (Some(a), Some(b)) => ((b - a).num_seconds().max(0) + 30) / 60,
        _ => 0,
    }
}

fn project_names(conn: &Connection) -> AppResult<HashMap<i64, (String, String)>> {
    let mut stmt = conn.prepare("SELECT id, name, color FROM projects")?;
    let rows = stmt.query_map([], |r| Ok((r.get(0)?, (r.get(1)?, r.get(2)?))))?;
    Ok(rows.collect::<Result<_, _>>()?)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use crate::service::tasks::mutation::{create, create_due};
    use crate::service::tasks::query::TaskView;

    #[test]
    fn counts_done_tasks_time_and_completion_in_the_period() {
        let conn = open_in_memory();
        let a = create(&conn, "a", TaskView::MyDay, "2026-11-18").unwrap();
        create(&conn, "b", TaskView::MyDay, "2026-11-18").unwrap();
        create_due(&conn, "outside", "2026-12-05").unwrap();
        // Finished Wednesday afternoon local time (noon UTC is the same day in most zones).
        conn.execute(
            "UPDATE tasks SET done_at = '2026-11-18T12:00:00Z' WHERE id = ?1",
            params![a.id],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO time_entries (task_id, started_at, ended_at)
             VALUES (?1, '2026-11-18T10:00:00Z', '2026-11-18T11:30:00Z')",
            params![a.id],
        )
        .unwrap();

        let s = stats(&conn, Period::Week, "2026-11-19", 0).unwrap();
        assert_eq!(
            (s.from.as_str(), s.to.as_str(), s.days),
            ("2026-11-16", "2026-11-22", 7)
        );
        assert_eq!((s.done, s.minutes, s.active_days), (1, 90, 1));
        assert_eq!((s.planned, s.planned_done), (2, 1));
        assert_eq!(s.trend.len(), 7);
        assert_eq!(s.weekdays[2].key, "wed");
        assert_eq!(s.projects[0].project_id, None);

        let year = stats(&conn, Period::Year, "2026-11-19", 0).unwrap();
        assert_eq!(year.trend.len(), 12);
        assert_eq!(year.trend[10].key, "2026-11");
        assert_eq!(
            stats(&conn, Period::Week, "2026-11-19", -1).unwrap().done,
            0
        );
    }
}
