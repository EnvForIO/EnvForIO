# Phase 3: Glance parity

Started 2026-11-19. The checklist is in `docs/PLAN.md`. The reference is [lulu-loopp/glance](https://github.com/lulu-loopp/glance) (MIT, commit `00a0472`, read on 2026-11-19). Only its monitor is in scope: not its workbench, music, search, overlay or phone remote.

Glance draws natively with Direct2D. EnvIO draws its panel in a WebView window, so the panel follows Glance's behaviour and timings rather than its code. The one piece ported from Glance's code is the push detector (`detector.rs`, MIT, credited in the file).

## Steps

Each step ends with a Windows build the user tries before the next one starts.

| Step | Contents                                                                                                                                                                              | PLAN items                    |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------- |
| 1    | Monitor data source behind a `MonitorSource` trait (local: `sysinfo` + NVIDIA through NVML); a Monitor page in the main window showing CPU, memory, GPU, network, disks and processes | Local monitoring, data source |
| 2    | The edge panel: a window that slides out when the pointer pushes into a screen edge and slides back when it leaves; a shortcut toggles it                                             | Edge panel                    |
| 3    | Desktop widget: drag the panel off the edge; it lays itself out for its size, snaps back near an edge, can sit under other windows, and comes back where it was                       | Desktop widget                |
| 4    | Three looks: chart paper, frosted glass, Windows 11 acrylic; light and dark                                                                                                           | Three looks                   |

Open question for later: CPU, motherboard and memory temperatures need a kernel driver on Windows (Glance uses PawnIO and an elevated helper). GPU temperature, power and fan come from NVML without one. Ask the user before adding a driver.

## Glance's numbers, kept

- Opens on a push: the pointer keeps moving into the edge (raw mouse counts) after the cursor has stopped; sliding along the edge does not count, and a 250 ms pause starts the count again. A tablet or remote session (absolute pointer) opens after resting 300 ms on the edge.
- 48 px at each end of the edge never trigger (title bar buttons, taskbar).
- Opens in 260 ms, closes in 180 ms; the pointer may stray 10 px off the panel before it closes.
- Readings refresh once a second and stop while nothing shows them.

## Step 1: readings

- `providers/monitor/`: the `MonitorSource` trait (`base.rs`: `info` once, `sample` each second), `factory::open(MonitorTarget)` (only `Local` for now), `local.rs` and `nvidia.rs`.
- The local source uses `sysinfo` 0.40 for CPU (total, each thread, clock), memory and swap, drive space and I/O, network traffic and processes (CPU, memory, and GPU use as Windows reports it per process).
- NVIDIA cards are read through NVML (`nvml-wrapper`), loaded at run time from the driver: usage, VRAM, temperature, power and limit, fan, clock. With no NVIDIA driver, the GPU lane falls back to adding up the processes' GPU use.
- Network traffic skips loopback and Hyper-V's `vEthernet` adapters, which would count WSL and Docker traffic twice.
- Processes are grouped by program, as Task Manager does (`chrome.exe` ×30 is one row). CPU is shown as a share of the whole machine. Each second Rust sends the top 12 by CPU, by memory and by GPU, merged.
- `desktop/monitor.rs` runs one sampling thread. It sleeps until a window calls `monitor_watch(true)`, then emits `monitor-sample` once a second until no window is watching. A window stops watching when its page unmounts or when it is hidden or minimized (`visibilitychange`).
- UI: a Monitor page in the sidebar shows lanes for CPU (with a cell per thread), memory, each GPU, network and disk (with each drive's space), each with a one-minute chart, and below them the busiest programs, sortable by CPU, memory or GPU. The lanes live in `src/components/monitor/` so the edge panel can reuse them.
