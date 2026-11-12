//! An idea's working material: notes (Markdown with LaTeX), todos with due
//! dates, problems with their solutions, and a dated progress log.
//!
//! Todos are ordinary tasks with `idea_id` set (since 2026-11-20), so they
//! show in Planned, My Day, the calendar and the heatmap; an idea linked to
//! a project files them in that project.

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use specta::Type;

use super::query;
use crate::domain::day::now_timestamp;
use crate::errors::{AppError, AppResult};
use crate::service::tasks::mutation as tasks;
use crate::service::validate::{check_date, clean_name};

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IdeaTodo {
    pub id: i64,
    pub idea_id: i64,
    pub title: String,
    pub due_date: Option<String>,
    pub done: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IdeaProblem {
    pub id: i64,
    pub idea_id: i64,
    pub problem: String,
    pub solution: String,
    pub is_solved: bool,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct IdeaLog {
    pub id: i64,
    pub idea_id: i64,
    pub date: String,
    pub text: String,
}

fn gone(what: &str, id: i64, changed: usize) -> AppResult<()> {
    if changed == 0 {
        return Err(AppError::not_found(what, id));
    }
    Ok(())
}

pub fn set_notes(conn: &Connection, idea_id: i64, notes: &str) -> AppResult<()> {
    let changed = conn.execute(
        "UPDATE ideas SET notes = ?2, updated_at = ?3 WHERE id = ?1",
        params![idea_id, notes, now_timestamp()],
    )?;
    gone("idea", idea_id, changed)
}

pub fn notes(conn: &Connection, idea_id: i64) -> AppResult<String> {
    conn.query_row(
        "SELECT notes FROM ideas WHERE id = ?1",
        params![idea_id],
        |r| r.get(0),
    )
    .map_err(|_| AppError::not_found("idea", idea_id))
}

// ---------------------------------------------------------------------------
// Todos: open first, then by due date.

pub fn todos(conn: &Connection, idea_id: i64) -> AppResult<Vec<IdeaTodo>> {
    let mut stmt = conn.prepare(
        "SELECT id, idea_id, title, due_date, done_at IS NOT NULL FROM tasks WHERE idea_id = ?1
         ORDER BY done_at IS NOT NULL, due_date IS NULL, due_date, sort_order, id",
    )?;
    let rows = stmt.query_map(params![idea_id], |r| {
        Ok(IdeaTodo {
            id: r.get(0)?,
            idea_id: r.get(1)?,
            title: r.get(2)?,
            due_date: r.get(3)?,
            done: r.get(4)?,
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn add_todo(
    conn: &Connection,
    idea_id: i64,
    title: &str,
    due: Option<String>,
) -> AppResult<()> {
    let title = clean_name(title)?;
    check_date(&due)?;
    let idea = query::get(conn, idea_id)?;
    let now = now_timestamp();
    conn.execute(
        "INSERT INTO tasks (title, due_date, idea_id, project_id, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, (SELECT coalesce(max(sort_order), 0) + 1 FROM tasks), ?5, ?5)",
        params![title, due, idea_id, idea.project_id, now],
    )?;
    Ok(())
}

pub fn set_todo_done(conn: &Connection, id: i64, done: bool) -> AppResult<()> {
    tasks::set_done(conn, id, done).map(|_| ())
}

pub fn delete_todo(conn: &Connection, id: i64) -> AppResult<()> {
    tasks::delete(conn, id)
}

// ---------------------------------------------------------------------------
// Problems: open first, newest first.

pub fn problems(conn: &Connection, idea_id: i64) -> AppResult<Vec<IdeaProblem>> {
    let mut stmt = conn.prepare(
        "SELECT id, idea_id, problem, solution, is_solved FROM idea_problems WHERE idea_id = ?1
         ORDER BY is_solved, id DESC",
    )?;
    let rows = stmt.query_map(params![idea_id], |r| {
        Ok(IdeaProblem {
            id: r.get(0)?,
            idea_id: r.get(1)?,
            problem: r.get(2)?,
            solution: r.get(3)?,
            is_solved: r.get(4)?,
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn add_problem(conn: &Connection, idea_id: i64, problem: &str) -> AppResult<()> {
    let problem = clean_name(problem)?;
    query::get(conn, idea_id)?;
    conn.execute(
        "INSERT INTO idea_problems (idea_id, problem, created_at) VALUES (?1, ?2, ?3)",
        params![idea_id, problem, now_timestamp()],
    )?;
    Ok(())
}

/// Save how a problem was solved (or worked around) and whether it is solved.
pub fn update_problem(conn: &Connection, id: i64, solution: &str, solved: bool) -> AppResult<()> {
    let changed = conn.execute(
        "UPDATE idea_problems SET solution = ?2, is_solved = ?3 WHERE id = ?1",
        params![id, solution.trim(), solved],
    )?;
    gone("problem", id, changed)
}

pub fn delete_problem(conn: &Connection, id: i64) -> AppResult<()> {
    let changed = conn.execute("DELETE FROM idea_problems WHERE id = ?1", params![id])?;
    gone("problem", id, changed)
}

// ---------------------------------------------------------------------------
// Log: newest first.

pub fn logs(conn: &Connection, idea_id: i64) -> AppResult<Vec<IdeaLog>> {
    let mut stmt = conn.prepare(
        "SELECT id, idea_id, date, text FROM idea_logs WHERE idea_id = ?1 ORDER BY date DESC, id DESC",
    )?;
    let rows = stmt.query_map(params![idea_id], |r| {
        Ok(IdeaLog {
            id: r.get(0)?,
            idea_id: r.get(1)?,
            date: r.get(2)?,
            text: r.get(3)?,
        })
    })?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn add_log(conn: &Connection, idea_id: i64, text: &str, today: &str) -> AppResult<()> {
    let text = clean_name(text)?;
    query::get(conn, idea_id)?;
    conn.execute(
        "INSERT INTO idea_logs (idea_id, date, text, created_at) VALUES (?1, ?2, ?3, ?4)",
        params![idea_id, today, text, now_timestamp()],
    )?;
    Ok(())
}

pub fn delete_log(conn: &Connection, id: i64) -> AppResult<()> {
    let changed = conn.execute("DELETE FROM idea_logs WHERE id = ?1", params![id])?;
    gone("log entry", id, changed)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use crate::service::ideas::mutation::create;

    #[test]
    fn notes_todos_problems_and_logs() {
        let mut conn = open_in_memory();
        let idea = create(&mut conn, "x").unwrap();

        set_notes(&conn, idea.id, "Loss: $L = \\sum_i x_i$").unwrap();
        assert!(notes(&conn, idea.id).unwrap().contains("\\sum"));

        add_todo(&conn, idea.id, "check baseline", None).unwrap();
        add_todo(
            &conn,
            idea.id,
            "verify hypothesis",
            Some("2026-11-25".into()),
        )
        .unwrap();
        let list = todos(&conn, idea.id).unwrap();
        assert_eq!(list[0].title, "verify hypothesis"); // dated first
        set_todo_done(&conn, list[0].id, true).unwrap();
        assert_eq!(todos(&conn, idea.id).unwrap()[1].title, "verify hypothesis"); // done sinks
        assert!(add_todo(&conn, idea.id, "x", Some("soon".into())).is_err());

        add_problem(&conn, idea.id, "loss diverges").unwrap();
        let p = problems(&conn, idea.id).unwrap()[0].id;
        update_problem(&conn, p, "lower the learning rate", true).unwrap();
        assert!(problems(&conn, idea.id).unwrap()[0].is_solved);

        add_log(&conn, idea.id, "ran first experiment", "2026-11-20").unwrap();
        assert_eq!(logs(&conn, idea.id).unwrap()[0].date, "2026-11-20");

        let idea = query::get(&conn, idea.id).unwrap();
        assert_eq!(
            (idea.open_todos, idea.open_problems, idea.log_count),
            (1, 0, 1)
        );
    }

    #[test]
    fn todos_are_tasks_that_follow_the_ideas_project() {
        use crate::service::ideas::mutation::set_project;
        use crate::service::projects::mutation::{self as projects, ProjectInput};
        use crate::service::tasks::items::{list as items, ItemStatus};
        use crate::service::tasks::query::{list, TaskView};

        let mut conn = open_in_memory();
        let idea = super::super::mutation::create(&mut conn, "idea").unwrap();
        add_todo(&conn, idea.id, "due today", Some("2026-11-20".into())).unwrap();
        add_todo(&conn, idea.id, "overdue", Some("2026-11-18".into())).unwrap();
        add_todo(&conn, idea.id, "someday", None).unwrap();
        let titles = |view| -> Vec<String> {
            list(&conn, view, "2026-11-20")
                .unwrap()
                .into_iter()
                .map(|t| t.title)
                .collect()
        };
        // My Day picks up what is due today or overdue; "with deadline" has both dated ones.
        let mut my_day = titles(TaskView::MyDay);
        my_day.sort();
        assert_eq!(my_day, ["due today", "overdue"]);
        assert_eq!(
            items(&conn, ItemStatus::WithDeadline, None).unwrap().len(),
            2
        );

        let input = ProjectInput {
            name: "p".into(),
            color: "#3b82f6".into(),
            start_date: None,
            deadline: Some("2026-12-20".into()),
            buffer_days: 0,
            is_archived: false,
        };
        let p = projects::create(&mut conn, &input, "blank", None).unwrap();
        set_project(&mut conn, idea.id, Some(p.id)).unwrap();
        add_todo(&conn, idea.id, "added later", None).unwrap();
        let in_project = crate::service::projects::query::tasks(&conn, p.id).unwrap();
        assert_eq!(in_project.len(), 4);
        assert!(in_project.iter().all(|t| t.idea_id == Some(idea.id)));

        // Deleting the project keeps the idea's todos.
        projects::delete(&mut conn, p.id).unwrap();
        assert_eq!(todos(&conn, idea.id).unwrap().len(), 4);
        assert_eq!(
            super::super::query::get(&conn, idea.id).unwrap().project_id,
            None
        );
    }
}
