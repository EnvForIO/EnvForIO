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

## Step 2: the edge panel

- `desktop/panel/`:
  - `mod.rs`: the `monitor-panel` window (borderless, transparent, always on top, no taskbar button, never focused), plus opening, closing and the leave watcher.
  - `detector.rs`: Glance's push detector, ported under MIT with credit.
  - `edge.rs`: Windows only. Raw mouse input on a message-only window.
  - `geometry.rs`: placement and the leave test.
  - `shortcut.rs`.
- Opening: Rust places the window along the chosen edge of the work area of the screen holding the pointer, at the panel's width times that screen's scale. It shows the window with `SW_SHOWNOACTIVATE`, so the window being worked in keeps focus, and emits `monitor-panel-opening`. The page slides in with CSS (260 ms).
- Closing: `monitor-panel-closing`, the page slides out (180 ms), then Rust hides the window after 200 ms unless the panel opened again meanwhile.
- Leaving: a thread looks at the pointer every 40 ms while the panel is open. Once the pointer has been on the panel and is more than 10 px off it, with no mouse button held, the panel closes. A panel opened by the shortcut waits for the pointer to come in first.
- The edge:
  - Only an outer edge of a screen counts; where screens meet, the pointer crosses into the next one.
  - The 48 px at each end never trigger.
  - Nothing opens while a fullscreen Direct3D game runs.
  - After a push opens the panel, the pointer has to leave the edge before another push counts.
  - Pens and remote sessions send no raw counts, so a timer opens the panel for them after the pointer rests on the edge for 300 ms.
- Settings (Preferences > Monitor), saved as `monitor_panel` in `preferences.json` and applied by Rust on save:
  - open by pushing (on by default)
  - edge (right by default)
  - how hard to push: light 50, medium 120 or firm 260 raw counts
  - width (340 px by default)
  - shortcut (`Alt+Shift+G` by default)
- The panel shows the same lanes and process table as the Monitor page, in one column. Readings flow only while the panel window is visible.
- Not yet: opening where two screens meet (Glance opens there after a 500 ms rest), and the top edge.
