# Phase 3: Glance parity

Started 2026-11-19. The checklist is in `docs/PLAN.md`. The reference is [lulu-loopp/glance](https://github.com/lulu-loopp/glance) (MIT, commit `00a0472`, read on 2026-11-19). Only its readings are in scope: not its edge panel, widgets, looks, workbench, music, search, overlay or phone remote.

Done after step 1 (2026-11-19). The plan had four steps: readings and a Monitor page, an edge panel, a desktop widget, and three looks. Step 2 (the edge panel, commit `67d2370`) was built and then reverted at the user's request: they check the machine from the main window, so the Monitor page is the whole of the monitor. Steps 3 and 4 depended on the panel and were dropped with it.

Open question for later: CPU, motherboard and memory temperatures need a kernel driver on Windows (Glance uses PawnIO and an elevated helper). GPU temperature, power and fan come from NVML without one. Ask the user before adding a driver.

## Step 1: readings

- `providers/monitor/`: the `MonitorSource` trait (`base.rs`: `info` once, `sample` each second), `factory::open(MonitorTarget)` (only `Local` for now), `local.rs` and `nvidia.rs`.
- The local source uses `sysinfo` 0.40 for CPU (total, each thread, clock), memory and swap, drive space and I/O, network traffic and processes (CPU, memory, and GPU use as Windows reports it per process).
- NVIDIA cards are read through NVML (`nvml-wrapper`), loaded at run time from the driver: usage, VRAM, temperature, power and limit, fan, clock. With no NVIDIA driver, the GPU lane falls back to adding up the processes' GPU use.
- Network traffic skips loopback and Hyper-V's `vEthernet` adapters, which would count WSL and Docker traffic twice.
- Processes are grouped by program, as Task Manager does (`chrome.exe` ×30 is one row). CPU is shown as a share of the whole machine. Each second Rust sends the top 12 by CPU, by memory and by GPU, merged.
- `desktop/monitor.rs` runs one sampling thread. It sleeps until a window calls `monitor_watch(true)`, then emits `monitor-sample` once a second until no window is watching. A window stops watching when its page unmounts or when it is hidden or minimized (`visibilitychange`).
- UI: a Monitor page in the sidebar shows lanes for CPU (with a cell per thread), memory, each GPU, network and disk (with each drive's space), each with a one-minute chart, and below them the busiest programs, sortable by CPU, memory or GPU. The lanes live in `src/components/monitor/`.

2026-11-19, after phase 4 step 1: the network lane and the process list were removed at the user's request and are no longer read (see `docs/m4_custom.md`).
