//! One round of the shell loop's text, as counters. Lines that do not
//! parse are skipped: a busybox `df` or a kernel with extra columns should
//! cost a reading, not the whole sample.

use crate::entity::monitor::{GpuProcess, GpuSample};

/// Jiffies a CPU spent busy, out of all it counted.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct CpuTimes {
    pub busy: u64,
    pub total: u64,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct DiskIo {
    pub name: String,
    pub read_sectors: u64,
    pub written_sectors: u64,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct DfRow {
    pub source: String,
    pub kind: String,
    pub total_kb: u64,
    pub available_kb: u64,
    pub mount: String,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct Round {
    pub cpu: CpuTimes,
    pub cores: Vec<CpuTimes>,
    pub mem_total_kb: u64,
    pub mem_available_kb: u64,
    pub swap_total_kb: u64,
    pub swap_free_kb: u64,
    pub disks: Vec<DiskIo>,
    pub df: Vec<DfRow>,
    pub gpus: Vec<GpuSample>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Info {
    pub host_name: String,
    pub os: String,
    pub cpu_model: String,
    pub threads: u32,
}

/// The `@info` lines, in the order the script prints them.
pub fn parse_info(lines: &[String]) -> Info {
    let at = |i: usize| {
        lines
            .get(i)
            .map(|l| l.trim().to_string())
            .unwrap_or_default()
    };
    Info {
        host_name: at(0),
        os: at(1),
        cpu_model: at(2),
        threads: at(3).parse().unwrap_or(1),
    }
}

/// "cpu  user nice system idle iowait irq softirq steal guest guest_nice"
fn cpu_times(fields: &[&str]) -> CpuTimes {
    let n: Vec<u64> = fields.iter().map(|f| f.parse().unwrap_or(0)).collect();
    let get = |i: usize| n.get(i).copied().unwrap_or(0);
    let total: u64 = (0..8).map(get).sum(); // guest time is already inside user
    let idle = get(3) + get(4);
    CpuTimes {
        busy: total.saturating_sub(idle),
        total,
    }
}

fn meminfo(round: &mut Round, line: &str) {
    let mut parts = line.split_whitespace();
    let (Some(key), Some(value)) = (parts.next(), parts.next()) else {
        return;
    };
    let kb = value.parse().unwrap_or(0);
    match key {
        "MemTotal:" => round.mem_total_kb = kb,
        "MemAvailable:" => round.mem_available_kb = kb,
        "SwapTotal:" => round.swap_total_kb = kb,
        "SwapFree:" => round.swap_free_kb = kb,
        _ => {}
    }
}

/// "major minor name reads merged sectors_read ms writes merged sectors_written ..."
fn disk(fields: &[&str]) -> Option<DiskIo> {
    Some(DiskIo {
        name: fields.get(2)?.to_string(),
        read_sectors: fields.get(5)?.parse().ok()?,
        written_sectors: fields.get(9)?.parse().ok()?,
    })
}

/// "source type 1024-blocks used available capacity mount" (mount may hold spaces)
fn df(fields: &[&str]) -> Option<DfRow> {
    Some(DfRow {
        source: fields.first()?.to_string(),
        kind: fields.get(1)?.to_string(),
        total_kb: fields.get(2)?.parse().ok()?,
        available_kb: fields.get(4)?.parse().ok()?,
        mount: fields.get(6..)?.join(" "),
    })
}

/// nvidia-smi csv: index, name, util, mem used, mem total (MiB), temp,
/// power draw, power limit, fan, graphics clock, uuid. "[N/A]" reads as
/// None. The uuid ties the card to its programs in `@apps`.
fn gpu(line: &str) -> Option<(GpuSample, String)> {
    let f: Vec<&str> = line.split(',').map(str::trim).collect();
    let num = |i: usize| f.get(i).and_then(|v| v.parse::<f64>().ok());
    let mib = |i: usize| num(i).map(|v| (v * 1024.0 * 1024.0) as u64);
    let uuid = f.get(10).map(|v| v.to_string()).unwrap_or_default();
    let sample = GpuSample {
        index: f.first()?.parse().ok()?,
        name: f.get(1)?.to_string(),
        usage: num(2).map(|v| v as f32),
        memory_used: mib(3),
        memory_total: mib(4),
        temperature: num(5).map(|v| v as u32),
        power_watts: num(6).map(|v| v as f32),
        power_limit_watts: num(7).map(|v| v as f32),
        fan_percent: num(8).map(|v| v as u32),
        clock_mhz: num(9).map(|v| v as u32),
        processes: Vec::new(),
    };
    Some((sample, uuid))
}

/// "gpu_uuid, pid, used_memory (MiB)"
fn app(line: &str) -> Option<(String, GpuProcess)> {
    let f: Vec<&str> = line.split(',').map(str::trim).collect();
    let process = GpuProcess {
        pid: f.get(1)?.parse().ok()?,
        gpu_memory: f
            .get(2)
            .and_then(|v| v.parse::<u64>().ok())
            .map(|mib| mib * 1024 * 1024),
        ..GpuProcess::default()
    };
    Some((f.first()?.to_string(), process))
}

/// "pid user seconds"
fn ps(line: &str) -> Option<(u32, String, Option<u64>)> {
    let mut f = line.split_whitespace();
    let pid = f.next()?.parse().ok()?;
    let user = f.next()?.to_string();
    Some((pid, user, f.next().and_then(|s| s.parse().ok())))
}

/// gpustat's line "[0] name | 77°C, 100 % | 28.2 / 48.0 GB | alice/123(28.1G) bob:python/456(1G)":
/// each program after the last "|" as (pid, user).
fn owners(line: &str) -> Vec<(u32, String)> {
    let Some((_, programs)) = line.rsplit_once('|') else {
        return Vec::new();
    };
    programs
        .split_whitespace()
        .filter_map(|p| {
            let (who, rest) = p.rsplit_once('/')?;
            let pid = rest.split('(').next()?.parse().ok()?;
            let user = who.split(':').next()?;
            (!user.is_empty()).then(|| (pid, user.to_string()))
        })
        .collect()
}

/// The text of one round, section markers included.
pub fn parse_round(text: &str) -> Round {
    let mut round = Round::default();
    let mut uuids = Vec::new();
    let mut apps = Vec::new();
    let mut procs = Vec::new();
    let mut owned = Vec::new();
    let mut section = "";
    for line in text.lines() {
        if let Some(name) = line.strip_prefix('@') {
            section = name.trim();
            continue;
        }
        let fields: Vec<&str> = line.split_whitespace().collect();
        match section {
            "stat" => match fields.first() {
                Some(&"cpu") => round.cpu = cpu_times(&fields[1..]),
                Some(name) if name.starts_with("cpu") => {
                    round.cores.push(cpu_times(&fields[1..]));
                }
                _ => {}
            },
            "mem" => meminfo(&mut round, line),
            "disk" => round.disks.extend(disk(&fields)),
            "df" => round.df.extend(df(&fields)),
            "gpu" => {
                if let Some((sample, uuid)) = gpu(line) {
                    round.gpus.push(sample);
                    uuids.push(uuid);
                }
            }
            "apps" => apps.extend(app(line)),
            "ps" => procs.extend(ps(line)),
            "owners" => owned.extend(owners(line)),
            _ => {}
        }
    }
    for (uuid, mut process) in apps {
        let Some(i) = uuids.iter().position(|u| *u == uuid) else {
            continue;
        };
        if let Some((_, user, secs)) = procs.iter().find(|p| p.0 == process.pid) {
            process.user = user.clone();
            process.running_secs = *secs;
        } else if let Some((_, user)) = owned.iter().find(|o| o.0 == process.pid) {
            process.user = user.clone();
        }
        round.gpus[i].processes.push(process);
    }
    round
}

#[cfg(test)]
pub mod tests {
    use super::*;

    /// One round as the script prints it (also used by `compute`'s tests).
    pub const ROUND: &str = "\
@stat
cpu  100 0 50 800 50 0 0 0 0 0
cpu0 50 0 25 400 25 0 0 0 0 0
cpu1 50 0 25 400 25 0 0 0 0 0
@mem
MemTotal:       16000000 kB
MemAvailable:    4000000 kB
SwapTotal:       2000000 kB
SwapFree:        1500000 kB
@disk
   8       0 sda 100 0 2000 0 50 0 4000 0 0 0 0
   8       1 sda1 90 0 1800 0 40 0 3000 0 0 0 0
@df
/dev/sda1 ext4 1000000 400000 600000 40% /
/dev/sdb1 xfs 2000000 0 2000000 0% /data sets
tmpfs tmpfs 100 0 100 0% /run
@gpu
0, NVIDIA A100-SXM4-80GB, 45, 1024, 81920, 55, 210.50, 400.00, [N/A], 1410, GPU-aaa
@apps
GPU-aaa, 4242, 1000
GPU-aaa, 777, [N/A]
@ps
 4242 alice     3600
@owners
[0] NVIDIA A100-SXM4-80GB | 55°C,  45 % | 1.0 / 80.0 GB | alice/4242(1.0G) bob:python/777(2.0G)
";

    #[test]
    fn a_round_reads_every_section() {
        let r = parse_round(ROUND);
        assert_eq!(
            r.cpu,
            CpuTimes {
                busy: 150,
                total: 1000
            }
        );
        assert_eq!(r.cores.len(), 2);
        assert_eq!(
            (r.mem_total_kb, r.mem_available_kb),
            (16_000_000, 4_000_000)
        );
        assert_eq!((r.swap_total_kb, r.swap_free_kb), (2_000_000, 1_500_000));
        assert_eq!(r.disks[0].read_sectors, 2000);
        assert_eq!(r.df[1].mount, "/data sets");
        let gpu = &r.gpus[0];
        assert_eq!(gpu.name, "NVIDIA A100-SXM4-80GB");
        assert_eq!(gpu.memory_total, Some(81920 * 1024 * 1024));
        assert_eq!((gpu.fan_percent, gpu.clock_mhz), (None, Some(1410)));
    }

    #[test]
    fn programs_are_tied_to_their_card_and_process() {
        let r = parse_round(ROUND);
        let procs = &r.gpus[0].processes;
        assert_eq!(procs.len(), 2);
        assert_eq!(
            procs[0],
            GpuProcess {
                pid: 4242,
                user: "alice".into(),
                gpu_memory: Some(1000 * 1024 * 1024),
                running_secs: Some(3600),
            }
        );
        // Hidden from ps (hidepid): the user comes from root's gpustat cache.
        assert_eq!((procs[1].pid, procs[1].user.as_str()), (777, "bob"));
        assert_eq!((procs[1].gpu_memory, procs[1].running_secs), (None, None));
    }

    #[test]
    fn gpustat_lines_name_each_programs_owner() {
        assert_eq!(
            owners("[1] RTX 4090 D | 77°C, 100 % | 14.6 / 48.0 GB | sachith/1280265(14.6G)"),
            vec![(1_280_265, "sachith".to_string())]
        );
        assert!(owners("[2] RTX 4090 D | 30°C,   0 % |  0.0 / 48.0 GB |").is_empty());
    }

    #[test]
    fn a_card_without_a_uuid_still_reads() {
        let r = parse_round(
            "@gpu
0, RTX 3080, 5, 10, 10240, 40, 20, 320, 0, 300
",
        );
        assert_eq!(r.gpus.len(), 1);
        assert!(r.gpus[0].processes.is_empty());
    }

    #[test]
    fn info_falls_back_on_a_missing_thread_count() {
        let info = parse_info(&["gpu1".into(), "Linux 6.8.0".into(), " AMD EPYC".into()]);
        assert_eq!(info.host_name, "gpu1");
        assert_eq!(info.cpu_model, "AMD EPYC");
        assert_eq!(info.threads, 1);
    }
}
