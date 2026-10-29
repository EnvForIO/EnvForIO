//! What a monitor source reports: the machine once (`MachineInfo`), then a
//! `Sample` a second. Byte counts are bytes; rates are bytes per second;
//! percentages are 0..100 of the whole machine. `None` = the source cannot
//! read it (no NVIDIA driver, a reading the card does not offer).

use serde::{Deserialize, Serialize};
use specta::Type;

/// Which machine to watch: this PC, a running WSL distribution, or a host
/// named in the user's SSH config.
#[derive(Debug, Clone, Default, PartialEq, Eq, Hash, Serialize, Deserialize, Type)]
#[serde(tag = "kind", rename_all = "camelCase")]
pub enum MonitorTarget {
    #[default]
    Local,
    Wsl {
        distro: String,
    },
    Ssh {
        host: String,
    },
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GpuInfo {
    pub index: u32,
    pub name: String,
    pub memory_total: Option<u64>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MachineInfo {
    pub host_name: String,
    pub os: String,
    pub cpu_brand: String,
    pub logical_cores: u32,
    pub physical_cores: Option<u32>,
    pub memory_total: u64,
    pub gpus: Vec<GpuInfo>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct CpuSample {
    pub usage: f32,
    pub cores: Vec<f32>,
    pub frequency_mhz: u64,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MemorySample {
    pub used: u64,
    pub total: u64,
    pub swap_used: u64,
    pub swap_total: u64,
}

/// A compute program on a GPU, as nvitop lists it. The user, command and
/// run time come from the process table and are empty when it cannot be
/// read (a container's own PIDs, another user's process on Windows).
#[derive(Debug, Clone, Default, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GpuProcess {
    pub pid: u32,
    pub user: String,
    pub command: String,
    pub gpu_memory: Option<u64>,
    pub running_secs: Option<u64>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct GpuSample {
    pub index: u32,
    pub name: String,
    pub usage: Option<f32>,
    pub memory_used: Option<u64>,
    pub memory_total: Option<u64>,
    pub temperature: Option<u32>, // °C
    pub power_watts: Option<f32>,
    pub power_limit_watts: Option<f32>,
    pub fan_percent: Option<u32>,
    pub clock_mhz: Option<u32>,
    /// Compute programs only: graphics programs (the desktop, browsers)
    /// are not what a researcher looks for here.
    pub processes: Vec<GpuProcess>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct DiskIoSample {
    pub read: u64, // per second
    pub written: u64,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Drive {
    pub name: String,
    pub mount: String,
    pub total: u64,
    pub available: u64,
    pub removable: bool,
}

/// One machine's readings, as sent to the UI in each second's batch.
#[derive(Debug, Clone, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct MachineSample {
    pub target: MonitorTarget,
    pub sample: Sample,
}

/// One second's readings. Network traffic and the machine's whole process
/// list are not read (2026-11-19, user decision); GPU programs are.
#[derive(Debug, Clone, Default, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Sample {
    pub at_ms: u64, // Unix time
    pub cpu: CpuSample,
    pub memory: MemorySample,
    pub gpus: Vec<GpuSample>,
    pub disk: DiskIoSample,
    pub drives: Vec<Drive>,
    /// Why there are no readings: the connection failed or closed.
    pub error: Option<String>,
}
