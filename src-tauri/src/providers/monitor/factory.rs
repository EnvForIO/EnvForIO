//! Picks the source for a monitor target.

use super::base::MonitorSource;
use super::local::LocalSource;
use super::remote::{self, RemoteSource};
use crate::entity::monitor::MonitorTarget;

pub fn open(target: &MonitorTarget) -> Box<dyn MonitorSource> {
    match target {
        MonitorTarget::Local => Box::new(LocalSource::new()),
        MonitorTarget::Wsl { distro } => Box::new(RemoteSource::new(distro, remote::wsl)),
        MonitorTarget::Ssh { host } => Box::new(RemoteSource::new(host, remote::ssh)),
    }
}
