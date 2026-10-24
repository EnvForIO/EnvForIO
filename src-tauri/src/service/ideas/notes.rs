//! An idea's working material: notes (Markdown with LaTeX), todos with due
//! dates, problems with their solutions, and a dated progress log.

use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use specta::Type;

use super::query;
use crate::domain::day::now_timestamp;
use crate::errors::{AppError, AppResult};
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
        "SELECT id, idea_id, title, due_date, done_at IS NOT NULL FROM idea_todos WHERE idea_id = ?1
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
    query::get(conn, idea_id)?;
    conn.execute(
        "INSERT INTO idea_todos (idea_id, title, due_date, sort_order)
         VALUES (?1, ?2, ?3, (SELECT coalesce(max(sort_order), 0) + 1 FROM idea_todos WHERE idea_id = ?1))",
        params![idea_id, title, due],
    )?;
    Ok(())
}

pub fn set_todo_done(conn: &Connection, id: i64, done: bool) -> AppResult<()> {
    let at = done.then(now_timestamp);
    let changed = conn.execute(
        "UPDATE idea_todos SET done_at = ?2 WHERE id = ?1",
        params![id, at],
    )?;
    gone("todo", id, changed)
}

pub fn delete_todo(conn: &Connection, id: i64) -> AppResult<()> {
    let changed = conn.execute("DELETE FROM idea_todos WHERE id = ?1", params![id])?;
    gone("todo", id, changed)
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
}
