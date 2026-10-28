//! One round of the shell loop's text, as counters. Lines that do not
//! parse are skipped: a busybox `df` or a kernel with extra columns should
//! cost a reading, not the whole sample.

use crate::entity::monitor::GpuSample;

/// Jiffies a CPU spent busy, out of all it counted.
#[derive(Debug, Clone, Copy, Default, PartialEq, Eq)]
pub struct CpuTimes {
    pub busy: u64,
    pub total: u64,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Iface {
    pub name: String,
    pub received: u64,
    pub sent: u64,
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

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Proc {
    pub pid: u32,
    pub ticks: u64, // user + system CPU time, in clock ticks
    pub rss_pages: u64,
    pub comm: String,
}

#[derive(Debug, Clone, Default, PartialEq)]
pub struct Round {
    pub cpu: CpuTimes,
    pub cores: Vec<CpuTimes>,
    pub mem_total_kb: u64,
    pub mem_available_kb: u64,
    pub swap_total_kb: u64,
    pub swap_free_kb: u64,
    pub ifaces: Vec<Iface>,
    pub disks: Vec<DiskIo>,
    pub df: Vec<DfRow>,
    pub procs: Vec<Proc>,
    pub gpus: Vec<GpuSample>,
}

#[derive(Debug, Clone, Default, PartialEq, Eq)]
pub struct Info {
    pub host_name: String,
    pub os: String,
    pub cpu_model: String,
    pub threads: u32,
    pub clock_ticks: u64,
    pub page_size: u64,
}

/// The `@info` lines, in the order the script prints them.
pub fn parse_info(lines: &[String]) -> Info {
    let at = |i: usize| {
        lines
            .get(i)
            .map(|l| l.trim().to_string())
            .unwrap_or_default()
    };
    let number = |i: usize, fallback: u64| at(i).parse().unwrap_or(fallback);
    Info {
        host_name: at(0),
        os: at(1),
        cpu_model: at(2),
        threads: number(3, 1) as u32,
        clock_ticks: number(4, 100),
        page_size: number(5, 4096),
    }
}

fn numbers(fields: &[&str]) -> Vec<u64> {
    fields.iter().map(|f| f.parse().unwrap_or(0)).collect()
}

/// "cpu  user nice system idle iowait irq softirq steal guest guest_nice"
fn cpu_times(fields: &[&str]) -> CpuTimes {
    let n = numbers(fields);
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

/// "  eth0: rx_bytes rx_packets ... (8 fields) tx_bytes ..."
fn iface(line: &str) -> Option<Iface> {
    let (name, rest) = line.split_once(':')?;
    let n: Vec<&str> = rest.split_whitespace().collect();
    Some(Iface {
        name: name.trim().to_string(),
        received: n.first()?.parse().ok()?,
        sent: n.get(8)?.parse().ok()?,
    })
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

/// "pid ticks rss_pages comm" (comm may hold spaces)
fn process(line: &str) -> Option<Proc> {
    let mut parts = line.splitn(4, ' ');
    Some(Proc {
        pid: parts.next()?.parse().ok()?,
        ticks: parts.next()?.parse().ok()?,
        rss_pages: parts.next()?.parse().ok()?,
        comm: parts.next()?.trim().to_string(),
    })
}

/// nvidia-smi csv: index, name, util, mem used, mem total (MiB), temp,
/// power draw, power limit, fan, graphics clock. "[N/A]" reads as None.
fn gpu(line: &str) -> Option<GpuSample> {
    let f: Vec<&str> = line.split(',').map(str::trim).collect();
    let num = |i: usize| f.get(i).and_then(|v| v.parse::<f64>().ok());
    let mib = |i: usize| num(i).map(|v| (v * 1024.0 * 1024.0) as u64);
    Some(GpuSample {
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
    })
}

/// The text of one round, section markers included.
pub fn parse_round(text: &str) -> Round {
    let mut round = Round::default();
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
            "net" => round.ifaces.extend(iface(line)),
            "disk" => round.disks.extend(disk(&fields)),
            "df" => round.df.extend(df(&fields)),
            "proc" => round.procs.extend(process(line)),
            "gpu" => round.gpus.extend(gpu(line)),
            _ => {}
        }
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
@net
    lo: 999 1 0 0 0 0 0 0 999 1 0 0 0 0 0 0
  eth0: 5000 10 0 0 0 0 0 0 3000 8 0 0 0 0 0 0
@disk
   8       0 sda 100 0 2000 0 50 0 4000 0 0 0 0
   8       1 sda1 90 0 1800 0 40 0 3000 0 0 0 0
@df
/dev/sda1 ext4 1000000 400000 600000 40% /
/dev/sdb1 xfs 2000000 0 2000000 0% /data sets
tmpfs tmpfs 100 0 100 0% /run
@proc
1 500 100 systemd
42 9000 25000 python train.py
@gpu
0, NVIDIA A100-SXM4-80GB, 45, 1024, 81920, 55, 210.50, 400.00, [N/A], 1410
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
        assert_eq!(
            r.ifaces[1],
            Iface {
                name: "eth0".into(),
                received: 5000,
                sent: 3000
            }
        );
        assert_eq!(r.disks[0].read_sectors, 2000);
        assert_eq!(r.df[1].mount, "/data sets");
        assert_eq!(r.procs[1].comm, "python train.py");
        let gpu = &r.gpus[0];
        assert_eq!(gpu.name, "NVIDIA A100-SXM4-80GB");
        assert_eq!(gpu.memory_total, Some(81920 * 1024 * 1024));
        assert_eq!((gpu.fan_percent, gpu.clock_mhz), (None, Some(1410)));
    }

    #[test]
    fn info_falls_back_on_missing_numbers() {
        let info = parse_info(&["gpu1".into(), "Linux 6.8.0".into(), " AMD EPYC".into()]);
        assert_eq!(info.host_name, "gpu1");
        assert_eq!(info.cpu_model, "AMD EPYC");
        assert_eq!(
            (info.threads, info.clock_ticks, info.page_size),
            (1, 100, 4096)
        );
    }
}
