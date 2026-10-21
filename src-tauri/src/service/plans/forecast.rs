//! Looking ahead: the load on each of the next days, and each project's
//! health once estimates are calibrated by how long work really took.
//!
//! Calibration: ratio = actual / estimated time over finished tasks that have
//! both. A project uses its own ratio once it has 3 such tasks, otherwise the
//! overall ratio (again from 3 tasks), otherwise 1.

use std::collections::HashMap;

use chrono::{Duration, NaiveDate};
use rusqlite::Connection;
use serde::Serialize;
use specta::Type;

use super::work::{parse_date, projects, work_at, Estimates, ProjectRow};
use crate::domain::safety_line::allocate;
use crate::errors::{AppError, AppResult};
use crate::service::capacity::CapacityTable;
use crate::service::settings;

const MIN_SAMPLES: i64 = 3;

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ForecastDay {
    pub date: String,
    pub minutes: i64,          // planned project work that day
    pub capacity: Option<i64>, // available minutes; None = no limit
}

pub fn load_forecast(conn: &Connection, today: &str, days: i64) -> AppResult<Vec<ForecastDay>> {
    let start = parse_date(today).ok_or_else(|| AppError::invalid("not a date"))?;
    let estimates = Estimates::load(conn)?;
    let capacity = CapacityTable::load(conn)?;
    let options = settings::load(conn)?.options();
    let work = work_at(&projects(conn)?, &estimates, start);
    let alloc = allocate(start, &work, &|d| capacity.on(d), options);
    Ok((0..days)
        .map(|i| {
            let day = start + Duration::days(i);
            ForecastDay {
                date: day.to_string(),
                minutes: alloc
                    .range((day, i64::MIN)..=(day, i64::MAX))
                    .map(|(_, m)| m)
                    .sum(),
                capacity: capacity.on(day),
            }
        })
        .collect())
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Type)]
pub enum Health {
    Done,    // nothing estimated is left
    OnTrack, // needs well under the available time
    Tight,   // needs more than 80% of the available time
    Behind,  // needs more than the available time
    Overdue, // past the deadline with work left
}

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ProjectHealth {
    pub project_id: i64,
    pub ratio: f64,                  // actual / estimate used for this project
    pub samples: i64,                // finished tasks behind the ratio (0 = default 1.0)
    pub remaining: i64,              // estimated minutes left
    pub predicted_remaining: i64,    // remaining × ratio
    pub needed_per_day: Option<i64>, // predicted remaining / work days left
    pub health: Health,
}

/// (sum of actual, sum of estimate, count) per project, over finished tasks with both.
fn samples(conn: &Connection) -> AppResult<HashMap<i64, (i64, i64, i64)>> {
    let mut stmt = conn.prepare(
        "SELECT project_id, sum(actual_minutes), sum(estimate_minutes), count(*) FROM tasks
         WHERE project_id IS NOT NULL AND done_at IS NOT NULL
           AND actual_minutes > 0 AND estimate_minutes > 0
         GROUP BY project_id",
    )?;
    let rows = stmt.query_map([], |r| Ok((r.get(0)?, (r.get(1)?, r.get(2)?, r.get(3)?))))?;
    Ok(rows.collect::<Result<_, _>>()?)
}

fn health_of(
    p: &ProjectRow,
    today: NaiveDate,
    remaining: i64,
    ratio: f64,
    capacity: &CapacityTable,
) -> (Option<i64>, Health) {
    let predicted = (remaining as f64 * ratio).round() as i64;
    if remaining == 0 {
        return (None, Health::Done);
    }
    if today > p.deadline {
        return (Some(predicted), Health::Overdue);
    }
    let target = if today <= p.plan_date() {
        p.plan_date()
    } else {
        p.deadline
    };
    let days: Vec<_> = (0..=(target - today).num_days())
        .map(|i| today + Duration::days(i))
        .filter(|d| capacity.on(*d) != Some(0))
        .collect();
    let needed = predicted / (days.len() as i64).max(1);
    let limits: Vec<i64> = days.iter().filter_map(|d| capacity.on(*d)).collect();
    if limits.len() < days.len() || limits.is_empty() {
        return (Some(needed), Health::OnTrack); // some days have no limit: it always fits
    }
    let average = limits.iter().sum::<i64>() / limits.len() as i64;
    let health = if needed > average {
        Health::Behind
    } else if needed * 5 > average * 4 {
        Health::Tight
    } else {
        Health::OnTrack
    };
    (Some(needed), health)
}

