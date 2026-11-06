# Phase 1: main window and Todo Duo parity

Started 2026-11-19. Checklist and scope are in the product plan (deleted 2026-11-20 when finished; see git history); this note records how the phase is built.

## Step 1: adapt the template

- Windows bundle target is NSIS (`src-tauri/tauri.windows.conf.json`), because `cargo-xwin` cannot build MSI.
- The auto-updater is removed: Rust plugin, npm package, capability, menu item, launch check and config. It needs a GitHub release feed and a signing key, which EnvIO does not have.
- One HTML entry: `quick-pane.html` is gone. Every window loads `index.html?window=<name>` and `src/main.tsx` mounts the matching view from `src/windows/`. The quick pane stays as the future quick-capture window.
- `App.test.tsx` mocks language detection and the native menu, which need the Tauri runtime.

## Data model

Designed now for Phase 2's needs (projects, deadlines, estimates, scheduled dates) so Phase 1 tables do not have to be reworked. Only the tables Phase 1 uses are created in Phase 1; the rest come as later migrations.

Conventions:

- `id INTEGER PRIMARY KEY` everywhere.
- Calendar dates are `TEXT` `YYYY-MM-DD` in local time. Timestamps are `TEXT` RFC 3339 in UTC.
- Durations are whole minutes (`INTEGER`).
- Booleans are `INTEGER` 0 / 1.
- Every table that the user edits has `created_at` and `updated_at`.
- "Which day does this belong to" uses the day rollover time (default 07:00), computed in Rust, never stored twice.

### Phase 1 tables (migration `0001_initial_schema.sql`)

`tasks`: every todo, whether or not it belongs to a project.

| Column                     | Type    | Notes                                                            |
| -------------------------- | ------- | ---------------------------------------------------------------- |
| `id`                       | INTEGER |                                                                  |
| `title`                    | TEXT    | not empty                                                        |
| `note`                     | TEXT    | details pane notes                                               |
| `is_important`             | INTEGER | Important list, Todo Duo flag                                    |
| `is_pinned`                | INTEGER | right-click "pin"                                                |
| `my_day_date`              | TEXT    | set when added to My Day; My Day shows tasks whose date is today |
| `due_date`                 | TEXT    | Planned list, Todo Duo date tag; the deadline in Phase 2         |
| `done_at`                  | TEXT    | NULL = open; feeds the heatmap                                   |
| `sort_order`               | REAL    | manual order; REAL so an item can be placed between two others   |
| `project_id`               | INTEGER | NULL until Phase 2; FK `projects.id`                             |
| `module_id`                | INTEGER | Phase 2                                                          |
| `estimate_minutes`         | INTEGER | Phase 2 safety line                                              |
| `actual_minutes`           | INTEGER | Phase 2 timer                                                    |
| `scheduled_date`           | TEXT    | Phase 2 calendar drag scheduling                                 |
| `start_time`, `end_time`   | TEXT    | `HH:MM`, from quick capture such as `14:00-15:00 group meeting`  |
| `split_from_id`            | INTEGER | Phase 2 partial completion: the task this one was split from     |
| `created_at`, `updated_at` | TEXT    |                                                                  |

`task_steps`: Microsoft To Do style sub-steps in the details pane.

| Column          | Type    | Notes              |
| --------------- | ------- | ------------------ |
| `id`, `task_id` | INTEGER | FK, cascade delete |
| `title`         | TEXT    |                    |
| `is_done`       | INTEGER |                    |
| `sort_order`    | REAL    |                    |

### Later tables (designed, not created yet)

| Table                                                             | Phase | Purpose                                                             |
| ----------------------------------------------------------------- | ----- | ------------------------------------------------------------------- |
| `projects`                                                        | 2     | name, template, start date, deadline, buffer days, colour, archived |
| `modules`                                                         | 2     | sections inside a project                                           |
| `weekday_capacity`                                                | 2     | minutes available per weekday (0 = rest day)                        |
| `day_overrides`                                                   | 2     | one-off capacity for a date                                         |
| `daily_lines`                                                     | 2     | the safety line frozen each morning, per date and project           |
| `day_notes`                                                       | 2     | "a line for today" and calendar notes                               |
| `time_entries`                                                    | 2     | timer sessions                                                      |
| `ideas`, `idea_steps`, `idea_todos`, `idea_problems`, `idea_logs` | 2.5   | Seedbank                                                            |
| `papers`, `idea_papers`                                           | 2.5   | paper library and links                                             |

