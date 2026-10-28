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
