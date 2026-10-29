//! The monitor's sampling thread. It reads every machine on the overview
//! once a second and emits one `monitor-samples` batch to every window,
//! but only while some window is watching: a window says so when it shows
//! readings and again when it stops (closed, hidden or minimized). With no
//! watchers the sources are paused (remote sessions close) and the thread
//! sleeps until one arrives.

use std::collections::HashSet;
use std::sync::{Arc, Condvar, Mutex};
use std::thread;
use std::time::Duration;

use tauri::{AppHandle, Emitter, Manager, Runtime};

use crate::entity::monitor::{MachineInfo, MachineSample, MonitorTarget};
use crate::providers::monitor::base::MonitorSource;
use crate::providers::monitor::factory;

pub const SAMPLES_EVENT: &str = "monitor-samples";
const INTERVAL: Duration = Duration::from_secs(1);

type Sources = Vec<(MonitorTarget, Box<dyn MonitorSource>)>;

pub struct Monitor {
    sources: Mutex<Sources>,
    watchers: Mutex<HashSet<String>>,
    wake: Condvar,
    latest: Mutex<Vec<MachineSample>>,
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

    /// Read these machines from now on, in this order. Sources already open
    /// are kept (no reconnect); dropped ones close their sessions.
    pub fn set_machines(&self, machines: Vec<MonitorTarget>) {
        let mut sources = self.sources.lock().unwrap();
        let mut old = std::mem::take(&mut *sources);
        for target in machines {
            let source = match old.iter().position(|(t, _)| *t == target) {
                Some(i) => old.remove(i).1,
                None => factory::open(&target),
            };
            sources.push((target, source));
        }
        self.latest
            .lock()
            .unwrap()
            .retain(|m| sources.iter().any(|(t, _)| *t == m.target));
    }

    pub fn info(&self, target: &MonitorTarget) -> Option<MachineInfo> {
        let mut sources = self.sources.lock().unwrap();
        sources
            .iter_mut()
            .find(|(t, _)| t == target)
            .map(|(_, s)| s.info())
    }

    /// The last batch, so a window that just opened has something to show.
    pub fn latest(&self) -> Vec<MachineSample> {
        self.latest.lock().unwrap().clone()
    }

    fn wait_for_watchers(&self) {
        let watchers = self.watchers.lock().unwrap();
        if watchers.is_empty() {
            for (_, source) in self.sources.lock().unwrap().iter_mut() {
                source.pause();
            }
        }
        drop(self.wake.wait_while(watchers, |w| w.is_empty()).unwrap());
    }

    fn sample_all(&self) -> Vec<MachineSample> {
        let mut sources = self.sources.lock().unwrap();
        sources
            .iter_mut()
            .filter_map(|(target, source)| {
                source.sample().map(|sample| MachineSample {
                    target: target.clone(),
                    sample,
                })
            })
            .collect()
    }
}

pub fn start<R: Runtime>(app: &AppHandle<R>, machines: Vec<MonitorTarget>) {
    let monitor = Arc::new(Monitor {
        sources: Mutex::new(Vec::new()),
        watchers: Mutex::new(HashSet::new()),
        wake: Condvar::new(),
        latest: Mutex::new(Vec::new()),
    });
    monitor.set_machines(machines);
    app.manage(monitor.clone());
    let app = app.clone();
    thread::Builder::new()
        .name("monitor".into())
        .spawn(move || loop {
            monitor.wait_for_watchers();
            let batch = monitor.sample_all();
            if let Err(e) = app.emit(SAMPLES_EVENT, &batch) {
                log::warn!("could not send monitor samples: {e}");
            }
            *monitor.latest.lock().unwrap() = batch;
            thread::sleep(INTERVAL);
        })
        .expect("spawn the monitor thread");
}
