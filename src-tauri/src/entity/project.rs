//! The `projects` and `modules` tables as Rust types (also what the UI receives).

use rusqlite::Row;
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Project {
    pub id: i64,
    pub name: String,
    pub color: String,              // '#rrggbb'
    pub template: String,           // built-in template id
    pub start_date: Option<String>, // 'YYYY-MM-DD'
    pub deadline: Option<String>,   // 'YYYY-MM-DD'
    pub buffer_days: i64,
    pub plan_date: Option<String>, // deadline minus buffer days: when the plan aims to finish
    pub is_archived: bool,
    pub sort_order: f64,
    // Totals over the project's tasks, for the sidebar and the project header.
    pub task_count: i64,
    pub done_count: i64,
    pub estimate_minutes: i64,      // sum of estimates
    pub done_estimate_minutes: i64, // sum of estimates of done tasks
}

pub const PROJECT_COLUMNS: &str = "p.id, p.name, p.color, p.template, p.start_date, p.deadline, \
     p.buffer_days, date(p.deadline, printf('-%d days', p.buffer_days)), \
     p.is_archived, p.sort_order, \
     (SELECT count(*) FROM tasks t WHERE t.project_id = p.id), \
     (SELECT count(*) FROM tasks t WHERE t.project_id = p.id AND t.done_at IS NOT NULL), \
     (SELECT coalesce(sum(t.estimate_minutes), 0) FROM tasks t WHERE t.project_id = p.id), \
     (SELECT coalesce(sum(t.estimate_minutes), 0) FROM tasks t \
        WHERE t.project_id = p.id AND t.done_at IS NOT NULL)";

impl Project {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            name: row.get(1)?,
            color: row.get(2)?,
            template: row.get(3)?,
            start_date: row.get(4)?,
            deadline: row.get(5)?,
            buffer_days: row.get(6)?,
            plan_date: row.get(7)?,
            is_archived: row.get(8)?,
            sort_order: row.get(9)?,
            task_count: row.get(10)?,
            done_count: row.get(11)?,
            estimate_minutes: row.get(12)?,
            done_estimate_minutes: row.get(13)?,
        })
    }
}

/// A group of a project's tasks. With an end date it is a phase: the safety
/// line plans its tasks between the previous phase's end and its own.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Module {
    pub id: i64,
    pub project_id: i64,
    pub name: String,
    pub sort_order: f64,
    pub end_date: Option<String>,    // 'YYYY-MM-DD'
    pub budget_minutes: Option<i64>, // time planned for the phase, for tasks without estimates
}

pub const MODULE_COLUMNS: &str = "id, project_id, name, sort_order, end_date, budget_minutes";

impl Module {
    pub fn from_row(row: &Row) -> rusqlite::Result<Self> {
        Ok(Self {
            id: row.get(0)?,
            project_id: row.get(1)?,
            name: row.get(2)?,
            sort_order: row.get(3)?,
            end_date: row.get(4)?,
            budget_minutes: row.get(5)?,
        })
    }
}
