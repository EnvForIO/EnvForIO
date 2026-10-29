//! The machines on the monitor's overview: listed in the order they were
//! added, added and removed by hand. A machine is a `MonitorTarget`,
//! stored as its kind and name.

use rusqlite::{params, Connection};

use crate::entity::monitor::MonitorTarget;
use crate::errors::AppResult;

fn row(target: &MonitorTarget) -> (&'static str, &str) {
    match target {
        MonitorTarget::Local => ("local", ""),
        MonitorTarget::Wsl { distro } => ("wsl", distro),
        MonitorTarget::Ssh { host } => ("ssh", host),
    }
}

fn target(kind: &str, name: String) -> Option<MonitorTarget> {
    match kind {
        "local" => Some(MonitorTarget::Local),
        "wsl" => Some(MonitorTarget::Wsl { distro: name }),
        "ssh" => Some(MonitorTarget::Ssh { host: name }),
        _ => None,
    }
}

pub fn list(conn: &Connection) -> AppResult<Vec<MonitorTarget>> {
    let mut stmt = conn.prepare("SELECT kind, name FROM machines ORDER BY sort_order, id")?;
    let rows = stmt.query_map([], |r| Ok((r.get::<_, String>(0)?, r.get::<_, String>(1)?)))?;
    let mut machines = Vec::new();
    for row in rows {
        let (kind, name) = row?;
        machines.extend(target(&kind, name));
    }
    Ok(machines)
}

/// Add at the end; adding one already there changes nothing.
pub fn add(conn: &Connection, machine: &MonitorTarget) -> AppResult<Vec<MonitorTarget>> {
    let (kind, name) = row(machine);
    conn.execute(
        "INSERT INTO machines (kind, name, sort_order)
         VALUES (?1, ?2, (SELECT coalesce(max(sort_order), 0) + 1 FROM machines))
         ON CONFLICT (kind, name) DO NOTHING",
        params![kind, name.trim()],
    )?;
    list(conn)
}

pub fn remove(conn: &Connection, machine: &MonitorTarget) -> AppResult<Vec<MonitorTarget>> {
    let (kind, name) = row(machine);
    conn.execute(
        "DELETE FROM machines WHERE kind = ?1 AND name = ?2",
        params![kind, name],
    )?;
    list(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;

    #[test]
    fn this_pc_comes_first_then_machines_in_the_order_added() {
        let conn = open_in_memory();
        assert_eq!(list(&conn).unwrap(), vec![MonitorTarget::Local]);

        let gpu1 = MonitorTarget::Ssh {
            host: "gpu1".into(),
        };
        let wsl = MonitorTarget::Wsl {
            distro: "Ubuntu-24.04".into(),
        };
        add(&conn, &gpu1).unwrap();
        add(&conn, &wsl).unwrap();
        let again = add(&conn, &gpu1).unwrap();
        assert_eq!(again, vec![MonitorTarget::Local, gpu1.clone(), wsl.clone()]);

        assert_eq!(
            remove(&conn, &MonitorTarget::Local).unwrap(),
            vec![gpu1, wsl]
        );
    }
}
