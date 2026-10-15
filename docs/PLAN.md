# EnvIO Plan

A desktop app for researchers: tasks, deadline planning, research ideas, calendar and machine monitoring. Windows first, macOS maybe later, no mobile.

Last updated: 2026-11-19. The starter template is in place and renamed to EnvIO; no EnvIO features exist yet.

## Principles

- **Replicate first, then customize.** Reach feature parity with the reference products first; only after that change things to fit actual needs.
- **Write our own code.** DayEcho, Todo Duo and Seedbank are references for features and ideas only; do not copy their code. Glance is MIT, so its Rust code may be ported with attribution. For personal study and use only; not distributed.
- **No new features during replication.** New ideas go to Phase 4.

## Reference products

| Product | What it is | Source |
|---|---|---|
| Todo Duo | Two-window todo list with a completion heatmap | Screenshot of a Xiaohongshu post |
| DayEcho (日有回响) | Works back from deadlines to how much to do each day | https://riyouhuixiang.com |
| Glance | Local machine monitor panel that slides out from the screen edge | https://github.com/lulu-loopp/glance |
| Seedbank idea | Research idea manager: tracks each idea from spark to submission | https://apps.apple.com/us/app/seedbank/id6829600551 (by Pengfei Wang, Mac / iPhone / iPad; added 2026-11-19, version 1.7.1) |

## UI shape

Decided 2026-11-16: **the main body is a conventional main window with a sidebar, laid out like Microsoft To Do.** Only the layout is borrowed; icons, colours, copy and assets are our own.

Three panes:

| Area | Contents |
|---|---|
| Left sidebar | Lists and feature entries; collapsible |
| Middle | Tasks of the current list, with an "Add a task" input |
| Right detail pane | Shown when a task is opened: deadline, estimate, project, steps, notes |

Sidebar entries (my proposal, not yet confirmed):

| Entry | Feature |
|---|---|
| My Day | DayEcho's "Today", with the daily safety line at the top |
| Important | Todo Duo's flag |
| Planned | Items with a deadline |
| Tasks | Task pool: items not in any project |
| One entry per project | DayEcho projects, one list each; a kanban view later |
| Calendar | Month / week scheduling calendar |
| Stats | Statistics and heatmaps |
| Monitor | Machine monitoring |
| Ideas | Seedbank's research idea library, filtered by status and tag |
| Library | Seedbank's paper library and reading list |
| Feeds | RSS (Phase 4) |

Small windows are satellites of the main window and share its data: Todo Duo's capsule and todo card, Glance's edge panel, a desktop calendar widget, and a quick-capture window opened by a global shortcut.

## Technical decisions

