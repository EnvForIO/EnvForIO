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
