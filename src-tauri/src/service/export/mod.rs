//! Exporting task lists: a day, a week, a month or a project, as rows the UI
//! can show (for PDF and image), or as a CSV spreadsheet or an ICS calendar.

pub mod format;

use chrono::{Datelike, Duration, NaiveDate};
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use specta::Type;

use crate::errors::{AppError, AppResult};

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Deserialize, Type)]
#[serde(tag = "kind")]
pub enum ExportScope {
    Day { date: String },
    Week { date: String },  // the week (Monday first) containing `date`
    Month { date: String }, // the calendar month containing `date`
    Project { id: i64 },
}

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ExportRow {
    pub id: i64,
    pub date: Option<String>, // the day it belongs to: scheduled, else My Day, else due
    pub start_time: Option<String>,
    pub end_time: Option<String>,
    pub title: String,
    pub project: Option<String>,
    pub module: Option<String>,
    pub estimate_minutes: Option<i64>,
    pub actual_minutes: Option<i64>,
    pub due_date: Option<String>,
    pub done: bool,
    pub note: String,
}

#[derive(Debug, Clone, PartialEq, Serialize, Type)]
pub struct Export {
    pub title: String, // e.g. "Week of 2026-11-16" or the project name
    pub rows: Vec<ExportRow>,
}

fn range(scope: &ExportScope) -> AppResult<Option<(NaiveDate, NaiveDate)>> {
    let parse = |s: &str| {
        NaiveDate::parse_from_str(s, "%Y-%m-%d").map_err(|_| AppError::invalid("not a date"))
    };
    Ok(match scope {
        ExportScope::Day { date } => {
            let d = parse(date)?;
            Some((d, d))
        }
        ExportScope::Week { date } => {
            let d = parse(date)?;
            let monday = d - Duration::days(i64::from(d.weekday().num_days_from_monday()));
            Some((monday, monday + Duration::days(6)))
        }
        ExportScope::Month { date } => {
            let d = parse(date)?;
            let first = d.with_day(1).expect("day 1 exists");
            let next = if d.month() == 12 {
                NaiveDate::from_ymd_opt(d.year() + 1, 1, 1)
            } else {
                NaiveDate::from_ymd_opt(d.year(), d.month() + 1, 1)
            }
            .expect("first of next month exists");
            Some((first, next - Duration::days(1)))
        }
        ExportScope::Project { .. } => None,
    })
}

// An exported row has one date: the planned day, or the due day when the
// task is not planned. (Unlike the day views, a task is listed once.)
const COLUMNS: &str = "t.id, coalesce(t.scheduled_date, t.due_date), t.start_time,
     t.end_time, t.title, p.name, m.name, t.estimate_minutes, t.actual_minutes, t.due_date,
     t.done_at IS NOT NULL, t.note";

pub fn export(conn: &Connection, scope: &ExportScope) -> AppResult<Export> {
    let from = "FROM tasks t LEFT JOIN projects p ON p.id = t.project_id
                LEFT JOIN modules m ON m.id = t.module_id";
    let order = "ORDER BY 2 IS NULL, 2, t.start_time IS NULL, t.start_time, t.sort_order, t.id";
    let (title, sql, args): (String, String, Vec<String>) = match (scope, range(scope)?) {
        (ExportScope::Project { id }, _) => {
            let name: String = conn
                .query_row(
                    "SELECT name FROM projects WHERE id = ?1",
                    params![id],
                    |r| r.get(0),
                )
                .map_err(|_| AppError::not_found("project", *id))?;
            (
                name,
                format!("SELECT {COLUMNS} {from} WHERE t.project_id = ?1 {order}"),
                vec![id.to_string()],
            )
        }
        (_, Some((first, last))) => {
            let title = if first == last {
                first.to_string()
            } else {
                format!("{first} – {last}")
            };
            let sql = format!(
                "SELECT {COLUMNS} {from}
                 WHERE coalesce(t.scheduled_date, t.due_date) BETWEEN ?1 AND ?2 {order}"
            );
            (title, sql, vec![first.to_string(), last.to_string()])
        }
        (_, None) => unreachable!("only projects have no date range"),
    };
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(rusqlite::params_from_iter(args.iter()), |r| {
        Ok(ExportRow {
            id: r.get(0)?,
            date: r.get(1)?,
            start_time: r.get(2)?,
            end_time: r.get(3)?,
            title: r.get(4)?,
            project: r.get(5)?,
            module: r.get(6)?,
            estimate_minutes: r.get(7)?,
            actual_minutes: r.get(8)?,
            due_date: r.get(9)?,
            done: r.get(10)?,
            note: r.get(11)?,
        })
    })?;
    Ok(Export {
        title,
        rows: rows.collect::<Result<_, _>>()?,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use crate::service::tasks::mutation::{create, create_due};
    use crate::service::tasks::query::TaskView;

    #[test]
    fn scopes_pick_the_right_tasks() {
        let conn = open_in_memory();
        create(&conn, "14:00-15:00 seminar", TaskView::MyDay, "2026-11-18").unwrap();
        create_due(&conn, "submit", "2026-11-30").unwrap();
        create(&conn, "undated", TaskView::Tasks, "2026-11-18").unwrap();

        let day = export(
            &conn,
            &ExportScope::Day {
                date: "2026-11-18".into(),
            },
        )
        .unwrap();
        assert_eq!(day.rows.len(), 1);
        assert_eq!(day.rows[0].start_time.as_deref(), Some("14:00"));
        let week = export(
            &conn,
            &ExportScope::Week {
                date: "2026-11-19".into(),
            },
        )
        .unwrap();
        assert_eq!(
            (week.title.as_str(), week.rows.len()),
            ("2026-11-16 – 2026-11-22", 1)
        );
        let month = export(
            &conn,
            &ExportScope::Month {
                date: "2026-11-05".into(),
            },
        )
        .unwrap();
        assert_eq!(month.rows.len(), 2);
        assert!(export(&conn, &ExportScope::Project { id: 9 }).is_err());
    }
}