| Item | Decision |
|---|---|
| Name | EnvIO (`EnvIO` in the UI; `envio` for packages and folders) |
| Desktop shell | Tauri 2 |
| Frontend | React + TypeScript + Tailwind |
| Package manager | npm (decided 2026-11-16; not pnpm) |
| Drag and drop / charts | dnd-kit / uPlot or ECharts |
| Backend | Rust (comes with Tauri) |
| Storage | Local SQLite only; no accounts, no cloud sync |
| UI language | English only (decided 2026-11-19: the template's Arabic and French files were removed). The `i18next` + `react-i18next` setup stays, and every string goes through the translation function. |
| Docs language | English (decided 2026-11-19) |

## What we do not build ourselves

Rule: the project skeleton and general capabilities come from mature open-source projects; only logic specific to EnvIO is written by us.

**Skeleton**: the community template `dannysmith/tauri-template` (decided 2026-11-19; copied in from commit `8e0db1e` and renamed to EnvIO).
- MIT, single maintainer, 317 stars when checked on 2026-11-16. It fits the main-window shape:
  - Collapsible, resizable left and right sidebars around a main area: the three panes above
  - A floating window opened by a global shortcut: becomes quick capture, and is the example for other small windows
  - Built in: i18n, preferences, theme synced across windows, command palette, type-safe Rust–TS bridge (tauri-specta), shadcn/ui, Zustand, TanStack Query, test and lint tooling
  - Still to change: it builds an `.msi` by default, which must become NSIS for cross-compiling; turn off the auto-updater for now. It already uses npm.
  - Missing: SQLite, tray, autostart; add them with official Tauri plugins
- The official scaffold `create-tauri-app` (React + TypeScript + Vite), maintained by the Tauri team, gives only a minimal skeleton. It was planned for the Phase 0 check.

**Ready-made libraries** (candidates; check licence and maintenance when each is adopted):

| Need | Use |
|---|---|
| UI components | shadcn/ui (Radix + Tailwind) |
| State and data fetching | Zustand, TanStack Query |
| i18n | i18next, react-i18next |
| Drag and drop, kanban | dnd-kit |
| Month / week calendar | FullCalendar or Schedule-X |
| Heatmaps, trends, monitor charts | ECharts |
| Local database | Rust `rusqlite` (SQLite), accessed only from Rust |
| Tray, autostart, window position, global shortcut, single instance, notifications | Official Tauri plugins |
| Blur and acrylic window effects | `window-vibrancy` (maintained by the Tauri team) |
| Local CPU, memory, disk, network, processes | Rust `sysinfo` |
| GPU | `nvidia-smi` or Rust `nvml-wrapper` |
| SSH | Rust `russh` |
| RSS parsing | Rust `feed-rs` |
| Markdown and LaTeX rendering | `react-markdown` + KaTeX |
| Paper metadata from DOI / arXiv | Crossref and arXiv public APIs |

## Directory structure

Proposed 2026-11-19. The user likes the modular, interface-first style of HoPGoldy and LokiSharp, so the design follows them. The top level keeps the community template's layout.

### Influences

| Source | Pattern borrowed | Licence |
|---|---|---|
| HoPGoldy `cube-diary` / `cube-note` | One folder per backend module, `controller` only handles requests, `service` holds logic; data shapes defined once and shared by frontend and backend; modules wired together in one place; `docs/how-to-build-a-new-module.md` gives fixed steps for adding a module | GPL-3.0, ideas only |
| HoPGoldy `tiny-translator` | A single `index.html`; each window picks its view by URL; window code in `src/windows/` | None declared, ideas only |
| LokiSharp `CatallaX` | A data source as one interface with several implementations, chosen by a factory; one repository class per table; project rules fixed in `AGENTS.md` | MIT |
| LokiSharp `workerd-manager` | Rust layered as schema / migrations / service / API; queries and mutations kept apart; tests next to the code | MIT |

### Layout

Decided 2026-11-19: **naming follows LokiSharp.** Split by layer first (`api` / `service` / `entity` / `domain` / `providers`), then one file per resource inside each layer, with the same name for a resource in every layer. Rust uses snake_case; collections are plural (`tasks`), a single table is singular (`task`); migrations are numbered with a description. Frontend file names follow the template's conventions.

```
envio/
├─ AGENTS.md              Project rules, for humans and AI
├─ docs/
│  ├─ PLAN.md             This file
│  ├─ m0_toolchain.md  m1_main_window.md  ...   One note per phase, like CatallaX's m1_xxx.md
│  └─ adding_a_resource.md   Fixed steps for adding a resource
├─ index.html             The only HTML entry, shared by all windows
├─ locales/en.json        UI strings, English only
├─ src/                   Frontend: display and interaction only
│  ├─ main.tsx            Picks a window from windows/ by URL (/, /capture, /duo ...)
│  ├─ windows/            One folder per window; only assembles pages
│  │  └─ main/  capture/  duo/  panel/  calendar-widget/
│  ├─ api/                The only way to call the backend; mirrors backend api/: tasks.ts  projects.ts ...
│  ├─ pages/              Main window pages: my-day/  planned/  project/  calendar/  stats/  monitor/  feeds/
│  ├─ layouts/            Three-pane layout, sidebar, title bar
│  ├─ components/         Shared UI pieces; ui/ is generated by shadcn
│  └─ lib/  hooks/  store/  i18n/   From the template; lib/bindings.ts is generated from Rust, never edited by hand
└─ src-tauri/             Backend: all business logic and data
   ├─ migrations/         Append only: 0001_initial_schema.sql, 0002_add_xxx.sql ...
   ├─ tests/              Integration tests against a real SQLite database
   └─ src/
      ├─ main.rs  lib.rs
      ├─ config.rs        AppState: database connection, app settings
      ├─ errors.rs        Shared error type
      ├─ api/             Commands the frontend can call, one file per resource; request/response only
      │  └─ tasks.rs  projects.rs  plans.rs  ideas.rs  papers.rs  calendar.rs  stats.rs  monitor.rs  feeds.rs  settings.rs
      ├─ service/         Business logic, one folder per resource
      │  └─ tasks/
      │     ├─ mod.rs
      │     ├─ query.rs     Reads
      │     └─ mutation.rs  Writes
      ├─ entity/          One file per table: task.rs  project.rs  work_day.rs ...
      ├─ domain/          Pure computation, no database, with tests
      │  └─ safety_line.rs  workload.rs  time_parse.rs
      ├─ providers/       External data sources
      │  ├─ monitor/
      │  │  ├─ base.rs      Trait and shared data shapes
      │  │  ├─ factory.rs   Builds the implementation for the selected target
      │  │  ├─ local.rs  wsl.rs  ssh.rs
      │  │  └─ nvidia_smi.rs   Parses nvidia-smi output
      │  ├─ papers/         Paper metadata from DOI and arXiv
      │  └─ feeds/          RSS fetching (Phase 4)
      ├─ pipeline/        Scheduled jobs: sync_feeds.rs, sync_calendars.rs (Phase 4)
      └─ desktop/         Desktop features unrelated to business logic: window.rs  tray.rs  shortcut.rs
```

`desktop/` and the frontend folder names are not from LokiSharp (his repositories have no equivalent); I added them.

### How a request flows

Example: ticking a task as done.

1. The UI calls `completeTask(id)` in the frontend `api/tasks.ts`
2. That calls the generated `lib/bindings.ts`; the types come from Rust, so a mismatch fails to compile
3. Rust `api/tasks.rs` receives the call and hands it to `service/tasks/mutation.rs`
4. `mutation.rs` marks the task done, records the actual time, then calls `domain/safety_line.rs` to recompute
5. The result is written to SQLite

### Rules (to be written into `AGENTS.md`)

- **Define interfaces once.** Request and response shapes live in Rust `api/`; TS types are generated, like the shared schema in HoPGoldy's projects.
- **Do not skip layers.** `api` only handles requests and never writes SQL; SQL appears only in `service`; `domain` only computes and never touches the database; `providers` are called only from `service`.
- **The frontend only displays.** All business computation is in Rust, including the safety line, so the main window and every small window always show the same numbers. (Decided 2026-11-19)
- **Only Rust touches the database**, with `rusqlite`, not `tauri-plugin-sql`. SQLite is the single source of truth; the frontend stores no business data. (Decided 2026-11-19)
- **Schema changes only through new migration files**; never edit existing ones.
- **Remote monitoring details stay inside their provider.** SSH and WSL specifics live only in their implementation files; the UI sees one shared data shape.
- **Strict types.** TS strict mode, no `any`; Rust passes clippy.
- **Do not build features from later phases** unless explicitly asked.
- **Same name for a resource in every layer.** To change "tasks", look for the `tasks` / `task` files in each layer.
- **Only one `index.html`**; remove the template's `quick-pane.html`.
- **No separate Rust crates or npm packages.** Naming follows `workerd-manager`, but it splits each layer into its own crate; EnvIO uses folders until compile times make splitting worthwhile.

## Development environment

- **No Rust, gcc, MSVC or any other compiler toolchain on Windows.** Everything lives in WSL (Ubuntu 24.04).
- **Code lives in the WSL filesystem**: `~/EnvIO`, reachable from Windows at `\\wsl.localhost\Ubuntu-24.04\home\<you>\EnvIO`. Not on a Windows drive, because WSL access to Windows drives is slow and hurts builds, installs and hot reload.
- Already in WSL (checked 2026-11-15): Node 24, pnpm 11, Rust 1.89 and rustup, build-essential, curl, wget, file, libssl-dev, llvm, pkg-config, git. WSLg and running Windows programs from WSL both work.
- Installed and re-checked 2026-11-15:
  - Tauri Linux dependencies: `libwebkit2gtk-4.1-dev` (2.52.6), `libxdo-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`
  - Cross-compiling for Windows: `nsis`, `lld`, `clang`, Rust target `x86_64-pc-windows-msvc`, `cargo-xwin` 0.23.1
  - The Tauri CLI is installed per project with npm, not globally
- Known gap: there is no `clang-cl` command. It is only needed when cross-compiling dependencies with C code (such as SQLite), and `cargo-xwin` may handle it. If it errors, install `clang-tools` or add a `clang-cl` link to `clang`.
- 2026-11-19: Tauri needs rustc 1.90+, so `rustup update stable` upgraded Rust to 1.100.0; the Windows target is kept. rustup in WSL comes from snap and has no `~/.cargo/env`, so `source ~/.cargo/env &&` was removed from the template's npm scripts.
- 2026-11-19 Phase 0: the cross-compile works. `cargo-xwin` lives in `~/.cargo/bin`, which is not on PATH, so it is linked into `~/.local/bin`. `clang-cl` was not needed yet.
- Nothing to install on Windows; WebView2 ships with Windows 11.
- `sudo` in WSL needs a password, so system packages are installed by hand.
- How Windows builds are produced:
  - Day to day: cross-compile an exe in WSL with `cargo-xwin` and run it on Windows. Tauri marks this experimental, and it only produces NSIS installers.
  - Releases: the Windows runner on GitHub Actions. macOS builds will go the same way later.
- The references' selling points are Windows window behaviours (transparency, linked windows, edge triggers) that cannot be tested in a WSL Linux window, so the cross-compiled exe is the main way to verify them.

## Phases

### Phase 0: verify the toolchain

- [x] Cross-compile a Windows exe in WSL and run it on this machine (2026-11-19; details in `docs/m0_toolchain.md`)
- [x] Show a transparent, frameless, draggable window (2026-11-19, confirmed on Windows 11)

If this fails, revisit the "no toolchain on Windows" premise.

### Phase 1: main window and Todo Duo parity

Before starting, design the tables for Phase 2's needs (projects, deadlines, estimates, scheduled dates) to avoid rework.

- [x] Three-pane main window: lists on the left, tasks in the middle, details on the right (see "UI shape"); start with My Day, Important, Planned and Tasks (2026-11-19)
- [x] Two separate windows: a capsule on top and a todo card below; dragging one moves the other; each resizes independently (2026-11-19, confirmed on Windows 11)
- [x] The capsule expands into a heatmap with year / month / week ranges (2026-11-19, confirmed on Windows 11)
- [x] Clicking a day on the heatmap switches the card to that day's todos (2026-11-19, confirmed on Windows 11)
- [x] Todos: add, tick off, date tag, flag (2026-11-19, confirmed on Windows 11)
- [x] Context menu: rename, pin, delete (2026-11-19, confirmed on Windows 11)
- [x] Adjustable material, font and size, applied to both windows (2026-11-19, confirmed on Windows 11)
- [x] Data stored locally (2026-11-19, confirmed on Windows 11)
- [x] Tray icon, autostart, remembered window position (2026-11-19; closing the window now hides it to the tray)

### Phase 2: DayEcho parity

All of this lives in the main window: projects go in the sidebar, Calendar and Stats get their own entries.

- [ ] **Projects**: name, template, start date, deadline, "N days early" buffer, colour
- [ ] **Breakdown**: modules and tasks under a project, each task with an estimate
- [ ] **Daily safety line**: see the algorithm section
- [ ] **Available time**: hours per weekday; override for a single day; 0 means a rest day
- [ ] **Calendar**: month and week views; drag to schedule; right-click a day to add, view or note
- [ ] **Today**: to do today, to schedule, a line written for today
- [ ] **Task pool and quick capture**: standalone items; typing `14:00-15:00 group meeting` detects the time
- [ ] **Item list**: open / with deadline / done / all, filtered by project
- [ ] **Timer**, recording actual time on completion
- [ ] **Partial completion**: record how much was done; the rest becomes a new task on the next work day
- [ ] **Estimate calibration**: use the actual / estimated ratio to forecast remaining work, finish date and project health
- [ ] **14-day load forecast chart**
- [ ] **Check-ins and streaks**; "yesterday fell short by X, redistributed"
- [ ] **Day rollover time**: a new day starts at 07:00 by default
- [ ] **Stats**: items done, time spent, completion rate, active days, time trend, where time went, completion heatmap, weekly rhythm, project progress; by week / month / year
- [ ] **Export**: day / week / month / project lists as PDF, image, spreadsheet, calendar file
- [ ] **Yearly review** and share card
- [ ] Undo, light / dark

Not doing: login and cloud sync, the milk-tea challenge (奶茶对局), "add to phone home screen".

### Phase 2.5: Seedbank idea parity

Numbered 2.5 so later phase references stay valid. Based on the official App Store description (checked 2026-11-19) and the user's Xiaohongshu screenshots; I have not used the app. Its UI is already three panes, matching EnvIO's main window.

- [ ] **Idea pipeline**: a one-line "Jot down a new idea" input at the top; new ideas stay at the top; All ideas, Pinned and Unfinished entries
- [ ] **Status**: Spark → Researching → In progress → Writing → Submitted → Done, plus On hold and Dropped; the sidebar filters by status with counts
- [ ] **Priority, pin, tags**; user-defined tags, filterable
- [ ] **Target journal / conference**: a coloured label per idea, such as MICCAI or PLOS ONE (seen in screenshots)
- [ ] **List card**: title, one-line description, target venue, segmented progress bar, current step, days left, item counts, tags
- [ ] **Detail page**: status, priority, pin, target venue, title, description, tags; Overleaf or other links; sections for Progress, Todos, Thinking, Problems, Papers, Log
- [ ] **Progress checklist**: one research workflow per idea (the screenshot shows 8 default steps: literature review, hypothesis, experiment design, implementation, analysis, writing, submission prep, wrap-up); steps can be added; completion dates recorded; shows "Current: step (3/8)"
- [ ] **Todos and problems**: action items with deadlines; blocking problems recorded with their solutions
- [ ] **Progress log**
- [ ] **Notes**: Markdown with LaTeX, code blocks and tables; click to edit
- [ ] **Paper library**: paste a DOI or arXiv link to fetch title, authors, year and abstract; reading status (including "To read") and notes; copy BibTeX in one click
- [ ] **Paper links**: attach papers to ideas with a relation (Inspiration / Baseline / Competing work) and a note on why they matter
- [ ] **PDF**: download open-access PDFs automatically; import local PDFs; open any time
- [ ] **Overview page**: idea counts by status, unfinished ideas, todos, open problems, papers to read; ideas in progress with progress; deadline list; todo and problem summary; export everything to PDF
- [ ] **Export**: SQLite, JSON, PDF
- [ ] **Light / dark**

Not doing: the AI assistant (one sentence to split steps, add todos, find papers, change status; the user decided on 2026-11-19 to skip it for now, Phase 4 if needed later); iCloud / Aurora DSQL / PostgreSQL sync (EnvIO has no cloud sync); 8 UI languages (EnvIO is English only); 7 colour themes; free vs Pro limits.

Ideas and DayEcho projects are built separately, each with its own tables (decided 2026-11-19). Connecting them waits for Phase 4, when merging will be decided: todos with deadlines inside ideas feed My Day and the safety line; "Submitted" can link to the conference deadline calendar.

### Phase 3: Glance parity

- [ ] Push the mouse against the screen edge to slide the panel out; move away to hide; toggle with a shortcut
- [ ] Drag the panel off the edge to make a desktop widget; snap back near the edge; can sit below other windows
- [ ] Three looks
- [ ] Local monitoring: CPU, memory, disk, network, processes, GPU
- [ ] **Monitor data source behind a replaceable interface**, ready for Phase 4's WSL and SSH targets

Not doing: game frame-rate overlay, lyrics, phone remote.

Known gap: Glance draws natively, with a ~6 MB installer and ~55 MB RAM; Tauri with WebView will be noticeably heavier.

### Phase 4: customize

Order by what is most wanted; no need to finish everything at once.

- [ ] **Kanban view** as another view of a project
- [ ] **Monitor target picker**: defaults to `Local`; can switch to `WSL` or an SSH host (read from `~/.ssh/config`), like picking an environment; the panel shows whichever machine is selected; only the selected target is polled
- [ ] **nvitop-style GPU panel**: per-GPU utilisation, memory, temperature, power, fan; per-process GPU, memory, user and command. Remote hosts are read by running `nvidia-smi` over SSH; nothing is installed on the server
- [ ] **Research deadlines**: a conference deadline calendar that creates a project with each stage's dates when a conference is picked; templates for submissions, grants, proposals, defences; AoE time zone conversion
- [ ] **Desktop calendar widget**: a compact month view marking busy days and deadlines
- [ ] **Read-only external calendars**: add an ICS link, fetched on a schedule
- [ ] **RSS**: for low-volume sources such as Quanta Magazine; add and remove feeds, list with cover images, read / unread, open in browser, add to todos in one click, scheduled refresh
- [ ] **Connect the parts**: tasks from deadlines flow into Today; completion feeds the heatmap
- [ ] **macOS version**

## Safety line algorithm

The idea in my own words; the implementation is written from scratch.

1. **Only work days count.** A day with available time set to 0 is a rest day and gets no share. Someone who never set it has every day as a work day.
2. **Work back from the plan date.** Plan date = deadline − buffer days. Once today is past the plan date, the target falls back to the real deadline.
3. **A project's daily need** = remaining hours ÷ work days from today (or the start date, if the project has not started) to the target. Remaining hours = sum of task estimates − hours done. For an overdue project, everything left is due today.
4. **Level across projects (on by default).** Process projects from earliest end date; cut remaining work into 15-minute chunks and place each on the day with the lightest total load that is still under that day's available time, within the project's own start and end. Only when every day is full does a chunk go to the relatively least crowded day, allowing overflow.
5. **Earliest deadline first (off by default).** When on, the earliest project uses only the first 70% of its window, the second earliest the first 85%.
6. **Today's line is frozen in the morning.** The first open each day records how much each project needs today; finishing work does not lower the line; only changing the plan recomputes it. The next day compares it with what was actually done.
7. **What counts as done.** Only tasks placed in a project and given an estimate count.

## Open questions

1. **Sidebar entries** are my proposal and not yet confirmed.
2. **Directory structure**: the skeleton, LokiSharp naming and "all logic in Rust" are decided; the exact resources and the names of `desktop/` and the frontend folders are my proposal.
3. **Todo Duo's capsule and todo card windows**: I keep them by default as desktop windows beside the main window. If the main window makes them unnecessary, most of Phase 1 goes away.
4. **CPU and motherboard temperature, power and fans**: needs a kernel driver and admin rights; GPU temperature is unaffected and will be there.
5. **Glance workbench items**: Markdown notes (I suggest not), quick launch, clipboard station, global search and quick look, media control. Glance's todo block duplicates Phase 1 and is not done.
6. **Calendar's three forms** (scheduling calendar, desktop widget, external subscriptions) are my proposal and not yet confirmed.
7. **Phase order** defaults to Todo Duo → DayEcho → Seedbank → Glance.
8. Open-source conference deadline data (I recall `ccfddl/ccf-deadlines` and `ai-deadlines`): repository names, format and licence not yet checked.
