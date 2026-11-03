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
- Overview (`components/monitor/overview/`; right-click a tile for Open details / Remove from overview, in an app-drawn menu (`ui/context-menu.tsx`, Radix) because the native Windows menu looked out of place): a summary line (online, GPUs, busy GPUs at 50 % or more, machines needing attention), "Add machine" (This PC, running WSL, SSH config hosts not added yet), and a tile per machine: name, kind, status, GPU summary ("8 × A100-SXM4-80GB"), a block per GPU on the heatmap scale with its use, CPU, memory and the hottest GPU. Unreachable machines are greyed with when they were last seen.
- Detail (`components/monitor/detail/`): back link, name, GPUs / CPU / OS, status, "Remove from overview"; a tile per GPU (use, temperature, a minute's curve, VRAM, power); a GPU × time heatmap of the last minute (a CPU row on machines without GPUs); CPU with a cell per thread on the heatmap scale; memory, swap, each drive and disk speed.
- Look: `.monitor` CSS variables in App.css (Apple light grey canvas `#f5f5f7`, white tiles, `#e5e5ea` lines; Apple's dark greys in dark mode); threshold colours Apple green / a darker yellow / red; heatmap scale pale green → green → yellow → red.

## Step 2: GPU programs, as nvitop lists them (2026-11-20)

- Each `GpuSample` carries `processes: Vec<GpuProcess>` (PID, user, VRAM, seconds running; no command, user decision 2026-11-20). Compute programs only: graphics programs (the desktop, browsers) are left out. This is the one exception to "no process list": only the GPUs' programs are read.
- This PC: NVML's `running_compute_processes`, then sysinfo refreshes just those PIDs for user, command and run time. Under Windows' WDDM driver NVML never reports a program's VRAM, so it reads "–".
- Linux machines: `remote.sh` adds `uuid` to the GPU query, prints `nvidia-smi --query-compute-apps=gpu_uuid,pid,used_memory` under `@apps` and `ps -ww -o pid=,user:32=,etimes=,args=` for those PIDs under `@ps`; `parse.rs` ties programs to cards by uuid. A PID that `ps` cannot see (a container's own) keeps only what nvidia-smi knows. WSL's nvidia-smi lists no programs.
- Detail: each GPU tile ends with its programs (user, PID, VRAM, and running time when known), heaviest first. GPU tiles sit in even rows of at most four (3 for 5–6 cards), the big number beside its curve. No command and nothing to click (user decision 2026-11-20). A separate full-width table was tried first; the user found it too empty and badly aligned (2026-11-20).
- Servers that mount /proc with `hidepid` (yc-gpu-2 does: `hidepid=invisible`) hide other users' processes from `ps`. The lab's login banner still names them: root's `lab-gpustat-cache.timer` writes gpustat output to `/var/lib/lab-gpustat-cache` (readable by all, refreshed about once a minute). `remote.sh` prints that file under `@owners` when it exists, and `parse.rs` takes the user of a PID that `ps` cannot see from it. A program no source names shows as "Other user".

## Step 3: conference deadlines (2026-11-20)

Decisions (user, 2026-11-20): follow conferences and search the rest; planning a submission makes a project plus an abstract task; the list is downloaded only when the user presses Refresh.

- Data: ccfddl's combined list `https://ccfddl.github.io/conference/allconf.yml` (about 700 KB, MIT licence, from `ccfddl/ccf-deadlines`). 387 conferences, mostly computer science, MICCAI included. `ai-deadlines` (Papers with Code / Hugging Face) was not used: ccfddl is larger, maintained, and carries CCF ranks.
- `domain/conference.rs` reads it leniently with `serde_yaml_ng` (an entry or date that does not parse is skipped; "TBD" means not announced) and turns each deadline from its zone into Unix ms: AoE = UTC−12, `UTC±N`, and PT with US daylight saving. Keys are ccfddl's `conference_key`, such as `AI/nips` or `MX/miccai`.
- Migration `0012_conferences.sql`: `conferences` (editions as JSON), `conference_source` (when downloaded), `conference_follows` (survives a download), `conference_projects` (edition → project, cascades when the project is deleted).
- `service/conferences`: `replace_all`, `list` (editions from last year on), `set_followed`, `plan`. Planning makes a "paper" template project named "NeurIPS 2027" (plus the round's comment when there are several), coloured orange, starting today, whose deadline is the day the paper deadline falls on here, and a "NeurIPS abstract" task in its Submission module due on the abstract deadline's day. Planning the same edition again opens that project. `service/net.rs` is the shared HTTP client (also used by the paper lookups).
- Commands: `list_conferences`, `refresh_conferences` (async; downloads, then locks the database), `follow_conference`, `plan_conference`.
- UI (`pages/conferences/`, sidebar "Conferences"): before the first download, a box offering it. Then "Following" cards, soonest deadline first: title and year, CCF rank, countdown coloured by urgency (red under a week, yellow under a month), abstract and paper deadlines in local time (the original zone in the tooltip), place and dates, website, and "Plan submission" / "Open project". Below, "Find conferences": search by name, area, CCF rank; rows with a star, the next deadline and time left (first 100 shown).

## Step 4: connect the parts (2026-11-20)

Decisions (user, 2026-11-20): idea todos become real tasks; tasks due today (or overdue and open) show in My Day by themselves; an idea can be linked to a project, which is how ideas reach the safety line; an idea whose venue is a ccfddl conference shows its next deadline with "Plan submission".

- Migration `0013_connect_ideas.sql`: `tasks.idea_id` (cascades with the idea), `ideas.project_id` (set null when the project goes); every `idea_todos` row became a task, and the table was dropped. Checked on a copy of the real database first.
- Idea todos (`service/ideas/notes.rs`) keep their commands but read and write `tasks`: a new todo goes into the idea's project if it has one; done and delete go through the task service (timer, undo). They now appear in the task pool or their project, Planned, My Day, the calendar, Todo Duo, the heatmap and the research overview's deadline list (with the idea's title).
- My Day = added to My Day today, scheduled today, due today, or overdue and still open. An overdue task leaves My Day once done.
- `ideas::mutation::set_project` (command `set_idea_project`) links or unlinks an idea; its todos move into the project (outside modules) or back to the pool. Deleting a project hands the idea's todos back to the pool instead of deleting them.
- `plan_conference` takes an optional idea: the project made (or found) for the edition is linked to that idea.
- UI: the idea page has a box under venue and deadline: a project picker with progress ("3/8 tasks done · due …") and "Open project"; and, when the venue matches a conference by title or key (`findVenue`), its next paper deadline, countdown and "Plan submission". A task that is an idea's todo shows "Todo of idea …" in its details, opening the idea.
- Queries: task writes also refresh `['ideas']`; idea writes also refresh `['tasks']` and tell other windows (`tasks-changed`).

## Step 5: project board (2026-11-20)

Decision (user, 2026-11-20): status columns To do / Doing / Done.

- Migration `0014_task_started.sql`: `tasks.started_at`. A task is Doing while it has a start and no `done_at`.
- `tasks::mutation::set_stage` (command `set_task_stage`, undoable as "Move task"): Doing keeps an earlier start, To do clears it and stops the task's timer, Done completes the task; moving a done task back reopens it. Starting the timer on a task sets its start too.
- UI: a List / Board switch on the project page (remembered for the session in `ui-store.projectView`). `pages/projects/ProjectBoard.tsx`: three columns, cards with title, module, due date, estimate and steps; drag a card (native drag, as on the calendar) to another column; click to open the details pane; an add box at the bottom of To do. Done shows the latest finished first.

## Step 6: external calendars (2026-11-20)

Decisions (user, 2026-11-20): Outlook / Office 365 and course or seminar feeds; events show on the calendar page only (not My Day, not available time); refreshed on start and every hour, plus a button.

- `domain/ics.rs` parses a feed into one `Occurrence` per event occurrence in a window (about three months back to a year ahead): line unfolding, escaped text, UTC / zoned / floating / all-day times, DURATION, RRULE (expanded with the `rrule` crate, zoned events in their zone so daylight saving keeps the wall-clock time), EXDATE, RECURRENCE-ID (moved or changed occurrences replace the original), STATUS:CANCELLED. Zones: IANA names, Windows names through `domain/windows_zones.rs` (CLDR windowsZones.xml "001" rows, Unicode License, 142 zones), else the feed's VTIMEZONE standard offset. UNTIL without Z is made UTC for the `rrule` crate. Tested with a constructed Outlook feed and on Google's public "Holidays in China" feed.
- Migration `0015_calendars.sql`: `calendars` (name, link, colour, visible, fetched_at, error) and `calendar_events` (each occurrence, replaced whole on every successful download; a failed download keeps the old events and records the error).
- `api/calendars.rs::refresh` downloads outside the database lock; `desktop/calendars.rs` runs it on start and hourly on its own thread and emits `calendars-changed`. Commands: `list_calendars`, `add_calendar` (downloads at once), `update_calendar`, `remove_calendar`, `refresh_calendars`, `list_calendar_events`. webcal:// links are stored as https://; links stay on this machine and are sent only to their own server.
- UI: "Calendars" on the calendar page opens the subscriptions dialog (colour, name, events and last update or the error, show/hide, remove; add with name, link and colour; refresh now). Events show in month and week cells above tasks: a bar in the calendar's colour, the start time on the first day, the title; the tooltip has the time span and place. All-day events are tinted.

## Step 7: desktop calendar widget (2026-11-20)

Decisions (user, 2026-11-20): its own window, always available and independent of Todo Duo; days show deadlines and how busy they are; a click lists the day in the widget, a double-click opens the main calendar there.

- `desktop/month_widget.rs`: window `month-widget` (300 × 380, frameless, transparent, no taskbar button, kept under other windows), created hidden at start and shown if it was showing last time (migration `0016_month_widget.sql`, table `widgets`). The tray menu's "Desktop calendar" shows and hides it; its × hides it. Position and size are restored by the window-state plugin. Capability `capabilities/month-widget.json`.
- `service/month::marks(from, to)` (command `month_marks`): per day, the minutes of tasks scheduled on it, the day's available minutes (weekday default or override), and items: project deadlines, open tasks due, followed conferences' abstract and paper deadlines (local day), then scheduled tasks.
- UI (`pages/month/MonthWidget.tsx`, entry `windows/month`, reusing Todo Duo's transparent styles and cross-window task sync): month header with previous / Today / next / hide; a 7-column grid where each day is tinted by `busy.ts` (scheduled time against available time: light and medium blue under 50 % and 90 %, yellow up to full, red over or on a rest day) and has up to three deadline dots; the selected day's list below. Double-click asks Rust (`open_calendar_day`) to show the main window, which gets `open-calendar-day` and opens the calendar page at that day (`ui-store.calendarDate`).
