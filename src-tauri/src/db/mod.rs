//! Opening the SQLite database and bringing its schema up to date.
//!
//! Migrations are the numbered files in `src-tauri/migrations/`, compiled into
//! the binary. `PRAGMA user_version` records how many have run, so each one
//! runs exactly once. Never edit a migration that has shipped; add a new one.

use std::path::Path;

use rusqlite::Connection;

use crate::errors::AppResult;

/// Every migration in order. The version of a migration is its index + 1.
const MIGRATIONS: &[&str] = &[
    include_str!("../../migrations/0001_initial_schema.sql"),
    include_str!("../../migrations/0002_projects.sql"),
    include_str!("../../migrations/0003_capacity.sql"),
    include_str!("../../migrations/0004_day_notes.sql"),
    include_str!("../../migrations/0005_time_entries.sql"),
    include_str!("../../migrations/0006_planning.sql"),
];

/// Open (or create) the database file and migrate it.
pub fn open(path: &Path) -> AppResult<Connection> {
    let mut conn = Connection::open(path)?;
    configure(&conn)?;
    migrate(&mut conn)?;
    Ok(conn)
}

/// An in-memory database with the full schema, for tests.
#[cfg(test)]
pub fn open_in_memory() -> Connection {
    let mut conn = Connection::open_in_memory().expect("in-memory database");
    configure(&conn).expect("configure");
    migrate(&mut conn).expect("migrate");
    conn
}

fn configure(conn: &Connection) -> AppResult<()> {
    // WAL keeps reads fast while a write is in progress; foreign keys are off by default in SQLite.
    conn.pragma_update(None, "journal_mode", "WAL")?;
    conn.pragma_update(None, "foreign_keys", "ON")?;
    Ok(())
}

fn migrate(conn: &mut Connection) -> AppResult<()> {
    let current: usize = conn.pragma_query_value(None, "user_version", |row| row.get(0))?;
    for (index, sql) in MIGRATIONS.iter().enumerate().skip(current) {
        let version = index + 1;
        log::info!("running database migration {version}");
        // One transaction per migration: a failed migration leaves the previous version intact.
        let tx = conn.transaction()?;
        tx.execute_batch(sql)?;
        tx.pragma_update(None, "user_version", version)?;
        tx.commit()?;
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn migrations_run_once_and_set_the_version() {
        let mut conn = open_in_memory();
        let version: usize = conn
            .pragma_query_value(None, "user_version", |row| row.get(0))
            .unwrap();
        assert_eq!(version, MIGRATIONS.len());
        // Running again is a no-op rather than a "table already exists" error.
        migrate(&mut conn).unwrap();
    }
}
