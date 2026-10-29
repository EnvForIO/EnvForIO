# Phase 4: customize

Started 2026-11-19. The checklist is in `docs/PLAN.md`. The user picked the items and the order below; CPU and board temperatures (kernel driver) and the macOS version are not being done.

## Steps

Each step ends with a Windows build the user tries before the next one starts.

| Step | Contents                                                                                                                                                                                                 |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1    | Monitor targets: a picker on the Monitor page for This PC, a running WSL distribution, or a host from the Windows `~/.ssh/config`; CPU, memory, disk, network, processes and GPUs of whichever is picked |
| 2    | nvitop-style GPU view: per GPU, and each GPU process with its user and command, on any target                                                                                                            |
| 3    | Conference deadlines: pick a conference and get a project with its dates, converted from AoE                                                                                                             |
| 4    | Connect the parts: dated idea todos in My Day and the safety line; finishing them counts in the heatmap                                                                                                  |
| 5    | Kanban view of a project                                                                                                                                                                                 |
| 6    | Read-only external calendars from ICS links, refreshed on a schedule                                                                                                                                     |
| 7    | Desktop calendar widget: a month view marking busy days and deadlines                                                                                                                                    |
| 8    | RSS reader for a few low-volume sources                                                                                                                                                                  |

## Decisions

- SSH (2026-11-19): the user logs in with a key from Windows. EnvIO runs Windows' own OpenSSH (`ssh.exe`) with the user's `~/.ssh/config`, in batch mode: it never asks for or stores a password. A host that needs one shows an error instead.
- Nothing is installed on a server or in WSL. Readings come from `/proc`, `df`, `ps` and `nvidia-smi`, run through one long-lived `ssh` (or `wsl.exe`) session per watched target.
- WSL: only distributions that are already running are offered, so watching never starts one.
- Monitor contents (2026-11-19, after step 1): no network lane and no list of busiest programs, on any machine. Neither is read any more (sysinfo no longer refreshes processes or adapters; the script no longer reads `/proc/net/dev` or `/proc/<pid>/stat`). The Monitor page shows CPU, memory, GPUs and disks.

## Step 1: monitor targets

- `MonitorTarget` is `local`, `wsl { distro }` or `ssh { host }`. `providers/monitor/targets.rs` lists This PC, the WSL distributions running now (`wsl.exe --list --running --quiet`, read as UTF-16), and every named `Host` in `%USERPROFILE%\.ssh\config` (`domain/ssh_config.rs`: patterns and `Match` are skipped, `Include` is not followed).
- `providers/monitor/remote.rs` reads a Linux machine through one long-lived session: `ssh -T -o BatchMode=yes -o ConnectTimeout=10 host sh -s` with Windows' own `ssh.exe`, or `wsl.exe -d distro -- sh -s`, with no console window. `remote.sh` is written to its stdin, so nothing is copied to or installed on the machine.
- The script prints `/proc/stat`, `/proc/meminfo`, `/proc/diskstats`, `df -kPT` and `nvidia-smi --query-gpu=...`, once a second. `domain/linux_monitor/` parses a round and turns two rounds into a `Sample`: CPU shares from tick differences, disk rates from counter differences. Only whole disks count for I/O; tmpfs, overlay, snap, WSL's root image and its view of the Windows drives are not listed as drives.
- The session starts when the page watches, closes when nothing watches (`MonitorSource::pause`) or the target changes, and is retried every 10 s after it fails. Errors (the last line ssh printed, such as `Permission denied (publickey)`) show above the charts.
- UI: a picker next to the Monitor page title (This PC, WSL (running), SSH hosts), re-read each time it opens. Switching clears the charts.
- Checked on 2026-11-19 by running `remote.sh` through a local `sh -s` in WSL (an ignored test, `the_script_reads_this_linux_machine`): Ryzen 9 7900 (24 threads), 64 GB, RTX 3080 through nvidia-smi, processes and `/` read correctly.
- Monitor looks (2026-11-19): the user found the first page plain and asked to compare styles. The Monitor page has a switch between four looks over the same readings: Grafana (`components/monitor/grafana/`: dark panels, threshold-coloured stats, gauges per GPU, time series with legend, bar gauges for drives), wandb (`wandb/`: a "System" grid of single-metric charts in run colours, following the app theme), Terminal (`terminal/`: nvitop / btop boxes with block bars and sparklines) and Cards (`cards/`: the first page, polished). The chart with axes (`TimeSeries.tsx`) is shared by Grafana and wandb. The look is remembered in local storage. Once the user picks one, the others are deleted.
- Monitor looks, decided (2026-11-19): the user kept Grafana in its light theme (`.grafana` CSS variables in App.css; Grafana's dark theme in dark mode) and Cards. wandb and Terminal were deleted.
- Monitor look, final (2026-11-19): Cards only; Grafana was deleted too. Colours follow the values as Grafana's thresholds do: green below 70 %, yellow from 70 %, red from 90 % for CPU, each thread, memory, swap, GPU use, VRAM, power against its limit and drive fill; GPU temperature green below 70 °C, yellow from 70 °C, red from 85 °C. Disk speed has no threshold and stays neutral blue / purple (`format.ts`: `level`, `tempLevel`, `LEVEL_COLOR`, `NEUTRAL`).

## Step 1b: overview and detail (2026-11-20)

The user asked for two levels: a coarse result for several machines, and a detail view to click into, in an Apple-clean white look with Datadog / NVIDIA DCGM content (they rejected Grafana, wandb, terminal, cards and two TV-wall mockups first).

- Machines on the overview are added by hand (user decision): migration `0011_machines.sql`, `service/machines` (list in order added, add, remove; This PC is there from the start). Commands `list_machines`, `add_machine`, `remove_machine`; `monitor_targets` lists what can be added.
- `desktop/monitor.rs` keeps one source per listed machine (sessions survive list changes), reads them all each second and emits one `monitor-samples` batch of `MachineSample { target, sample }`. With no window watching, every source pauses.
- Frontend: `monitor-store` keeps a minute of history, the last error and the last-seen time per machine (`targetId`). Status per machine is the worst threshold level of CPU, memory and every GPU's use, VRAM and temperature (`machine.ts`), or Connecting / Unreachable.
- Overview (`components/monitor/overview/`): a summary line (online, GPUs, busy GPUs at 50 % or more, machines needing attention), "Add machine" (This PC, running WSL, SSH config hosts not added yet), and a tile per machine: name, kind, status, GPU summary ("8 × A100-SXM4-80GB"), a block per GPU on the heatmap scale with its use, CPU, memory and the hottest GPU. Unreachable machines are greyed with when they were last seen.
- Detail (`components/monitor/detail/`): back link, name, GPUs / CPU / OS, status, "Remove from overview"; a tile per GPU (use, temperature, a minute's curve, VRAM, power); a GPU × time heatmap of the last minute (a CPU row on machines without GPUs); CPU with a cell per thread on the heatmap scale; memory, swap, each drive and disk speed.
- Look: `.monitor` CSS variables in App.css (Apple light grey canvas `#f5f5f7`, white tiles, `#e5e5ea` lines; Apple's dark greys in dark mode); threshold colours Apple green / a darker yellow / red; heatmap scale pale green → green → yellow → red.
