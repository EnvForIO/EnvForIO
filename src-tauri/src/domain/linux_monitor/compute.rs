//! Two rounds of counters into a `Sample`: CPU shares, traffic and disk
//! rates, and per-process CPU all come from the difference between them.
//! Without a previous round, CPU reads as the average since boot and the
//! rates as zero.

use std::collections::HashMap;
use std::time::Duration;

use super::parse::{CpuTimes, Info, Round};
use crate::domain::monitor::{busiest, group_processes, per_second, ProcessRow};
use crate::entity::monitor::{CpuSample, DiskIoSample, Drive, MemorySample, NetworkSample, Sample};

/// How many leaders by CPU and memory are sent (as for the local machine).
const TOP: usize = 12;
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

/// Adapters whose traffic another adapter also counts, or that only carry
/// containers' traffic inside the machine.
fn counted(iface: &str) -> bool {
    !["lo", "docker", "veth", "br-", "virbr", "cni", "flannel"]
        .iter()
        .any(|p| iface.starts_with(p))
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

pub fn sample(
    prev: Option<&Round>,
    cur: &Round,
    elapsed: Duration,
    info: &Info,
    at_ms: u64,
) -> Sample {
    let base = prev.cloned().unwrap_or_default();
    let delta = |f: &dyn Fn(&Round) -> u64| f(cur).saturating_sub(f(&base));
    let rated = |bytes: u64| {
        if prev.is_some() {
            per_second(bytes, elapsed)
        } else {
            0
        }
    };

    let net = |r: &Round, sent: bool| {
        r.ifaces
            .iter()
            .filter(|i| counted(&i.name))
            .map(|i| if sent { i.sent } else { i.received })
            .sum::<u64>()
    };
    let disk = |r: &Round, written: bool| {
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
    };

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

    let before: HashMap<u32, u64> = base.procs.iter().map(|p| (p.pid, p.ticks)).collect();
    let seconds = elapsed.as_secs_f64().max(0.001);
    let ticks = info.clock_ticks.max(1) as f64;
    let rows = cur.procs.iter().map(|p| ProcessRow {
        name: p.comm.clone(),
        cpu: match before.get(&p.pid) {
            Some(&was) => (p.ticks.saturating_sub(was) as f64 / ticks / seconds * 100.0) as f32,
            None => 0.0,
        },
        memory: p.rss_pages * info.page_size,
        gpu: None,
    });
    let groups = group_processes(rows, info.threads as usize);

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
        gpu_from_processes: None,
        network: NetworkSample {
            received: rated(delta(&|r| net(r, false))),
            sent: rated(delta(&|r| net(r, true))),
        },
        disk: DiskIoSample {
            read: rated(delta(&|r| disk(r, false))),
            written: rated(delta(&|r| disk(r, true))),
        },
        drives,
        processes: busiest(groups, TOP),
        error: None,
    }
}

#[cfg(test)]
mod tests {
    use super::super::parse::{parse_round, Proc};
    use super::*;

    fn info() -> Info {
        Info {
            threads: 2,
            clock_ticks: 100,
            page_size: 4096,
            ..Info::default()
        }
    }

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
        second.ifaces[1].received += 2000; // eth0
        second.ifaces[0].received += 9999; // lo, not counted
        second.disks[0].written_sectors += 4; // sda
        second.disks[1].written_sectors += 4; // sda1, not counted again
        second.procs[1] = Proc {
            ticks: 9000 + 150,
            ..second.procs[1].clone()
        };

        let s = sample(Some(&first), &second, Duration::from_secs(2), &info(), 7);
        assert_eq!(s.cpu.usage, 50.0);
        assert_eq!(s.network.received, 1000);
        assert_eq!(s.disk.written, 4 * 512 / 2);
        assert_eq!(s.memory.used, 12_000_000 * 1024);
        let mounts: Vec<&str> = s.drives.iter().map(|d| d.mount.as_str()).collect();
        assert_eq!(mounts, vec!["/", "/data sets"]);
        // 150 ticks over 2 s at 100 ticks/s = 75% of one core = 37.5% of two.
        let python = s
            .processes
            .iter()
            .find(|p| p.name == "python train.py")
            .unwrap();
        assert_eq!(python.cpu, 37.5);
        assert_eq!(python.memory, 25_000 * 4096);
        assert_eq!(s.gpus.len(), 1);
    }

    #[test]
    fn the_first_round_has_no_rates() {
        let only = parse_round(super::super::parse::tests::ROUND);
        let s = sample(None, &only, Duration::from_secs(1), &info(), 1);
        assert_eq!((s.network.received, s.disk.read), (0, 0));
        assert_eq!(s.cpu.usage, 15.0); // since boot
    }
}
