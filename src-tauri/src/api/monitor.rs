//! Monitor commands. Readings arrive as `monitor-sample` events once a
//! window watches; the sampling lives in `desktop::monitor`.

use std::sync::Arc;

use tauri::{State, WebviewWindow};

use crate::desktop::monitor::Monitor;
use crate::entity::monitor::{MachineInfo, Sample};

#[tauri::command]
#[specta::specta]
pub fn monitor_info(monitor: State<'_, Arc<Monitor>>) -> MachineInfo {
    monitor.info()
}

/// The calling window starts or stops showing readings.
#[tauri::command]
#[specta::specta]
pub fn monitor_watch(window: WebviewWindow, monitor: State<'_, Arc<Monitor>>, on: bool) {
    monitor.watch(window.label(), on);
}

#[tauri::command]
#[specta::specta]
pub fn monitor_latest(monitor: State<'_, Arc<Monitor>>) -> Option<Sample> {
    monitor.latest()
}
