//! Looking ahead: the load on each of the next days, and each project's
//! health once estimates are calibrated by how long work really took.
//!
//! Calibration: ratio = actual / estimated time over finished tasks that have
//! both. A project uses its own ratio once it has 3 such tasks, otherwise the
//! overall ratio (again from 3 tasks), otherwise 1.
//!
//! Health is judged per phase (user decision 2026-11-20): a project is as
//! bad as its worst phase, so experiments running late show up weeks before
//! the paper deadline. A phase whose end has passed with work left is
//! Behind; only the project's own deadline makes it Overdue.

use std::collections::HashMap;

use chrono::{Duration, NaiveDate};
use rusqlite::Connection;
use serde::Serialize;
use specta::Type;

use super::work::{parse_date, projects, units_at, work_at, Estimates, Limit};
use crate::domain::safety_line::{allocate, window, ProjectWork};
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

/// Ordered from best to worst, so the worst phase is the max.
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Serialize, Type)]
pub enum Health {
    Done,        // every task finished (and there is at least one)
    Unestimated, // no tasks yet, or open ones without estimates or budgets
    NoDailyTime, // no available time set for the days it needs: cannot judge
    OnTrack,     // needs well under the available time
    Tight,       // needs more than 80% of the available time
    Behind, // needs more than the available time (or than a day holds), or a phase ended with work left
    Overdue, // past the deadline with work left
}