`tasks.project_id` and `tasks.module_id` are created in 0001 without foreign keys; the constraint is added when `projects` exists.

## Step 2: Rust backend layers and SQLite

- New layers in `src-tauri/src/`: `errors.rs`, `config.rs` (`AppState` with the connection), `db/` (open + migrations by `PRAGMA user_version`), `entity/task.rs`, `domain/day.rs` (07:00 rollover), `service/tasks/{query,mutation}.rs`, `api/tasks.rs`.
- The template's own commands stay in `commands/` for now.
- Storage is `rusqlite` with the `bundled` feature. It cross-compiles to Windows with `cargo-xwin` without installing `clang-cl`.
- The database is `%APPDATA%\io.github.envforio\envio.db` on Windows.
- TypeScript bindings export `i64` as `number` (ids and counts stay far below 2^53).

## Step 3: the main window lists

- `src/api/tasks.ts` is the only frontend file that calls task commands (TanStack Query hooks; every write refetches all lists).
- `src/pages/tasks/`: list page, task row, details pane, steps. `src/components/layout/SidebarNav.tsx`: the four lists with open counts.
- The template's `components/layout/` is kept instead of a new `src/layouts/` folder, to avoid moving template files for no gain.
- Known gap: the details pane finds the task in the current list, so un-starring a task in Important closes the pane.

## Step 4: tray, autostart, window position

- `src-tauri/src/desktop/tray.rs`: left click shows the window; the menu has "Show EnvIO" and "Quit EnvIO" (English constants in Rust, not i18n strings).
- Closing the main window hides it to the tray on every desktop platform (the template did this only on macOS). Quit from the tray.
- "Launch at login" lives in Preferences > General and uses `tauri-plugin-autostart`. The OS stores the setting. A login start passes `--autostart`, and EnvIO then starts hidden in the tray.
- Window position and size were already remembered by the template's `window-state` plugin; it saves before hiding.

## Step 5: Todo Duo widgets

- Windows `duo-capsule` and `duo-card` are built in `src-tauri/src/desktop/duo.rs`, hidden at start, toggled from the tray ("Show / Hide Todo Duo"). The window-state plugin remembers their position and visibility.
- Linked dragging: the card sits under the capsule. A Moved event on one window moves the other; it is ignored when the other window is already in place (1 px slack), which stops the loop. Alt+F4 hides both instead of closing one.
- A day's tasks are those in My Day that day or due that day. Today's card adds to My Day; other days add with that due date.
- Heatmap: week and month are calendar grids, year is 53 weeks (Monday first). Colour steps by done / total.
- Cross-window sync: writes emit `tasks-changed`, preference saves emit `preferences-changed`; every window refetches.
- Style (material, font, text size) lives in preferences as `duo_style` and is set in Preferences > Appearance. Acrylic and Mica use the Windows window effect; confirmed on Windows 11 together with dragging and transparency (2026-11-19).

Phase 1 is complete (2026-11-19).

## Later changes (2026-11-19, user feedback)

- Sidebars have fixed widths (left 240 px, right 320 px). The details pane is an overlay on the right edge: the window size and the lists underneath stay exactly as they are (the user showed BrunchTea as the reference). Titles and padding were tightened.
- Todo Duo is EnvIO's floating mode rather than a separate widget. Minimize is a normal minimize. A separate float button in the title bar (and the tray's "Mini mode") hides the main window and shows the sticky at the window's top-right corner; the capsule's expand button, the tray icon and "Show EnvIO" bring the window back. A pin button on the capsule keeps the sticky above other windows.
