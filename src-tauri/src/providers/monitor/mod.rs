//! Machine monitoring. A `MonitorSource` reads one machine; `factory::open`
//! gives the source for a target (`targets::list` names them): this PC
//! through sysinfo and NVML, or a Linux machine (SSH host, WSL
//! distribution) through a shell loop over a long-lived session.

pub mod base;
pub mod factory;
mod local;
mod nvidia;
mod process;
mod remote;
pub mod targets;
