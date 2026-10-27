//! NVIDIA cards through NVML, the library the driver installs (`nvml.dll`
//! on Windows). Loaded at run time: without an NVIDIA driver there is no
//! library and simply no cards. Each reading may fail on its own (laptop
//! cards often have no fan), so each is an `Option`.

use nvml_wrapper::enum_wrappers::device::{Clock, TemperatureSensor};
use nvml_wrapper::Nvml;

use crate::entity::monitor::{GpuInfo, GpuSample};

pub struct Nvidia {
    nvml: Nvml,
    count: u32,
}

impl Nvidia {
    pub fn open() -> Option<Self> {
        let nvml = Nvml::init()
            .inspect_err(|e| log::info!("no NVIDIA readings: {e}"))
            .ok()?;
        let count = nvml.device_count().ok()?;
        Some(Self { nvml, count })
    }

    pub fn info(&self) -> Vec<GpuInfo> {
        (0..self.count)
            .filter_map(|index| {
                let device = self.nvml.device_by_index(index).ok()?;
                Some(GpuInfo {
                    index,
                    name: device.name().unwrap_or_default(),
                    memory_total: device.memory_info().ok().map(|m| m.total),
                })
            })
            .collect()
    }

    pub fn sample(&self) -> Vec<GpuSample> {
        (0..self.count)
            .filter_map(|index| {
                let device = self.nvml.device_by_index(index).ok()?;
                let memory = device.memory_info().ok();
                let watts = |mw: u32| mw as f32 / 1000.0;
                Some(GpuSample {
                    index,
                    name: device.name().unwrap_or_default(),
                    usage: device.utilization_rates().ok().map(|u| u.gpu as f32),
                    memory_used: memory.as_ref().map(|m| m.used),
                    memory_total: memory.as_ref().map(|m| m.total),
                    temperature: device.temperature(TemperatureSensor::Gpu).ok(),
                    power_watts: device.power_usage().ok().map(watts),
                    power_limit_watts: device.enforced_power_limit().ok().map(watts),
                    fan_percent: device.fan_speed(0).ok(),
                    clock_mhz: device.clock_info(Clock::Graphics).ok(),
                })
            })
            .collect()
    }
}
