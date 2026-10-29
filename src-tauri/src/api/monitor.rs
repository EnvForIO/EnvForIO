//! Monitor commands. Readings arrive as `monitor-samples` batches once a
//! window watches; the sampling lives in `desktop::monitor`, the overview's
//! machine list in `service::machines`.

use std::sync::Arc;

use tauri::{State, WebviewWindow};

use crate::config::AppState;
use crate::desktop::monitor::Monitor;
use crate::entity::monitor::{MachineInfo, MachineSample, MonitorTarget};
use crate::errors::AppResult;
use crate::providers::monitor::targets;
use crate::service::machines;

/// The calling window starts or stops showing readings.
#[tauri::command]
#[specta::specta]
pub fn monitor_watch(window: WebviewWindow, monitor: State<'_, Arc<Monitor>>, on: bool) {
    monitor.watch(window.label(), on);
}

#[tauri::command]
#[specta::specta]
pub fn monitor_latest(monitor: State<'_, Arc<Monitor>>) -> Vec<MachineSample> {
    monitor.latest()
}

/// What a machine on the overview is; None if it is not on the overview.
#[tauri::command]
#[specta::specta]
pub fn monitor_info(
    monitor: State<'_, Arc<Monitor>>,
    target: MonitorTarget,
) -> Option<MachineInfo> {
    monitor.info(&target)
}

/// Machines that can be added: This PC, running WSL distributions, SSH
/// config hosts. Async: listing WSL runs wsl.exe.
#[tauri::command]
#[specta::specta]
pub async fn monitor_targets() -> Vec<MonitorTarget> {
    targets::list()
}

#[tauri::command]
#[specta::specta]
pub fn list_machines(state: State<'_, AppState>) -> AppResult<Vec<MonitorTarget>> {
    machines::list(&state.db())
}

#[tauri::command]
#[specta::specta]
pub fn add_machine(
    state: State<'_, AppState>,
    monitor: State<'_, Arc<Monitor>>,
    target: MonitorTarget,
) -> AppResult<Vec<MonitorTarget>> {
    let list = machines::add(&state.db(), &target)?;
    monitor.set_machines(list.clone());
    Ok(list)
}

#[tauri::command]
#[specta::specta]
pub fn remove_machine(
    state: State<'_, AppState>,
    monitor: State<'_, Arc<Monitor>>,
    target: MonitorTarget,
) -> AppResult<Vec<MonitorTarget>> {
    let list = machines::remove(&state.db(), &target)?;
    monitor.set_machines(list.clone());
    Ok(list)
}
