# EnvForIO design

The lasting decisions behind EnvForIO: technology, the libraries used instead of our own code, how the code is laid out and how a request flows, the development environment, and the safety line rules.

## Technical decisions

| Item                   | Decision                                                                                                                                                                                                                                                                                                                     |
| ---------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Name                   | EnvForIO (renamed from EnvIO): `EnvForIO` in the UI and for the repository folder, `envforio` for the npm package, the crate and `envforio.exe`. The app identifier is `io.github.envforio`. Kept from the old name so existing data and files still work: `envio.db` and the research archive's `envio-research` format tag |
| Desktop shell          | Tauri 2                                                                                                                                                                                                                                                                                                                      |
| Frontend               | React + TypeScript + Tailwind                                                                                                                                                                                                                                                                                                |
| Package manager        | npm (not pnpm)                                                                                                                                                                                                                                                                                                               |
| Drag and drop / charts | dnd-kit / uPlot or ECharts                                                                                                                                                                                                                                                                                                   |
| Backend                | Rust (comes with Tauri)                                                                                                                                                                                                                                                                                                      |
| Storage                | Local SQLite only; no accounts, no cloud sync                                                                                                                                                                                                                                                                                |
| UI language            | English only. The `i18next` + `react-i18next` setup stays, and every string goes through the translation function.                                                                                                                                                                                                           |
| Docs language          | English                                                                                                                                                                                                                                                                                                                      |

## Look: native Windows, with a day strip

