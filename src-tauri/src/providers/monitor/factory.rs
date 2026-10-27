//! Picks the source for a monitor target.

use super::base::MonitorSource;
use super::local::LocalSource;
use crate::entity::monitor::MonitorTarget;

pub fn open(target: &MonitorTarget) -> Box<dyn MonitorSource> {
    match target {
        MonitorTarget::Local => Box::new(LocalSource::new()),
    }
}
