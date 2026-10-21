//! Today's safety line, and its snapshot for tomorrow's check-in.
//!
//! The line is computed from the work left *at the start of today*: tasks
//! finished today still count as remaining. So finishing work does not lower
//! today's line; only changing the plan (estimates, dates, capacity) does.
//! The first time a day's line is computed it is also stored in `daily_lines`.

use rusqlite::{params, Connection};
use serde::Serialize;
use specta::Type;

use super::work::{parse_date, projects, work_at, Estimates};
use crate::domain::safety_line::allocate;
use crate::errors::{AppError, AppResult};
use crate::service::capacity::CapacityTable;
use crate::service::settings;

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

pub fn today_line(conn: &Connection, today: &str) -> AppResult<TodayLine> {
    let day = parse_date(today).ok_or_else(|| AppError::invalid("not a date"))?;
    let rows = projects(conn)?;
    let estimates = Estimates::load(conn)?;
    let capacity = CapacityTable::load(conn)?;
    let options = settings::load(conn)?.options();
    let alloc = allocate(
        day,
        &work_at(&rows, &estimates, day),
        &|d| capacity.on(d),
        options,
    );

    let mut lines: Vec<ProjectLine> = rows
        .into_iter()
        .map(|p| ProjectLine {
            minutes: alloc.get(&(day, p.id)).copied().unwrap_or(0),
            done_minutes: estimates.done_on(day, p.id),
            project_id: p.id,
            name: p.name,
            color: p.color,
        })
        .filter(|p| p.minutes > 0 || p.done_minutes > 0)
        .collect();
    lines.sort_by(|a, b| {
        b.minutes
            .cmp(&a.minutes)
            .then(a.project_id.cmp(&b.project_id))
    });

    snapshot(conn, today, &lines)?;
    Ok(TodayLine {
        date: today.to_string(),
        minutes: lines.iter().map(|p| p.minutes).sum(),
        done_minutes: lines.iter().map(|p| p.done_minutes).sum(),
        capacity: capacity.on(day),
        projects: lines,
    })
}

/// Store the day's line the first time it is seen; later calls leave it alone.
fn snapshot(conn: &Connection, date: &str, lines: &[ProjectLine]) -> AppResult<()> {
    let seen: i64 = conn.query_row(
        "SELECT count(*) FROM daily_lines WHERE date = ?1",
        params![date],
        |r| r.get(0),
    )?;
    if seen > 0 {
        return Ok(());
    }
    conn.execute(
        "INSERT INTO daily_lines (date, project_id, minutes) VALUES (?1, 0, 0)",
        params![date],
    )?;
    for line in lines.iter().filter(|l| l.minutes > 0) {
        conn.execute(
            "INSERT INTO daily_lines (date, project_id, minutes) VALUES (?1, ?2, ?3)",
            params![date, line.project_id, line.minutes],
        )?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use crate::service::projects::mutation::{self as projects, ProjectInput};
    use crate::service::tasks::mutation::set_done;

    #[test]
    fn finishing_work_today_does_not_lower_the_line_and_the_first_line_is_kept() {
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

        // Adding work changes today's line but not the stored first line.
        projects::add_task(&conn, p.id, None, "c", &Some("2h".into())).unwrap();
        assert_eq!(today_line(&conn, &today).unwrap().minutes, 180);
        let stored: i64 = conn
            .query_row(
                "SELECT sum(minutes) FROM daily_lines WHERE date = ?1",
                params![today],
                |r| r.get(0),
            )
            .unwrap();
        assert_eq!(stored, 120);
    }
}
