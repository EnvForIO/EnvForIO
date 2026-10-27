//! What a monitor source reports: the machine once (`MachineInfo`), then a
//! `Sample` a second. Byte counts are bytes; rates are bytes per second;
//! percentages are 0..100 of the whole machine. `None` = the source cannot
//! read it (no NVIDIA driver, a reading the card does not offer).

use serde::{Deserialize, Serialize};
use specta::Type;

/// Which machine to watch. Only the local one for now; Phase 4 adds WSL and SSH hosts.
#[derive(Debug, Clone, Default, PartialEq, Eq, Serialize, Deserialize, Type)]
pub enum MonitorTarget {
    #[default]
    Local,
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
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct NetworkSample {
    pub received: u64, // per second
    pub sent: u64,
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

/// All processes of one program, added up (as Task Manager groups them).
#[derive(Debug, Clone, Default, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ProcessGroup {
    pub name: String,
    pub count: u32,
    pub cpu: f32,
    pub memory: u64,
    pub gpu: Option<f32>,
}

#[derive(Debug, Clone, Default, PartialEq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Sample {
    pub at_ms: u64, // Unix time
    pub cpu: CpuSample,
    pub memory: MemorySample,
    pub gpus: Vec<GpuSample>,
    /// GPU use added up from the processes, for cards NVML cannot read.
    pub gpu_from_processes: Option<f32>,
    pub network: NetworkSample,
    pub disk: DiskIoSample,
    pub drives: Vec<Drive>,
    /// The busiest programs by CPU, memory and GPU (a few of each, merged).
    pub processes: Vec<ProcessGroup>,
}
