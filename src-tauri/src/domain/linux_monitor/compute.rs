//! Two rounds of counters into a `Sample`: CPU shares and disk rates come
//! from the difference between them. Without a previous round, CPU reads
//! as the average since boot and the disk rates as zero.

use std::time::Duration;

use super::parse::{CpuTimes, Round};
use crate::domain::monitor::per_second;
use crate::entity::monitor::{CpuSample, DiskIoSample, Drive, MemorySample, Sample};

const SECTOR: u64 = 512;

/// File systems that are not drives: memory, containers, kernel views,
/// WSL's own root image and its view of the Windows drives (shown already
/// by This PC), and snap packages.
const NOT_DRIVES: [&str; 14] = [
    "tmpfs",
    "devtmpfs",
    "overlay",
    "squashfs",
    "proc",
    "sysfs",
    "cgroup",
    "cgroup2",
    "9p",
    "drvfs",
    "none",
    "efivarfs",
    "rootfs",
    "fuse.snapfuse",
];

fn share(prev: CpuTimes, cur: CpuTimes) -> f32 {
    let total = cur.total.saturating_sub(prev.total);
    if total == 0 {
        return 0.0;
    }
    (cur.busy.saturating_sub(prev.busy) as f64 / total as f64 * 100.0) as f32
}

/// Whole disks only, so a partition's I/O is not counted twice.
fn whole_disk(name: &str) -> bool {
    let trailing_digits = name.chars().rev().take_while(char::is_ascii_digit).count();
    let stem = &name[..name.len() - trailing_digits];
    // nvme0n1 and mmcblk0 are disks; their partitions are nvme0n1p1, mmcblk0p1.
    if name.starts_with("nvme") || name.starts_with("mmcblk") {
        return !name.contains('p');
    }
    ["sd", "vd", "xvd", "hd"]
        .iter()
        .any(|p| stem.starts_with(p))
        && trailing_digits == 0
}

/// Bytes read (or written) by whole disks since boot.
fn disk_bytes(r: &Round, written: bool) -> u64 {
    r.disks
        .iter()
        .filter(|d| whole_disk(&d.name))
        .map(|d| {
            if written {
                d.written_sectors
            } else {
                d.read_sectors
            }
        })
        .sum::<u64>()
        * SECTOR
}

fn drives(cur: &Round) -> Vec<Drive> {
    let mut drives: Vec<Drive> = Vec::new();
    for row in &cur.df {
        let skip = NOT_DRIVES.contains(&row.kind.as_str())
            || row.source.starts_with("/dev/loop")
            || row.total_kb == 0
            || drives.iter().any(|d| d.name == row.source);
        if !skip {
            drives.push(Drive {
                name: row.source.clone(),
                mount: row.mount.clone(),
                total: row.total_kb * 1024,
                available: row.available_kb * 1024,
                removable: false,
            });
        }
    }
    drives
}

pub fn sample(prev: Option<&Round>, cur: &Round, elapsed: Duration, at_ms: u64) -> Sample {
    let base = prev.cloned().unwrap_or_default();
    let rate = |written: bool| match prev {
        Some(_) => per_second(
            disk_bytes(cur, written).saturating_sub(disk_bytes(&base, written)),
            elapsed,
        ),
        None => 0,
    };

    Sample {
        at_ms,
        cpu: CpuSample {
            usage: share(base.cpu, cur.cpu),
            cores: cur
                .cores
                .iter()
                .enumerate()
                .map(|(i, c)| share(base.cores.get(i).copied().unwrap_or_default(), *c))
                .collect(),
            frequency_mhz: 0,
        },
        memory: MemorySample {
            used: cur.mem_total_kb.saturating_sub(cur.mem_available_kb) * 1024,
            total: cur.mem_total_kb * 1024,
            swap_used: cur.swap_total_kb.saturating_sub(cur.swap_free_kb) * 1024,
            swap_total: cur.swap_total_kb * 1024,
        },
        gpus: cur.gpus.clone(),
        disk: DiskIoSample {
            read: rate(false),
            written: rate(true),
        },
        drives: drives(cur),
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::super::parse::parse_round;
    use super::*;

    #[test]
    fn whole_disks_are_told_from_partitions() {
        for disk in ["sda", "vdb", "nvme0n1", "mmcblk0"] {
            assert!(whole_disk(disk), "{disk}");
        }
        for part in ["sda1", "nvme0n1p2", "mmcblk0p1", "loop0", "dm-0"] {
            assert!(!whole_disk(part), "{part}");
        }
    }

    #[test]
    fn two_rounds_give_shares_and_rates() {
        let first = parse_round(super::super::parse::tests::ROUND);
        let mut second = first.clone();
        second.cpu = CpuTimes {
            busy: 150 + 50,
            total: 1000 + 100,
        };
        second.disks[0].written_sectors += 4; // sda
        second.disks[1].written_sectors += 4; // sda1, not counted again

        let s = sample(Some(&first), &second, Duration::from_secs(2), 7);
        assert_eq!(s.cpu.usage, 50.0);
        assert_eq!(s.disk.written, 4 * 512 / 2);
        assert_eq!(s.memory.used, 12_000_000 * 1024);
        let mounts: Vec<&str> = s.drives.iter().map(|d| d.mount.as_str()).collect();
        assert_eq!(mounts, vec!["/", "/data sets"]);
        assert_eq!(s.gpus.len(), 1);
    }

    #[test]
    fn the_first_round_has_no_rates() {
        let only = parse_round(super::super::parse::tests::ROUND);
        let s = sample(None, &only, Duration::from_secs(1), 1);
        assert_eq!(s.disk.read, 0);
        assert_eq!(s.cpu.usage, 15.0); // since boot
    }
}
