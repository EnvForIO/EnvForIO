//! What the Todo Duo card's Month tab shows for each day (phase 4 step 7,
//! user decisions 2026-11-20): deadlines as dots (projects, open tasks
//! due, followed conferences' abstract and paper deadlines), how full the
//! day is (time of the tasks scheduled on it against its available time),
//! and the list for the day: those deadlines and the scheduled tasks.

use std::collections::BTreeMap;

use chrono::{Datelike, Local, NaiveDate, TimeZone};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::errors::AppResult;
use crate::service::capacity::CapacityTable;
use crate::service::conferences;

/// Conference deadlines in the widget use the planned-submission colour.
const CONFERENCE_COLOR: &str = "#f97316";
/// Tasks outside a project.
const TASK_COLOR: &str = "#8e8e93";

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
pub enum DayItemKind {
    ProjectDeadline,
    TaskDue,
    Conference,
    Scheduled,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DayItem {
    pub kind: DayItemKind,
    pub title: String,
    pub color: String,
    pub done: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DayMarks {
    pub date: String, // 'YYYY-MM-DD'
    /// Estimated minutes of the tasks scheduled on this day.
    pub planned_minutes: i64,
    /// Minutes available that day (weekday default or override); None = not set.
    pub available_minutes: Option<i64>,
    /// Deadlines first, then scheduled tasks.
    pub items: Vec<DayItem>,
}

fn date(s: &str) -> Option<NaiveDate> {
    NaiveDate::parse_from_str(s, "%Y-%m-%d").ok()
}

/// One entry per day from `from` to `to` (inclusive), in order.
pub fn marks(conn: &Connection, from: &str, to: &str) -> AppResult<Vec<DayMarks>> {
    let (Some(first), Some(last)) = (date(from), date(to)) else {
        return Ok(Vec::new());
    };
    let capacity = CapacityTable::load(conn)?;
    let mut days: BTreeMap<String, DayMarks> = first
        .iter_days()
        .take_while(|d| *d <= last)
        .map(|d| {
            let key = d.to_string();
            let marks = DayMarks {
                date: key.clone(),
                planned_minutes: 0,
                available_minutes: capacity.on(d),
                items: Vec::new(),
            };
            (key, marks)
        })
        .collect();
    let mut push = |day: &str, item: DayItem| {
        if let Some(d) = days.get_mut(day) {
            d.items.push(item);
        }
    };

    let mut stmt = conn.prepare(
        "SELECT name, color, deadline FROM projects
         WHERE is_archived = 0 AND deadline BETWEEN ?1 AND ?2",
    )?;
    for row in stmt.query_map(params![from, to], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, String>(1)?,
            r.get::<_, String>(2)?,
        ))
    })? {
        let (title, color, day) = row?;
        push(
            &day,
            DayItem {
                kind: DayItemKind::ProjectDeadline,
                title,
                color,
                done: false,
            },
        );
    }

    let mut stmt = conn.prepare(
        "SELECT t.title, p.color, t.due_date FROM tasks t LEFT JOIN projects p ON p.id = t.project_id
         WHERE t.done_at IS NULL AND t.due_date BETWEEN ?1 AND ?2
         ORDER BY t.due_date, t.sort_order",
    )?;
    for row in stmt.query_map(params![from, to], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, Option<String>>(1)?,
            r.get::<_, String>(2)?,
        ))
    })? {
        let (title, color, day) = row?;
        let color = color.unwrap_or_else(|| TASK_COLOR.into());
        push(
            &day,
            DayItem {
                kind: DayItemKind::TaskDue,
                title,
                color,
                done: false,
            },
        );
    }

    let local_day = |ms: i64| {
        Local
            .timestamp_millis_opt(ms)
            .single()
            .map(|d| d.date_naive().to_string())
    };
    let since = Local::now().year() - 1;
    for c in conferences::list(conn, since)?
        .conferences
        .into_iter()
        .filter(|c| c.followed)
    {
        for e in &c.editions {
            for stage in &e.stages {
                let rounds = [
                    (stage.abstract_at, "abstract"),
                    (stage.deadline_at, "paper"),
                ];
                for (at, what) in rounds {
                    if let Some(day) = at.and_then(local_day) {
                        push(
                            &day,
                            DayItem {
                                kind: DayItemKind::Conference,
                                title: format!("{} {} {what}", c.title, e.year),
                                color: CONFERENCE_COLOR.into(),
                                done: false,
                            },
                        );
                    }
                }
            }
        }
    }

    let mut stmt = conn.prepare(
        "SELECT t.title, p.color, t.scheduled_date, t.estimate_minutes, t.done_at IS NOT NULL
         FROM tasks t LEFT JOIN projects p ON p.id = t.project_id
         WHERE t.scheduled_date BETWEEN ?1 AND ?2
         ORDER BY t.scheduled_date, t.start_time IS NULL, t.start_time, t.sort_order",
    )?;
    let rows = stmt.query_map(params![from, to], |r| {
        Ok((
            r.get::<_, String>(0)?,
            r.get::<_, Option<String>>(1)?,
            r.get::<_, String>(2)?,
            r.get::<_, Option<i64>>(3)?,
            r.get::<_, bool>(4)?,
        ))
    })?;
    for row in rows {
        let (title, color, day, estimate, done) = row?;
        if let Some(d) = days.get_mut(&day) {
            d.planned_minutes += estimate.unwrap_or(0);
            d.items.push(DayItem {
                kind: DayItemKind::Scheduled,
                title,
                color: color.unwrap_or_else(|| TASK_COLOR.into()),
                done,
            });
        }
    }
    Ok(days.into_values().collect())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use crate::service::capacity::set_weekday;
    use crate::service::projects::mutation::{self as projects, ProjectInput};

    #[test]
    fn a_day_has_its_deadlines_and_scheduled_time() {
        let mut conn = open_in_memory();
        // 2026-11-23 is a Monday.
        set_weekday(&conn, 0, Some(240)).unwrap();
        let input = ProjectInput {
            name: "Thesis".into(),
            color: "#3b82f6".into(),
            start_date: None,
            deadline: Some("2026-11-24".into()),
            buffer_days: 0,
            is_archived: false,
        };
        let p = projects::create(&mut conn, &input, "blank").unwrap();
        let task = projects::add_task(&conn, p.id, None, "chapter 2", &Some("3h".into())).unwrap();
        conn.execute(
            "UPDATE tasks SET scheduled_date = '2026-11-23' WHERE id = ?1",
            [task.id],
        )
        .unwrap();
        let due = projects::add_task(&conn, p.id, None, "send draft", &None).unwrap();
        conn.execute(
            "UPDATE tasks SET due_date = '2026-11-24' WHERE id = ?1",
            [due.id],
        )
        .unwrap();

        let days = marks(&conn, "2026-11-23", "2026-11-25").unwrap();
        assert_eq!(days.len(), 3);
        let monday = &days[0];
        assert_eq!(
            (monday.planned_minutes, monday.available_minutes),
            (180, Some(240))
        );
        assert_eq!(monday.items[0].kind, DayItemKind::Scheduled);
        let kinds: Vec<_> = days[1].items.iter().map(|i| i.kind).collect();
        assert_eq!(kinds, [DayItemKind::ProjectDeadline, DayItemKind::TaskDue]);
        assert!(days[2].items.is_empty());
    }
}
