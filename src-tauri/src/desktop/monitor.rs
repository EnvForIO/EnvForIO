//! The monitor's sampling thread. It reads the watched machine once a
//! second and emits `monitor-sample` to every window, but only while some
//! window is watching: a window says so when it shows readings and again
//! when it stops (closed, hidden or minimized). With no watchers the
//! source is paused (a remote session is closed) and the thread sleeps
//! until one arrives.

use std::collections::HashSet;
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, Runtime};

use crate::entity::monitor::{MachineInfo, MonitorTarget, Sample};
use crate::providers::monitor::base::MonitorSource;
use crate::providers::monitor::factory;

pub const SAMPLE_EVENT: &str = "monitor-sample";
const INTERVAL: Duration = Duration::from_secs(1);

pub struct Monitor {
    target: Mutex<MonitorTarget>,
    source: Mutex<Box<dyn MonitorSource>>,
    watchers: Mutex<HashSet<String>>,
    wake: Condvar,
    latest: Mutex<Option<Sample>>,
}

impl Monitor {
    /// A window starts (`on`) or stops showing readings.
    pub fn watch(&self, window: &str, on: bool) {
        let mut watchers = self.watchers.lock().unwrap();
        if on {
            watchers.insert(window.to_string());
            self.wake.notify_all();
        } else {
            watchers.remove(window);
        }
    }

    pub fn info(&self) -> MachineInfo {
        self.source.lock().unwrap().info()
    }

    pub fn target(&self) -> MonitorTarget {
        self.target.lock().unwrap().clone()
    }

    /// Watch another machine from now on; the previous source is dropped
    /// (a remote session closes).
    pub fn set_target(&self, target: MonitorTarget) {
        let mut current = self.target.lock().unwrap();
        if *current == target {
            return;
        }
        *self.source.lock().unwrap() = factory::open(&target);
        *self.latest.lock().unwrap() = None;
        *current = target;
    }

    /// The last sample, so a window that just opened has something to show.
    pub fn latest(&self) -> Option<Sample> {
        self.latest.lock().unwrap().clone()
    }

    fn wait_for_watchers(&self) {
        let watchers = self.watchers.lock().unwrap();
        if watchers.is_empty() {
            self.source.lock().unwrap().pause();
        }
        drop(self.wake.wait_while(watchers, |w| w.is_empty()).unwrap());
    }
}

pub fn start<R: Runtime>(app: &AppHandle<R>) {
    let monitor = Arc::new(Monitor {
        target: Mutex::new(MonitorTarget::Local),
        source: Mutex::new(factory::open(&MonitorTarget::Local)),
        watchers: Mutex::new(HashSet::new()),
        wake: Condvar::new(),
        latest: Mutex::new(None),
    });
    app.manage(monitor.clone());
    let app = app.clone();
    thread::Builder::new()
        .name("monitor".into())
        .spawn(move || loop {
            monitor.wait_for_watchers();
            let sample = monitor.source.lock().unwrap().sample();
            if let Some(sample) = sample {
                if let Err(e) = app.emit(SAMPLE_EVENT, &sample) {
                    log::warn!("could not send a monitor sample: {e}");
                }
                *monitor.latest.lock().unwrap() = Some(sample);
            }
            thread::sleep(INTERVAL);
        })
        .expect("spawn the monitor thread");
}
