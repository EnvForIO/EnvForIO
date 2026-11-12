//! Creating, editing and deleting projects, modules, and project tasks.

use chrono::NaiveDate;
use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use specta::Type;

use super::{query, templates};
use crate::domain::day::now_timestamp;
use crate::entity::project::{Module, Project};
use crate::entity::task::Task;
use crate::errors::{AppError, AppResult};
use crate::service::tasks;
use crate::service::validate::{check_date, clean_name, estimate_minutes};

/// The project dialog's fields, sent whole on create and on every save.
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ProjectInput {
    pub name: String,
    pub color: String,              // '#rrggbb'
    pub start_date: Option<String>, // 'YYYY-MM-DD'
    pub deadline: Option<String>,   // 'YYYY-MM-DD'
    pub buffer_days: i64,
    pub is_archived: bool,
}

fn check(input: &ProjectInput) -> AppResult<String> {
    let name = clean_name(&input.name)?;
    let hex = input.color.strip_prefix('#').unwrap_or("");
    if hex.len() != 6 || !hex.chars().all(|c| c.is_ascii_hexdigit()) {
        return Err(AppError::invalid(format!("not a colour: {}", input.color)));
    }
    check_date(&input.start_date)?;
    check_date(&input.deadline)?;
    if let (Some(start), Some(end)) = (&input.start_date, &input.deadline) {
        if start > end {
            return Err(AppError::invalid("the start date is after the deadline"));
        }
    }
    if input.buffer_days < 0 {
        return Err(AppError::invalid("buffer days cannot be negative"));
    }
    Ok(name)
}

/// One module of a new project as the dialog sends it. With an end date it
/// is a phase; the budget is typed like an estimate ("40h").
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct PhaseInput {
    pub name: String,
    pub end_date: Option<String>, // 'YYYY-MM-DD'
    pub budget: Option<String>,   // e.g. "40h"; None or "" = no budget
}

/// A template's phases dated back from the deadline. A phase that would end
/// before the project starts, or a project without a deadline, gets no date.
pub fn default_phases(
    template: &templates::ProjectTemplate,
    input: &ProjectInput,
) -> Vec<PhaseInput> {
    let deadline = input
        .deadline
        .as_deref()
        .and_then(|d| NaiveDate::parse_from_str(d, "%Y-%m-%d").ok());
    let start = input.start_date.clone().unwrap_or_default();
    template
        .phases
        .iter()
        .map(|phase| PhaseInput {
            name: phase.name.into(),
            end_date: deadline
                .zip(phase.days_before)
                .map(|(d, days)| (d - chrono::Days::new(days.into())).to_string())
                .filter(|end| *end >= start),
            budget: None,
        })
        .collect()
}

/// Creates a project and its modules. `phases` None = the template's, dated
/// from the deadline; the dialog sends them after the user has edited them.
pub fn create(
    conn: &mut Connection,
    input: &ProjectInput,
    template: &str,
    phases: Option<&[PhaseInput]>,
) -> AppResult<Project> {
    let name = check(input)?;
    let template = templates::find(template)
        .ok_or_else(|| AppError::invalid(format!("no such template: {template}")))?;
    let defaults;
    let phases = match phases {
        Some(given) => given,
        None => {
            defaults = default_phases(template, input);
            &defaults
        }
    };
    let mut modules = Vec::new();
    for phase in phases {
        check_date(&phase.end_date)?;
        modules.push((
            clean_name(&phase.name)?,
            &phase.end_date,
            estimate_minutes(&phase.budget)?,
        ));
    }
    let now = now_timestamp();
    // One transaction: a project never exists without its modules.
    let tx = conn.transaction()?;
    let bottom: f64 = tx.query_row(
        "SELECT coalesce(max(sort_order), 0) + 1 FROM projects",
        [],
        |r| r.get(0),
    )?;
    tx.execute(
        "INSERT INTO projects (name, color, template, start_date, deadline, buffer_days, sort_order, created_at, updated_at)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?8)",
        params![name, input.color, template.id, input.start_date, input.deadline, input.buffer_days, bottom, now],
    )?;
    let id = tx.last_insert_rowid();
    for (i, (name, end_date, budget)) in modules.iter().enumerate() {
        tx.execute(
            "INSERT INTO modules (project_id, name, sort_order, end_date, budget_minutes)
             VALUES (?1, ?2, ?3, ?4, ?5)",
            params![id, name, i as f64, end_date, budget],
        )?;
    }
    tx.commit()?;
    query::get(conn, id)
}