/// More than this a day cannot be done, whatever time is set (user report
/// 2026-11-21: "On track" next to a 40-hour day).
const DAY_MINUTES: i64 = 24 * 60;

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ProjectHealth {
    pub project_id: i64,
    pub ratio: f64,                  // actual / estimate used for this project
    pub samples: i64,                // finished tasks behind the ratio (0 = default 1.0)
    pub remaining: i64,              // estimated minutes left
    pub predicted_remaining: i64,    // remaining × ratio
    pub needed_per_day: Option<i64>, // in the part that decides the health
    pub health: Health,
    /// What the part that decides the health must be finished by.
    pub limit: Option<Limit>,
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

/// One unit's minutes needed per day and health. `last` = it ends with the
/// project, so running past it is Overdue rather than Behind.
fn unit_health(
    unit: &ProjectWork,
    today: NaiveDate,
    predicted: i64,
    last: bool,
    capacity: &CapacityTable,
) -> (i64, Health) {
    if today > unit.deadline {
        let late = if last {
            Health::Overdue
        } else {
            Health::Behind
        };
        return (predicted, late);
    }
    let days = window(unit, today, 1.0, &|d| capacity.on(d));
    let needed = predicted / (days.len() as i64).max(1);
    if needed > DAY_MINUTES {
        return (needed, Health::Behind); // no day holds that, time set or not
    }
    let limits: Vec<i64> = days.iter().filter_map(|d| capacity.on(*d)).collect();
    if limits.is_empty() {
        // Without the user's time there is nothing to compare with; saying
        // "On track" here was what made the badge meaningless.
        return (needed, Health::NoDailyTime);
    }
    if limits.len() < days.len() {
        return (needed, Health::OnTrack); // some days have no limit: it fits there
    }
    let average = limits.iter().sum::<i64>() / limits.len() as i64;
    let health = if needed > average {
        Health::Behind
    } else if needed * 5 > average * 4 {
        Health::Tight
    } else {
        Health::OnTrack
    };
    (needed, health)
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
            // Work done today is not left, unlike in today's line.
            let units = units_at(p, &estimates, today, false);
            let remaining: i64 = units.iter().map(|(_, u)| u.remaining).sum();
            // The worst part decides; among equally bad ones, the one that
            // needs the most a day (it used to pick the smallest need).
            let worst = units
                .iter()
                .filter(|(_, u)| u.remaining > 0)
                .map(|(limit, u)| {
                    let predicted = (u.remaining as f64 * ratio).round() as i64;
                    let last = p.deadline.is_none_or(|d| u.deadline >= d);
                    let (needed, health) = unit_health(u, today, predicted, last, &capacity);
                    (health, needed, std::cmp::Reverse(u.deadline), limit)
                })
                .max_by(|a, b| (a.0, a.1, a.2).cmp(&(b.0, b.1, b.2)));
            let (needed_per_day, health, limit) = match worst {
                Some((health, needed, _, limit)) => (Some(needed), health, Some(limit.clone())),
                None if estimates.all_done(p.id) => (None, Health::Done, None),
                None => (None, Health::Unestimated, None),
            };
            ProjectHealth {
                project_id: p.id,
                ratio,
                samples,
                remaining,
                predicted_remaining: (remaining as f64 * ratio).round() as i64,
                needed_per_day,
                health,
                limit,
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
        projects::create(conn, &input, "blank", None).unwrap().id
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

    /// A conference project from 2026-11-20 to 12-20, its phases ending
    /// 11-29 (Experiments), 12-13 (Writing) and 12-20 (Revise and submit).
    fn paper(conn: &mut Connection) -> (i64, Vec<i64>) {
        let input = ProjectInput {
            name: "paper".into(),
            color: "#3b82f6".into(),
            start_date: Some("2026-11-20".into()),
            deadline: Some("2026-12-20".into()),
            buffer_days: 0,
            is_archived: false,
        };
        let p = projects::create(conn, &input, "conference", None).unwrap();
        let modules = crate::service::projects::query::modules(conn, p.id)
            .unwrap()
            .into_iter()
            .map(|m| m.id)
            .collect();
        (p.id, modules)
    }

    #[test]
    fn phases_split_the_time_and_the_worst_phase_sets_the_health() {
        let mut conn = open_in_memory();
        for weekday in 0..7 {
            set_weekday(&conn, weekday, Some(120)).unwrap(); // two hours every day
        }
        let (p, m) = paper(&mut conn);
        // 30h of experiments in ten days: too much, while writing is easy.
        projects::add_task(&conn, p, Some(m[0]), "runs", &Some("30h".into())).unwrap();
        projects::add_task(&conn, p, Some(m[1]), "draft", &Some("4h".into())).unwrap();

        // The experiments are planned before Nov 29 only, writing after it.
        let days = load_forecast(&conn, "2026-11-20", 14).unwrap();
        assert_eq!(days[0].minutes, 180); // 30h over ten days
        assert_eq!(days[9].minutes, 180); // Nov 29, the last experiments day
                                          // Writing from Nov 30: 16 chunks of 15 minutes over 14 days, the two
                                          // left over on the earliest days.
        assert_eq!((days[10].minutes, days[12].minutes), (30, 15));

        let h = &project_health(&conn, "2026-11-20").unwrap()[0];
        assert_eq!((h.remaining, h.health), (34 * 60, Health::Behind));
        assert_eq!(h.needed_per_day, Some(180)); // the experiments phase's need
                                                 // Once its end has passed with work left, the phase is still Behind
                                                 // (not Overdue: the paper is not due yet).
        let later = &project_health(&conn, "2026-12-01").unwrap()[0];
        assert_eq!(later.health, Health::Behind);
    }

    #[test]
    fn without_daily_time_health_says_so_and_more_than_a_day_is_behind() {
        use crate::service::plans::work::LimitKind;
        let mut conn = open_in_memory();
        let (p, m) = paper(&mut conn);
        projects::add_task(&conn, p, Some(m[0]), "runs", &Some("2h".into())).unwrap();
        // No time set for any day: no verdict, but it names what decides.
        let h = &project_health(&conn, "2026-11-20").unwrap()[0];
        assert_eq!(h.health, Health::NoDailyTime);
        let limit = h.limit.as_ref().unwrap();
        assert_eq!(
            (limit.kind, limit.name.as_str(), limit.date.as_str()),
            (LimitKind::Phase, "Experiments", "2026-11-29")
        );

        // 40 hours planned for today: impossible, time set or not, and it
        // is that part (the biggest need), not a smaller one, that is shown.
        let t = projects::add_task(&conn, p, Some(m[1]), "draft", &Some("40h".into())).unwrap();
        conn.execute(
            "UPDATE tasks SET scheduled_date = '2026-11-20' WHERE id = ?1",
            params![t.id],
        )
        .unwrap();
        let h = &project_health(&conn, "2026-11-20").unwrap()[0];
        assert_eq!((h.health, h.needed_per_day), (Health::Behind, Some(2400)));
        assert_eq!(h.limit.as_ref().unwrap().kind, LimitKind::DoOn);
    }

    #[test]
    fn phases_ending_on_the_same_day_share_their_window() {
        let mut conn = open_in_memory();
        for weekday in 0..7 {
            set_weekday(&conn, weekday, Some(24 * 60)).unwrap();
        }
        let (p, m) = paper(&mut conn);
        // Experiments and Writing both end Nov 22; 12h of writing.
        projects::set_phase(&conn, m[0], &Some("2026-11-22".into()), &None).unwrap();
        projects::set_phase(&conn, m[1], &Some("2026-11-22".into()), &None).unwrap();
        projects::add_task(&conn, p, Some(m[1]), "draft", &Some("12h".into())).unwrap();
        // Over Nov 20 to 22, not all on today.
        let h = &project_health(&conn, "2026-11-20").unwrap()[0];
        assert_eq!(h.needed_per_day, Some(240));
        let days = load_forecast(&conn, "2026-11-20", 3).unwrap();
        assert_eq!(days.iter().map(|d| d.minutes).sum::<i64>(), 720);
        assert!(days[0].minutes < 720, "{}", days[0].minutes);
    }

    #[test]
    fn a_budget_plans_a_phase_before_its_tasks_are_estimated() {
        let mut conn = open_in_memory();
        let (p, m) = paper(&mut conn);
        // A new project with no tasks is not done, only not planned yet.
        let h = &project_health(&conn, "2026-11-20").unwrap()[0];
        assert_eq!(h.health, Health::Unestimated);
        // No estimates anywhere: open tasks, but nothing to plan with.
        let a = projects::add_task(&conn, p, Some(m[0]), "baseline", &None).unwrap();
        projects::add_task(&conn, p, Some(m[0]), "ablation", &None).unwrap();
        let h = &project_health(&conn, "2026-11-20").unwrap()[0];
        assert_eq!(h.health, Health::Unestimated);

        // A 10h budget, 2h of it estimated: the other task counts for the 8h left.
        projects::set_phase(&conn, m[0], &Some("2026-11-29".into()), &Some("10h".into())).unwrap();
        conn.execute(
            "UPDATE tasks SET estimate_minutes = 120 WHERE id = ?1",
            params![a.id],
        )
        .unwrap();
        assert_eq!(
            project_health(&conn, "2026-11-20").unwrap()[0].remaining,
            600
        );

        // A budgeted phase without tasks counts its budget until it ends.
        projects::set_phase(&conn, m[1], &Some("2026-12-13".into()), &Some("20h".into())).unwrap();
        assert_eq!(
            project_health(&conn, "2026-11-20").unwrap()[0].remaining,
            600 + 1200
        );
        assert_eq!(
            project_health(&conn, "2026-12-14").unwrap()[0].remaining,
            600
        );
    }

    #[test]
    fn a_task_due_before_its_project_is_planned_up_to_its_due_date() {
        // The user's case (2026-11-21): 200 minutes due tomorrow in a
        // project due in two months were spread so thin today got nothing.
        let mut conn = open_in_memory();
        let p = project(&mut conn, "2027-01-23");
        let t = projects::add_task(&conn, p, None, "rebuttal", &Some("200m".into())).unwrap();
        conn.execute(
            "UPDATE tasks SET due_date = '2026-11-21' WHERE id = ?1",
            params![t.id],
        )
        .unwrap();
        projects::add_task(&conn, p, None, "camera ready", &Some("10h".into())).unwrap();

        let days = load_forecast(&conn, "2026-11-20", 14).unwrap();
        // The due task fills today and tomorrow (in 15-minute chunks);
        // the 10h without a date is spread to January.
        let first_two = days[0].minutes + days[1].minutes;
        assert!(first_two >= 200, "{first_two}");
        assert!(days[0].minutes >= 90, "{}", days[0].minutes);
        assert!(days[5].minutes < 30, "{}", days[5].minutes);

        let h = &project_health(&conn, "2026-11-20").unwrap()[0];
        assert_eq!(h.needed_per_day, Some(100)); // the due task decides it

        // Planned for a day ("Do on", as My Day sets it): all of it that day.
        let planned = projects::add_task(&conn, p, None, "slides", &Some("2h".into())).unwrap();
        conn.execute(
            "UPDATE tasks SET scheduled_date = '2026-11-24' WHERE id = ?1",
            params![planned.id],
        )
        .unwrap();
        let days = load_forecast(&conn, "2026-11-20", 14).unwrap();
        assert!(days[4].minutes >= 120, "{}", days[4].minutes);
        // Once that day has passed unfinished, it is spread again like the
        // rest; only the overdue 200 minutes (due Nov 21) fall on that day.
        let later = load_forecast(&conn, "2026-11-25", 3).unwrap();
        assert!(later[0].minutes < 200 + 60, "{}", later[0].minutes);
        // Once the due date passes with the task open, it is Behind (the
        // project itself is not late).
        assert_eq!(
            project_health(&conn, "2026-11-22").unwrap()[0].health,
            Health::Behind
        );
    }
}