pub fn project_health(conn: &Connection, today: &str) -> AppResult<Vec<ProjectHealth>> {
    let today = parse_date(today).ok_or_else(|| AppError::invalid("not a date"))?;
    let estimates = Estimates::load(conn)?;
    let capacity = CapacityTable::load(conn)?;
    let per_project = samples(conn)?;
    let (all_actual, all_estimate, all_count) = per_project
        .values()
        .fold((0, 0, 0), |(a, e, c), (pa, pe, pc)| {
            (a + pa, e + pe, c + pc)
        });
    let overall = (all_count >= MIN_SAMPLES).then(|| all_actual as f64 / all_estimate as f64);

    Ok(projects(conn)?
        .iter()
        .map(|p| {
            let (ratio, samples) = match per_project.get(&p.id) {
                Some((a, e, c)) if *c >= MIN_SAMPLES => (*a as f64 / *e as f64, *c),
                _ => overall.map_or((1.0, 0), |r| (r, all_count)),
            };
            let remaining = estimates.remaining_at(today, p.id) - estimates.done_on(today, p.id);
            let (needed_per_day, health) = health_of(p, today, remaining, ratio, &capacity);
            ProjectHealth {
                project_id: p.id,
                ratio,
                samples,
                remaining,
                predicted_remaining: (remaining as f64 * ratio).round() as i64,
                needed_per_day,
                health,
            }
        })
        .collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use crate::service::capacity::set_weekday;
    use crate::service::projects::mutation::{self as projects, ProjectInput};
    use rusqlite::params;

    fn project(conn: &mut Connection, deadline: &str) -> i64 {
        let input = ProjectInput {
            name: "p".into(),
            color: "#3b82f6".into(),
            start_date: None,
            deadline: Some(deadline.into()),
            buffer_days: 0,
            is_archived: false,
        };
        projects::create(conn, &input, "blank").unwrap().id
    }

    #[test]
    fn forecast_spreads_work_over_the_coming_days() {
        let mut conn = open_in_memory();
        let p = project(&mut conn, "2026-11-23");
        projects::add_task(&conn, p, None, "a", &Some("4h".into())).unwrap();
        let days = load_forecast(&conn, "2026-11-20", 14).unwrap();
        assert_eq!(days.len(), 14);
        assert_eq!(days.iter().map(|d| d.minutes).sum::<i64>(), 240);
        assert_eq!(days[0].minutes, 60); // four days, an hour each
        assert_eq!(days[5].minutes, 0);
    }

    #[test]
    fn slow_projects_are_calibrated_and_can_fall_behind() {
        let mut conn = open_in_memory();
        for weekday in 0..7 {
            set_weekday(&conn, weekday, Some(60)).unwrap(); // one hour every day
        }
        let p = project(&mut conn, "2026-11-22");
        // Three finished tasks that each took twice their estimate.
        for _ in 0..3 {
            let t = projects::add_task(&conn, p, None, "done", &Some("30m".into())).unwrap();
            conn.execute(
                "UPDATE tasks SET actual_minutes = 60, done_at = '2026-11-01T12:00:00Z' WHERE id = ?1",
                params![t.id],
            )
            .unwrap();
        }
        projects::add_task(&conn, p, None, "left", &Some("1h30m".into())).unwrap();

        let h = &project_health(&conn, "2026-11-20").unwrap()[0];
        assert_eq!((h.ratio, h.samples), (2.0, 3));
        assert_eq!((h.remaining, h.predicted_remaining), (90, 180));
        // 3h over three one-hour days: exactly full, so Tight rather than Behind.
        assert_eq!((h.needed_per_day, h.health), (Some(60), Health::Tight));

        let late = &project_health(&conn, "2026-11-23").unwrap()[0];
        assert_eq!(late.health, Health::Overdue);
    }
}
