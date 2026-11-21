# Data Persistence

## What Is Stored Where

| Data                                                                                 | Store              | Code                                                                   |
| ------------------------------------------------------------------------------------ | ------------------ | ---------------------------------------------------------------------- |
| Tasks, projects, plans, ideas, papers, machines, calendars, feeds, planning settings | SQLite `envio.db`  | `src-tauri/src/service/`, `entity/`, `db/`                             |
| UI preferences: theme, language, quick-pane shortcut, Todo Duo style, update check   | `preferences.json` | `src-tauri/src/commands/preferences.rs`, `src/services/preferences.ts` |
| Crash state from the error boundary                                                  | `recovery/*.json`  | `src-tauri/src/commands/recovery.rs`, `src/lib/recovery.ts`            |

All of it is in the app data folder, `%APPDATA%\io.github.envforio\` on Windows. The database keeps its old name `envio.db` so data from before the rename to EnvForIO still opens.

## SQLite

```
Component → hook in src/api/ → command in src-tauri/src/api/ → service → SQLite
```

- `AppState::open` (`src-tauri/src/config.rs`) runs in `setup()` before any window can call a command. It calls `db::open` (`src-tauri/src/db/mod.rs`), which turns on WAL and foreign keys and runs pending migrations, and keeps the one connection behind a `Mutex`.
- Commands reach it with `state.db()`. SQL lives only in `src-tauri/src/service/`; row types and their readers are in `src-tauri/src/entity/`.
- Changes to tasks that should be undoable go through `AppState::changing` / `AppState::creating`, which record a snapshot on the undo stack first.

### Migrations

- Numbered files in `src-tauri/migrations/` (`0001_initial_schema.sql`, ...), compiled in with `include_str!` and listed in order in `MIGRATIONS` in `db/mod.rs`.
- `PRAGMA user_version` records how many have run; each pending one runs once, in its own transaction.
- To change the schema, add the next numbered file and append it to `MIGRATIONS`. Never edit a migration that has shipped.

### Tests

`db::open_in_memory()` (test-only) gives an in-memory database with the full schema, for service tests.

## Preferences

`AppPreferences` is in `src-tauri/src/types.rs`. `load_preferences` falls back to defaults; `save_preferences` writes to a temp file and renames it. On the frontend, `usePreferences()` and `useSavePreferences()` in `src/services/preferences.ts`; saving emits `preferences-changed`, which `usePreferencesSync()` in the Todo Duo windows listens for.

To add a preference: add the field (with a default) to `AppPreferences` and its `Default`, run `npm run rust:bindings`, then add it to the fallback object in `usePreferences()`.

## Recovery Files

`src/components/ErrorBoundary.tsx` calls `saveCrashState()`, which writes `recovery/crash-<timestamp>.json` through `save_emergency_data`. Filenames are checked by `validate_filename` (`types.rs`) and data is capped at 10 MB. `App.tsx` calls `cleanupOldFiles()` at startup, which removes files older than 7 days.
