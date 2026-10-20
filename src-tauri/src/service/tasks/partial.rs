//! Partial completion: "I did 45 minutes of this 2-hour task".
//!
//! The task is finished with the part that was done as its estimate, and the
//! rest becomes a new task (same project and module, linked by
//! `split_from_id`) scheduled on the next work day. The safety line then
//! counts the done part today and plans the rest.

use chrono::{Duration, NaiveDate};
use rusqlite::{params, Connection};

use super::mutation::{create, set_done};
use super::query::{self, TaskView};
use crate::domain::day::now_timestamp;
use crate::entity::task::Task;
use crate::errors::{AppError, AppResult};
use crate::service::capacity::CapacityTable;
use crate::service::validate::estimate_minutes;

/// The first day after `today` that is not a rest day (gives up after a year).
fn next_work_day(capacity: &CapacityTable, today: NaiveDate) -> NaiveDate {
    (1..=366)
        .map(|i| today + Duration::days(i))
        .find(|d| capacity.on(*d) != Some(0))
        .unwrap_or(today + Duration::days(1))
}

/// Returns the new task that holds the rest of the work.
pub fn complete_partially(conn: &Connection, id: i64, done: &str, today: &str) -> AppResult<Task> {
    let task = query::get(conn, id)?;
    let total = task
        .estimate_minutes
        .ok_or_else(|| AppError::invalid("the task has no estimate to split"))?;
    let done = estimate_minutes(&Some(done.to_string()))?
        .ok_or_else(|| AppError::invalid("how much was done?"))?;
    if done >= total {
        return Err(AppError::invalid(
            "that is all of it: mark the task done instead",
        ));
    }
    let today = NaiveDate::parse_from_str(today, "%Y-%m-%d")
        .map_err(|_| AppError::invalid("not a date"))?;
    let next = next_work_day(&CapacityTable::load(conn)?, today).to_string();

    let rest = create(conn, &task.title, TaskView::Tasks, &next)?;
    conn.execute(
        "UPDATE tasks SET project_id = ?2, module_id = ?3, estimate_minutes = ?4,
             scheduled_date = ?5, due_date = ?6, is_important = ?7, split_from_id = ?8,
             start_time = NULL, end_time = NULL, updated_at = ?9
         WHERE id = ?1",
        params![
            rest.id,
            task.project_id,
            task.module_id,
            total - done,
            next,
            task.due_date,
            task.is_important,
            task.id,
            now_timestamp()
        ],
    )?;
    conn.execute(
        "UPDATE tasks SET estimate_minutes = ?2 WHERE id = ?1",
        params![task.id, done],
    )?;
    set_done(conn, task.id, true)?;
    query::get(conn, rest.id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use crate::service::capacity::set_weekday;
    use crate::service::projects::mutation::{self as projects, ProjectInput};

    #[test]
    fn the_rest_moves_to_the_next_work_day() {
        let mut conn = open_in_memory();
        let input = ProjectInput {
            name: "paper".into(),
            color: "#3b82f6".into(),
            start_date: None,
            deadline: Some("2026-12-31".into()),
            buffer_days: 0,
            is_archived: false,
        };
        let p = projects::create(&mut conn, &input, "paper").unwrap();
        let t = projects::add_task(&conn, p.id, None, "draft intro", &Some("2h".into())).unwrap();
        set_weekday(&conn, 5, Some(0)).unwrap(); // Saturday is a rest day

        // Friday 2026-11-20: the rest goes to Sunday the 22nd, skipping Saturday.
        let rest = complete_partially(&conn, t.id, "45m", "2026-11-20").unwrap();
        assert_eq!(rest.title, "draft intro");
        assert_eq!(rest.estimate_minutes, Some(75));
        assert_eq!(rest.project_id, Some(p.id));
        assert_eq!(rest.scheduled_date.as_deref(), Some("2026-11-22"));

        let done = query::get(&conn, t.id).unwrap();
        assert!(done.done_at.is_some());
        assert_eq!(done.estimate_minutes, Some(45));

        assert!(complete_partially(&conn, rest.id, "2h", "2026-11-22").is_err()); // all of it
        assert!(complete_partially(&conn, rest.id, "soon", "2026-11-22").is_err());
    }
}
