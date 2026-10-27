//! The interface every machine source implements.

use crate::entity::monitor::{MachineInfo, Sample};

pub trait MonitorSource: Send {
    /// What the machine is: name, OS, CPU, memory, GPUs. Read once.
    fn info(&mut self) -> MachineInfo;

    /// The readings now. Rates cover the time since the previous call, so
    /// the first sample after opening reads zero traffic and CPU.
    fn sample(&mut self) -> Sample;
}
