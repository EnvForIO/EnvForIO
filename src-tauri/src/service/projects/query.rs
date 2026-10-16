//! Reading projects, their modules, and their tasks.

use rusqlite::{params, Connection, OptionalExtension};

use crate::entity::project::{Module, Project, MODULE_COLUMNS, PROJECT_COLUMNS};
use crate::entity::task::{Task, TASK_COLUMNS};
use crate::errors::{AppError, AppResult};

/// Open projects first, then archived; each group in the user's order.
pub fn list(conn: &Connection) -> AppResult<Vec<Project>> {
    let sql = format!(
        "SELECT {PROJECT_COLUMNS} FROM projects p ORDER BY p.is_archived, p.sort_order, p.id"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map([], Project::from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<Project> {
    let sql = format!("SELECT {PROJECT_COLUMNS} FROM projects p WHERE p.id = ?1");
    conn.query_row(&sql, params![id], Project::from_row)
        .optional()?
        .ok_or_else(|| AppError::not_found("project", id))
}

pub fn modules(conn: &Connection, project_id: i64) -> AppResult<Vec<Module>> {
    let sql = format!(
        "SELECT {MODULE_COLUMNS} FROM modules WHERE project_id = ?1 ORDER BY sort_order, id"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![project_id], Module::from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn get_module(conn: &Connection, id: i64) -> AppResult<Module> {
    let sql = format!("SELECT {MODULE_COLUMNS} FROM modules WHERE id = ?1");
    conn.query_row(&sql, params![id], Module::from_row)
        .optional()?
        .ok_or_else(|| AppError::not_found("module", id))
}

/// All of a project's tasks; the UI groups them by `module_id`.
pub fn tasks(conn: &Connection, project_id: i64) -> AppResult<Vec<Task>> {
    let sql = format!(
        "SELECT {TASK_COLUMNS} FROM tasks t WHERE t.project_id = ?1
         ORDER BY t.is_pinned DESC, (t.done_at IS NOT NULL), t.sort_order, t.id"
    );
    let mut stmt = conn.prepare(&sql)?;
    let rows = stmt.query_map(params![project_id], Task::from_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}
