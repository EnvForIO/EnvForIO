//! Pure helpers for monitor samples: per-second rates, grouping processes by
//! program, and picking the busiest ones to send to the UI.

use std::collections::HashMap;
use std::time::Duration;

use crate::entity::monitor::ProcessGroup;

/// One process as a source reads it. `cpu` is % of one core, as sysinfo
/// reports it (it can pass 100 on a multi-core machine).
#[derive(Debug, Clone, PartialEq)]
pub struct ProcessRow {
    pub name: String,
    pub cpu: f32,
    pub memory: u64,
    pub gpu: Option<f32>,
}

/// Bytes counted over `elapsed`, as bytes per second.
pub fn per_second(bytes: u64, elapsed: Duration) -> u64 {
    let ms = elapsed.as_millis().max(1);
    (u128::from(bytes) * 1000 / ms) as u64
}

/// "chrome.exe" and "Chrome.exe" are one program, shown as "chrome".
fn program(name: &str) -> String {
    let lower = name.to_lowercase();
    lower.strip_suffix(".exe").unwrap_or(&lower).to_string()
}

/// Add up processes of the same program; CPU becomes % of the whole machine.
pub fn group_processes(
    rows: impl IntoIterator<Item = ProcessRow>,
    cores: usize,
) -> Vec<ProcessGroup> {
    let cores = cores.max(1) as f32;
    let mut groups: HashMap<String, ProcessGroup> = HashMap::new();
    for row in rows {
        let key = program(&row.name);
        let group = groups.entry(key.clone()).or_insert_with(|| ProcessGroup {
            name: key,
            ..ProcessGroup::default()
        });
        group.count += 1;
        group.cpu += row.cpu / cores;
        group.memory += row.memory;
        if let Some(gpu) = row.gpu {
            group.gpu = Some(group.gpu.unwrap_or(0.0) + gpu);
        }
    }
    groups.into_values().collect()
}

/// The top `n` by CPU, by memory and by GPU, merged, busiest CPU first.
/// The UI re-sorts by whichever column the user picks.
pub fn busiest(groups: Vec<ProcessGroup>, n: usize) -> Vec<ProcessGroup> {
    let top = |key: &dyn Fn(&ProcessGroup) -> f64| {
        let mut idx: Vec<usize> = (0..groups.len()).collect();
        idx.sort_by(|&a, &b| key(&groups[b]).total_cmp(&key(&groups[a])));
        idx.truncate(n);
        idx
    };
    let mut keep: Vec<usize> = top(&|g| f64::from(g.cpu));
    keep.extend(top(&|g| g.memory as f64));
    keep.extend(top(&|g| f64::from(g.gpu.unwrap_or(0.0))));
    keep.sort_unstable();
    keep.dedup();
    let mut picked: Vec<ProcessGroup> = keep.into_iter().map(|i| groups[i].clone()).collect();
    picked.sort_by(|a, b| b.cpu.total_cmp(&a.cpu).then(b.memory.cmp(&a.memory)));
    picked
}

/// The machine's GPU use read from its processes: their sum, capped at 100.
/// `None` when no process reported any (the OS does not offer it).
pub fn gpu_from_processes(groups: &[ProcessGroup]) -> Option<f32> {
    let reported: Vec<f32> = groups.iter().filter_map(|g| g.gpu).collect();
    if reported.is_empty() {
        return None;
    }
    Some(reported.iter().sum::<f32>().min(100.0))
}

#[cfg(test)]
mod tests {
    use super::*;

    fn row(name: &str, cpu: f32, memory: u64, gpu: Option<f32>) -> ProcessRow {
        ProcessRow {
            name: name.into(),
            cpu,
            memory,
            gpu,
        }
    }

    #[test]
    fn rates_are_per_second() {
        assert_eq!(per_second(3000, Duration::from_millis(1500)), 2000);
        assert_eq!(per_second(5, Duration::ZERO), 5000);
    }

    #[test]
    fn processes_group_by_program_and_share_the_machine() {
        let groups = group_processes(
            [
                row("chrome.exe", 40.0, 100, Some(2.0)),
                row("Chrome.exe", 40.0, 50, None),
                row("code", 8.0, 10, None),
            ],
            8,
        );
        let chrome = groups.iter().find(|g| g.name == "chrome").unwrap();
        assert_eq!(
            (chrome.count, chrome.cpu, chrome.memory, chrome.gpu),
            (2, 10.0, 150, Some(2.0))
        );
        assert_eq!(groups.iter().find(|g| g.name == "code").unwrap().gpu, None);
    }

    #[test]
    fn the_busiest_merge_cpu_memory_and_gpu_leaders() {
        let g = |name: &str, cpu: f32, memory: u64, gpu: Option<f32>| ProcessGroup {
            name: name.into(),
            count: 1,
            cpu,
            memory,
            gpu,
        };
        let picked = busiest(
            vec![
                g("idle", 0.0, 1, None),
                g("cpu", 50.0, 1, None),
                g("ram", 1.0, 900, None),
                g("game", 2.0, 2, Some(80.0)),
            ],
            1,
        );
        let names: Vec<&str> = picked.iter().map(|p| p.name.as_str()).collect();
        assert_eq!(names, vec!["cpu", "game", "ram"]);
        assert_eq!(gpu_from_processes(&picked), Some(80.0));
        assert_eq!(gpu_from_processes(&[g("x", 1.0, 1, None)]), None);
    }
}