pub fn update(conn: &Connection, id: i64, input: &ProjectInput) -> AppResult<Project> {
    let name = check(input)?;
    let changed = conn.execute(
        "UPDATE projects SET name = ?2, color = ?3, start_date = ?4, deadline = ?5,
             buffer_days = ?6, is_archived = ?7, updated_at = ?8
         WHERE id = ?1",
        params![
            id,
            name,
            input.color,
            input.start_date,
            input.deadline,
            input.buffer_days,
            input.is_archived,
            now_timestamp()
        ],
    )?;
    if changed == 0 {
        return Err(AppError::not_found("project", id));
    }
    query::get(conn, id)
}

/// Delete a project with its modules and tasks (and the tasks' steps).
/// Todos of an idea linked to it stay with the idea, back in the task pool.
pub fn delete(conn: &mut Connection, id: i64) -> AppResult<()> {
    let tx = conn.transaction()?;
    tx.execute(
        "UPDATE tasks SET project_id = NULL, module_id = NULL
         WHERE project_id = ?1 AND idea_id IS NOT NULL",
        params![id],
    )?;
    tx.execute("DELETE FROM tasks WHERE project_id = ?1", params![id])?;
    if tx.execute("DELETE FROM projects WHERE id = ?1", params![id])? == 0 {
        return Err(AppError::not_found("project", id)); // dropping tx rolls back
    }
    tx.commit()?;
    Ok(())
}

// ---------------------------------------------------------------------------
// Modules

pub fn add_module(conn: &Connection, project_id: i64, name: &str) -> AppResult<Module> {
    let name = clean_name(name)?;
    query::get(conn, project_id)?;
    let bottom: f64 = conn.query_row(
        "SELECT coalesce(max(sort_order), 0) + 1 FROM modules WHERE project_id = ?1",
        params![project_id],
        |r| r.get(0),
    )?;
    conn.execute(
        "INSERT INTO modules (project_id, name, sort_order) VALUES (?1, ?2, ?3)",
        params![project_id, name, bottom],
    )?;
    query::get_module(conn, conn.last_insert_rowid())
}

pub fn rename_module(conn: &Connection, id: i64, name: &str) -> AppResult<Module> {
    let name = clean_name(name)?;
    if conn.execute(
        "UPDATE modules SET name = ?2 WHERE id = ?1",
        params![id, name],
    )? == 0
    {
        return Err(AppError::not_found("module", id));
    }
    query::get_module(conn, id)
}

/// Sets when a module ends (making it a phase, or not with None) and its
/// time budget, typed like an estimate.
pub fn set_phase(
    conn: &Connection,
    id: i64,
    end_date: &Option<String>,
    budget: &Option<String>,
) -> AppResult<Module> {
    check_date(end_date)?;
    let minutes = estimate_minutes(budget)?;
    if conn.execute(
        "UPDATE modules SET end_date = ?2, budget_minutes = ?3 WHERE id = ?1",
        params![id, end_date, minutes],
    )? == 0
    {
        return Err(AppError::not_found("module", id));
    }
    query::get_module(conn, id)
}

/// Delete a module; its tasks stay in the project, ungrouped.
pub fn delete_module(conn: &Connection, id: i64) -> AppResult<()> {
    conn.execute(
        "UPDATE tasks SET module_id = NULL WHERE module_id = ?1",
        params![id],
    )?;
    if conn.execute("DELETE FROM modules WHERE id = ?1", params![id])? == 0 {
        return Err(AppError::not_found("module", id));
    }
    Ok(())
}

// ---------------------------------------------------------------------------
// Tasks inside a project

pub fn add_task(
    conn: &Connection,
    project_id: i64,
    module_id: Option<i64>,
    title: &str,
    estimate: &Option<String>,
) -> AppResult<Task> {
    let minutes = estimate_minutes(estimate)?;
    query::get(conn, project_id)?;
    if let Some(module_id) = module_id {
        if query::get_module(conn, module_id)?.project_id != project_id {
            return Err(AppError::invalid("the module belongs to another project"));
        }
    }
    let task = tasks::mutation::create(conn, title, tasks::query::TaskView::Tasks, "")?;
    conn.execute(
        "UPDATE tasks SET project_id = ?2, module_id = ?3, estimate_minutes = ?4 WHERE id = ?1",
        params![task.id, project_id, module_id, minutes],
    )?;
    tasks::query::get(conn, task.id)
}
