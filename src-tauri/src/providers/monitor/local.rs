//! The machine EnvIO runs on, read with `sysinfo` (CPU, memory, drives,
//! network, processes) and NVML (NVIDIA cards).

use std::time::{Instant, SystemTime, UNIX_EPOCH};

use sysinfo::{
    CpuRefreshKind, DiskRefreshKind, Disks, MemoryRefreshKind, Networks, ProcessRefreshKind,
    ProcessesToUpdate, System,
};

use super::base::MonitorSource;
use super::nvidia::Nvidia;
use crate::domain::monitor::{
    busiest, gpu_from_processes, group_processes, per_second, ProcessRow,
};
use crate::entity::monitor::{
    CpuSample, DiskIoSample, Drive, MachineInfo, MemorySample, NetworkSample, Sample,
};

/// How many leaders by CPU, memory and GPU are sent each second.
const TOP: usize = 12;

/// Adapters that carry traffic another adapter also counts: the loopback,
/// and Hyper-V's virtual switches (WSL, Docker) in front of the real one.
fn counted(interface: &str) -> bool {
    let name = interface.to_lowercase();
    !(name.starts_with("lo") || name.contains("loopback") || name.starts_with("vethernet"))
}

pub struct LocalSource {
    system: System,
    disks: Disks,
    networks: Networks,
    nvidia: Option<Nvidia>,
    last: Instant,
}

impl LocalSource {
    pub fn new() -> Self {
        let mut system = System::new().expect("sysinfo supports this OS");
        system.refresh_cpu_all();
        Self {
            system,
            disks: Disks::new_with_refreshed_list()
                .unwrap_or_else(|_| Disks::new().expect("sysinfo supports this OS")),
            networks: Networks::new_with_refreshed_list()
                .unwrap_or_else(|_| Networks::new().expect("sysinfo supports this OS")),
            nvidia: Nvidia::open(),
            last: Instant::now(),
        }
    }

    fn drives(&self) -> Vec<Drive> {
        self.disks
            .iter()
            .filter(|d| d.total_space() > 0)
            .map(|d| Drive {
                name: d.name().to_string_lossy().into_owned(),
                mount: d.mount_point().to_string_lossy().into_owned(),
                total: d.total_space(),
                available: d.available_space(),
                removable: d.is_removable(),
            })
            .collect()
    }
}

impl MonitorSource for LocalSource {
    fn info(&mut self) -> MachineInfo {
        self.system.refresh_memory();
        MachineInfo {
            host_name: System::host_name().unwrap_or_default(),
            os: System::long_os_version().unwrap_or_default(),
            cpu_brand: self
                .system
                .cpus()
                .first()
                .map(|c| c.brand().trim().to_string())
                .unwrap_or_default(),
            logical_cores: self.system.cpus().len() as u32,
            physical_cores: System::physical_core_count().ok().map(|n| n as u32),
            memory_total: self.system.total_memory(),
            gpus: self.nvidia.as_ref().map(Nvidia::info).unwrap_or_default(),
        }
    }

    fn sample(&mut self) -> Sample {
        let elapsed = self.last.elapsed();
        self.last = Instant::now();

        let s = &mut self.system;
        s.refresh_cpu_specifics(CpuRefreshKind::nothing().with_usage().with_frequency());
        s.refresh_memory_specifics(MemoryRefreshKind::everything());
        s.refresh_processes_specifics(
            ProcessesToUpdate::All,
            true,
            ProcessRefreshKind::nothing().with_cpu().with_memory(),
        );
        self.disks.refresh_specifics(
            true,
            DiskRefreshKind::nothing().with_storage().with_io_usage(),
        );
        self.networks.refresh(true);

        let cpus = s.cpus();
        let frequency_mhz = if cpus.is_empty() {
            0
        } else {
            cpus.iter().map(|c| c.frequency()).sum::<u64>() / cpus.len() as u64
        };
        let rows = s.processes().values().map(|p| ProcessRow {
            name: p.name().to_string_lossy().into_owned(),
            cpu: p.cpu_usage(),
            memory: p.memory(),
            gpu: p.gpu_usage(),
        });
        let groups = group_processes(rows, cpus.len());
        let from_processes = gpu_from_processes(&groups);

        let (received, sent) = self
            .networks
            .iter()
            .filter(|(name, _)| counted(&name.to_string_lossy()))
            .fold((0, 0), |(r, t), (_, n)| {
                (r + n.received(), t + n.transmitted())
            });
        let (read, written) = self.disks.iter().fold((0, 0), |(r, w), d| {
            let u = d.usage();
            (r + u.read_bytes, w + u.written_bytes)
        });

        Sample {
            at_ms: SystemTime::now()
                .duration_since(UNIX_EPOCH)
                .map(|d| d.as_millis() as u64)
                .unwrap_or_default(),
            cpu: CpuSample {
                usage: s.global_cpu_usage(),
                cores: cpus.iter().map(|c| c.usage()).collect(),
                frequency_mhz,
            },
            memory: MemorySample {
                used: s.used_memory(),
                total: s.total_memory(),
                swap_used: s.used_swap(),
                swap_total: s.total_swap(),
            },
            gpus: self.nvidia.as_ref().map(Nvidia::sample).unwrap_or_default(),
            gpu_from_processes: from_processes,
            network: NetworkSample {
                received: per_second(received, elapsed),
                sent: per_second(sent, elapsed),
            },
            disk: DiskIoSample {
                read: per_second(read, elapsed),
                written: per_second(written, elapsed),
            },
            drives: self.drives(),
            processes: busiest(groups, TOP),
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn virtual_and_loopback_adapters_are_not_counted_twice() {
        assert!(counted("Ethernet"));
        assert!(counted("Wi-Fi"));
        assert!(counted("eth0"));
        assert!(!counted("lo"));
        assert!(!counted("Loopback Pseudo-Interface 1"));
        assert!(!counted("vEthernet (WSL (Hyper-V firewall))"));
    }

    /// Reads this machine; ignored by default because CI machines differ.
    #[test]
    #[ignore]
    fn reads_this_machine() {
        let mut source = LocalSource::new();
        let info = source.info();
        assert!(info.logical_cores > 0 && info.memory_total > 0);
        std::thread::sleep(std::time::Duration::from_millis(300));
        let sample = source.sample();
        assert_eq!(sample.cpu.cores.len(), info.logical_cores as usize);
        assert!(!sample.processes.is_empty());
        println!("{sample:#?}");
    }
}