A ledger-style task list with a strip of today's hours, in Windows 11's own look. The look avoids what makes a UI read as generated: a lavender selection tint (Tailwind's indigo pair), hairlines on everything (the broadsheet look), a row of big figures over small labels, middle-dot meta strings, and IBM Plex. The rules:

- **Native**: Windows 11's neutrals and the system face (Segoe UI Variable, YaHei for Chinese) in `theme-variables.css`, 14px body. Its blue (`--primary`) only for the primary action, today, checked boxes and the current item's pill; red only for what is late. No lavender, no gradients.
- **Selection** is a neutral grey (`--selected`) with a short blue pill beside the current sidebar entry, as Windows marks it (`components/layout/nav-item.ts`).
- **Lists**: task rows have no box and no rule; hover and selection are a rounded background. The estimate and the date sit in aligned columns at the right (`TaskRow`); subtasks are indented behind a grey rule; the star shows on hover unless set.
- **Day strip** (`pages/plans/DayStrip.tsx`) beside My Day: the day's available time as a column, a block per project's share of today's safety line and per other task of today with an estimate or a time slot, the free time dashed, and a red rule where the day runs out.
- **Switches**: `components/ui/segmented.tsx` on native radio buttons for every one-of-a-few choice; tag filters stay chips (`FilterChip`).
- **Overview pages** (Research, Stats): the numbers are one sentence (`Summary` in `components/ui/ledger.tsx`), and sections open with a title and space, not a rule. Stats sits in one column capped at `max-w-5xl`.
- **Charts** (`pages/stats/`): every bar column has a faint track, so an empty period still reads as a chart, with one line saying it is empty; today's column is solid blue and keeps its label. The year heatmap fills the width, with month and weekday labels and a less-to-more key. Label placement and heatmap levels are in `chart-layout.ts`, with tests.
- **No middle dots** joining facts: commas in a phrase, separate spans with space for two facts.
- **Access**: one focus ring for every control (`App.css`); text can be selected except in chrome; checkboxes and radios are native inputs; `::selection`, `scrollbar-color`, `accent-color` and `color-scheme` follow the theme.
- **Checks**: `npm run dev` opens the frontend in a browser at localhost:1420 with the backend mocked (`src/dev/browser-mock.ts`, answers recorded into the git-ignored `src/dev/fixture.local.json`), so the skills' checkers can run on it.
- Not yet in this style: the Ideas and Library tabs, the project page and board, the details pane and Preferences.

## What we do not build ourselves

Rule: the project skeleton and general capabilities come from mature open-source projects; only logic specific to EnvForIO is written by us.

**Skeleton**: the community template `dannysmith/tauri-template` (copied in from commit `8e0db1e` and renamed to EnvForIO).

- MIT, single maintainer. It fits the main-window shape:
  - Collapsible, resizable left and right sidebars around a main area: the three panes above
  - A floating window opened by a global shortcut: becomes quick capture, and is the example for other small windows
  - Built in: i18n, preferences, theme synced across windows, command palette, type-safe Rust–TS bridge (tauri-specta), shadcn/ui, Zustand, TanStack Query, test and lint tooling
  - Differences: cross-compiled builds are NSIS installers, not the template's default `.msi`, and the template's auto-updater is not used. It uses npm, like EnvForIO.
  - Not in the template: SQLite (`rusqlite`), tray and autostart (official Tauri plugins)
- The alternative, the official scaffold `create-tauri-app` (React + TypeScript + Vite), maintained by the Tauri team, gives only a minimal skeleton.

**Ready-made libraries** (candidates; check licence and maintenance when each is adopted):

| Need                                                                              | Use                                               |
| --------------------------------------------------------------------------------- | ------------------------------------------------- |
| UI components                                                                     | shadcn/ui (Radix + Tailwind)                      |
| State and data fetching                                                           | Zustand, TanStack Query                           |
| i18n                                                                              | i18next, react-i18next                            |
| Drag and drop, kanban                                                             | dnd-kit                                           |
| Month / week calendar                                                             | FullCalendar or Schedule-X                        |
| Heatmaps, trends, monitor charts                                                  | ECharts                                           |
| Local database                                                                    | Rust `rusqlite` (SQLite), accessed only from Rust |
| Tray, autostart, window position, global shortcut, single instance, notifications | Official Tauri plugins                            |
| Blur and acrylic window effects                                                   | `window-vibrancy` (maintained by the Tauri team)  |
| Local CPU, memory, disk, network, processes                                       | Rust `sysinfo`                                    |
| GPU                                                                               | `nvidia-smi` or Rust `nvml-wrapper`               |
| SSH                                                                               | Rust `russh`                                      |
| RSS parsing                                                                       | Rust `feed-rs`                                    |
| Markdown and LaTeX rendering                                                      | `react-markdown` + KaTeX                          |
| Paper metadata from DOI / arXiv                                                   | Crossref and arXiv public APIs                    |

## Directory structure

The layout follows the modular, interface-first style of HoPGoldy's and LokiSharp's projects. The top level keeps the community template's layout.

### Influences

| Source                              | Pattern borrowed                                                                                                                                                                                                                                                      | Licence                   |
| ----------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------- |
| HoPGoldy `cube-diary` / `cube-note` | One folder per backend module, `controller` only handles requests, `service` holds logic; data shapes defined once and shared by frontend and backend; modules wired together in one place; `docs/how-to-build-a-new-module.md` gives fixed steps for adding a module | GPL-3.0, ideas only       |
| HoPGoldy `tiny-translator`          | A single `index.html`; each window picks its view by URL; window code in `src/windows/`                                                                                                                                                                               | None declared, ideas only |
| LokiSharp `CatallaX`                | A data source as one interface with several implementations, chosen by a factory; one repository class per table; project rules fixed in `AGENTS.md`                                                                                                                  | MIT                       |
| LokiSharp `workerd-manager`         | Rust layered as schema / migrations / service / API; queries and mutations kept apart; tests next to the code                                                                                                                                                         | MIT                       |

### Layout

**Naming follows LokiSharp.** Split by layer first (`api` / `service` / `entity` / `domain` / `providers`), then one file per resource inside each layer, with the same name for a resource in every layer. Rust uses snake_case; collections are plural (`tasks`), a single table is singular (`task`); migrations are numbered with a description. Frontend file names follow the template's conventions.

```
EnvForIO/
├─ AGENTS.md              Project rules, for humans and AI
├─ docs/
│  ├─ userguide/         How to use the app
│  └─ developer/         How the code is built (this file and the pattern guides)
├─ index.html             The only HTML entry, shared by all windows
├─ locales/en.json        UI strings, English only
├─ src/                   Frontend: display and interaction only
│  ├─ main.tsx            Picks a window from windows/ by URL (?window=main | quick-pane | duo-capsule | duo-card)
│  ├─ windows/            One folder per window; only assembles pages: main/  quick-pane/  duo/
│  ├─ api/                The only way to call the backend; mirrors backend api/: tasks.ts  projects.ts ...
│  ├─ pages/              Pages: tasks/  projects/  calendar/  research/  ideas/  papers/  reader/  monitor/  stats/  duo/ ...
│  ├─ components/         Shared UI pieces (layout/, preferences/, monitor/ ...); ui/ is generated by shadcn
│  └─ lib/  hooks/  store/  services/  i18n/   lib/bindings.ts is generated from Rust, never edited by hand
└─ src-tauri/             Backend: all business logic and data
   ├─ migrations/         Append only: 0001_initial_schema.sql, 0002_projects.sql ...
   └─ src/
      ├─ main.rs  lib.rs  bindings.rs (the command list for tauri-specta)
      ├─ config.rs        AppState: database connection, undo stack
      ├─ errors.rs        Shared error type (AppError)
      ├─ db/              Opening SQLite and running migrations
      ├─ api/             Commands the frontend can call, one file per resource; request/response only
      │  └─ tasks.rs  projects.rs  plans.rs  ideas.rs  papers.rs  calendar.rs  stats.rs  monitor.rs  feeds.rs ...
      ├─ service/         Business logic, one folder per resource; the only layer that writes SQL
      │  └─ tasks/
      │     ├─ mod.rs
      │     ├─ query.rs     Reads
      │     └─ mutation.rs  Writes
      ├─ entity/          One file per table: task.rs  project.rs  idea.rs ...
      ├─ domain/          Pure computation, no database, with tests: safety_line.rs  day.rs  ics.rs ...
      ├─ providers/       External data sources
      │  └─ monitor/
      │     ├─ base.rs      Trait and shared data shapes
      │     ├─ factory.rs   Builds the implementation for the selected target
      │     ├─ local.rs  remote.rs (WSL and SSH)  targets.rs
      │     └─ nvidia.rs    NVIDIA readings through NVML
      ├─ desktop/         Desktop features outside business logic: tray.rs  duo.rs  monitor.rs  refresh.rs
      └─ commands/        Commands kept from the template: preferences, quick pane, recovery, notifications
```

Tests sit next to the code (`#[cfg(test)]` modules, using an in-memory database from `db::open_in_memory()`).

`desktop/` and the frontend folder names are not from LokiSharp (his repositories have no equivalent); they are EnvForIO's own.

### How a request flows

Example: ticking a task as done.

1. The UI calls `completeTask(id)` in the frontend `api/tasks.ts`
2. That calls the generated `lib/bindings.ts`; the types come from Rust, so a mismatch fails to compile
3. Rust `api/tasks.rs` receives the call and hands it to `service/tasks/mutation.rs`
4. `mutation.rs` marks the task done, records the actual time, then calls `domain/safety_line.rs` to recompute
5. The result is written to SQLite

### Rules

- **Define interfaces once.** Request and response shapes live in Rust `api/`; TS types are generated, like the shared schema in HoPGoldy's projects.
- **Do not skip layers.** `api` only handles requests and never writes SQL; SQL appears only in `service`; `domain` only computes and never touches the database; `providers` are called only from `service`.
- **The frontend only displays.** All business computation is in Rust, including the safety line, so the main window and every small window always show the same numbers.
- **Only Rust touches the database**, with `rusqlite`, not `tauri-plugin-sql`. SQLite is the single source of truth; the frontend stores no business data.
- **Schema changes only through new migration files**; never edit existing ones.
- **Remote monitoring details stay inside their provider.** SSH and WSL specifics live only in their implementation files; the UI sees one shared data shape.
- **Strict types.** TS strict mode, no `any`; Rust passes clippy.
- **Same name for a resource in every layer.** To change "tasks", look for the `tasks` / `task` files in each layer.
- **Only one `index.html`**, shared by every window.
- **No separate Rust crates or npm packages.** Naming follows `workerd-manager`, but it splits each layer into its own crate; EnvForIO uses folders until compile times make splitting worthwhile.

## Development environment

- **No Rust, gcc, MSVC or any other compiler toolchain on Windows.** Everything lives in WSL (Ubuntu 24.04).
- **Code lives in the WSL filesystem**: `~/EnvForIO`, reachable from Windows at `\\wsl.localhost\Ubuntu-24.04\home\<you>\EnvForIO`. Not on a Windows drive, because WSL access to Windows drives is slow and hurts builds, installs and hot reload.
- In WSL: Node with npm, Rust through rustup (Tauri needs rustc 1.90 or later), build-essential, curl, wget, file, libssl-dev, llvm, pkg-config, git. WSLg and running Windows programs from WSL must both work.
- Also needed in WSL:
  - Tauri Linux dependencies: `libwebkit2gtk-4.1-dev` (2.52.6), `libxdo-dev`, `libayatana-appindicator3-dev`, `librsvg2-dev`
  - Cross-compiling for Windows: `nsis`, `lld`, `clang`, Rust target `x86_64-pc-windows-msvc`, `cargo-xwin` 0.23.1
  - The Tauri CLI is installed per project with npm, not globally
- `clang-cl` is not required: the cross-compile, including SQLite's C code, works through `cargo-xwin` without it. If a dependency with C code errors, install `clang-tools` or add a `clang-cl` link to `clang`.
- rustup in WSL comes from snap and has no `~/.cargo/env`, so the npm scripts do not source it.
- `cargo-xwin` lives in `~/.cargo/bin`, which is not on PATH; link it into `~/.local/bin`.
- Nothing to install on Windows; WebView2 ships with Windows 11.
- `sudo` in WSL needs a password, so system packages are installed by hand.
- How Windows builds are produced:
  - Day to day: cross-compile an exe in WSL with `cargo-xwin` and run it on Windows. Tauri marks this experimental, and it only produces NSIS installers.
  - Releases: the Windows runner on GitHub Actions. macOS builds will go the same way later.
- Windows window behaviours (transparency, linked windows, edge triggers) cannot be tested in a WSL Linux window, so the cross-compiled exe is the main way to verify them.

## Safety line algorithm

The rules the implementation follows (written from scratch for EnvForIO):

1. **Only work days count.** A day with available time set to 0 is a rest day and gets no share. Someone who never set it has every day as a work day.
2. **Work back from the plan date.** Plan date = deadline − buffer days. Once today is past the plan date, the target falls back to the real deadline.
3. **A project's daily need** = remaining hours ÷ work days from today (or the start date, if the project has not started) to the target. Remaining hours = sum of task estimates − hours done. For an overdue project, everything left is due today.
4. **Level across projects (on by default).** Process projects from earliest end date; cut remaining work into 15-minute chunks and place each on the day with the lightest total load that is still under that day's available time, within the project's own start and end. Only when every day is full does a chunk go to the relatively least crowded day, allowing overflow.
5. **Earliest deadline first (off by default).** When on, the earliest project uses only the first 70% of its window, the second earliest the first 85%.
6. **Today's line is frozen in the morning.** The first open each day records how much each project needs today; finishing work does not lower the line; only changing the plan recomputes it. The next day compares it with what was actually done.
7. **What counts as done.** Only tasks placed in a project and given an estimate count.
