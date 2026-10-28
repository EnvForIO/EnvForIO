//! The interface every machine source implements.

use crate::entity::monitor::{MachineInfo, Sample};

pub trait MonitorSource: Send {
    /// What the machine is: name, OS, CPU, memory, GPUs. A remote source
    /// knows little until its first readings arrive.
    fn info(&mut self) -> MachineInfo;

    /// The readings now, or None while a remote source is still connecting.
    /// Rates cover the time since the previous readings, so the first
    /// sample reads zero traffic. A failed connection gives a sample with
    /// `error` set.
    fn sample(&mut self) -> Option<Sample>;

    /// Nothing is watching: let go of what costs (a remote session).
    fn pause(&mut self) {}
}
