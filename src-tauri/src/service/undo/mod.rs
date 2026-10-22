//! Undo for task changes.
//!
//! Before a command changes tasks, the API layer snapshots each affected
//! task (its row, steps and timer sessions). Undo puts the snapshots back:
//! a task that did not exist before is deleted again, any other is restored
//! exactly. The stack lives in memory and holds the last 50 changes.

use rusqlite::types::Value;
use rusqlite::{params, params_from_iter, Connection};

use crate::errors::{AppError, AppResult};

const LIMIT: usize = 50;

/// A table's rows as (column names, values per row).
type Rows = (Vec<String>, Vec<Vec<Value>>);

#[derive(Debug, Clone)]
pub struct Snapshot {
    task: Rows,
    steps: Rows,
    sessions: Rows,
}

#[derive(Debug, Clone)]
pub struct Change {
    pub label: String,
    /// Each affected task and how it was before (None = it did not exist).
    tasks: Vec<(i64, Option<Snapshot>)>,
}

#[derive(Debug, Default)]
pub struct UndoStack(Vec<Change>);

fn rows(conn: &Connection, sql: &str, id: i64) -> AppResult<Rows> {
    let mut stmt = conn.prepare(sql)?;
    let columns: Vec<String> = stmt.column_names().iter().map(|c| c.to_string()).collect();
    let n = columns.len();
    let values = stmt
        .query_map(params![id], |r| {
            (0..n).map(|i| r.get::<_, Value>(i)).collect()
        })?
        .collect::<Result<Vec<Vec<Value>>, _>>()?;
    Ok((columns, values))
}

/// How a task is right now, or None if it does not exist.
pub fn snapshot(conn: &Connection, id: i64) -> AppResult<Option<Snapshot>> {
    let task = rows(conn, "SELECT * FROM tasks WHERE id = ?1", id)?;
    if task.1.is_empty() {
        return Ok(None);
    }
    Ok(Some(Snapshot {
        task,
        steps: rows(conn, "SELECT * FROM task_steps WHERE task_id = ?1", id)?,
        sessions: rows(conn, "SELECT * FROM time_entries WHERE task_id = ?1", id)?,
    }))
}

fn insert(conn: &Connection, table: &str, (columns, values): &Rows) -> AppResult<()> {
    let marks = vec!["?"; columns.len()].join(", ");
    let sql = format!(
        "INSERT INTO {table} ({}) VALUES ({marks})",
        columns.join(", ")
    );
    for row in values {
        conn.execute(&sql, params_from_iter(row.iter()))?;
    }
    Ok(())
}

impl UndoStack {
    /// Remember how `ids` are now, before `label` changes them.
    pub fn record(&mut self, conn: &Connection, label: &str, ids: &[i64]) -> AppResult<()> {
        let tasks = ids
            .iter()
            .map(|id| Ok((*id, snapshot(conn, *id)?)))
            .collect::<AppResult<Vec<_>>>()?;
        self.push(Change {
            label: label.into(),
            tasks,
        });
        Ok(())
    }

    /// Remember that `id` was just created (undo deletes it).
    pub fn record_created(&mut self, label: &str, id: i64) {
        self.push(Change {
            label: label.into(),
            tasks: vec![(id, None)],
        });
    }

    /// Add a created task to the most recent change (one action, several tasks).
    pub fn also_created(&mut self, id: i64) {
        if let Some(last) = self.0.last_mut() {
            last.tasks.push((id, None));
        }
    }

    /// Forget the most recent change (it failed before changing anything).
    pub fn discard_last(&mut self) {
        self.0.pop();
    }

    fn push(&mut self, change: Change) {
        self.0.push(change);
        if self.0.len() > LIMIT {
            self.0.remove(0);
        }
    }

    /// What the next undo would undo.
    pub fn peek(&self) -> Option<String> {
        self.0.last().map(|c| c.label.clone())
    }

    /// Undo the most recent change; returns its label.
    pub fn undo(&mut self, conn: &mut Connection) -> AppResult<String> {
        let change = self
            .0
            .pop()
            .ok_or_else(|| AppError::invalid("nothing to undo"))?;
        let tx = conn.transaction()?;
        for (id, before) in change.tasks.iter().rev() {
            // Steps and timer sessions go with the row (ON DELETE CASCADE).
            tx.execute("DELETE FROM tasks WHERE id = ?1", params![id])?;
            if let Some(s) = before {
                insert(&tx, "tasks", &s.task)?;
                insert(&tx, "task_steps", &s.steps)?;
                insert(&tx, "time_entries", &s.sessions)?;
            }
        }
        tx.commit()?;
        Ok(change.label)
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use crate::service::tasks::mutation::{add_step, create, delete, set_done};
    use crate::service::tasks::query::{self, TaskView};

    #[test]
    fn undo_restores_deleted_tasks_with_steps_and_removes_created_ones() {
        let mut conn = open_in_memory();
        let mut stack = UndoStack::default();
        let t = create(&conn, "draft", TaskView::Tasks, "2026-11-20").unwrap();
        stack.record_created("add", t.id);
        add_step(&conn, t.id, "outline").unwrap();

        stack.record(&conn, "done", &[t.id]).unwrap();
        set_done(&conn, t.id, true).unwrap();
        stack.record(&conn, "delete", &[t.id]).unwrap();
        delete(&conn, t.id).unwrap();

        assert_eq!(stack.undo(&mut conn).unwrap(), "delete");
        let back = query::get(&conn, t.id).unwrap();
        assert_eq!((back.title.as_str(), back.step_count), ("draft", 1));
        assert!(back.done_at.is_some());

        stack.undo(&mut conn).unwrap(); // un-done
        assert!(query::get(&conn, t.id).unwrap().done_at.is_none());
        stack.undo(&mut conn).unwrap(); // un-created
        assert!(query::get(&conn, t.id).is_err());
        assert!(stack.undo(&mut conn).is_err());
    }
}
