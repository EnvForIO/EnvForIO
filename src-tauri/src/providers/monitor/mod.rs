//! Machine monitoring. A `MonitorSource` reads one machine; `factory::open`
//! gives the source for a target. Only the local machine for now: Phase 4
//! adds WSL and SSH hosts as further sources behind the same trait.

pub mod base;
pub mod factory;
mod local;
mod nvidia;
