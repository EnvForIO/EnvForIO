# Rust Architecture

Module layout and rules for the Tauri backend in `src-tauri/src/`.

## Modules

```
src-tauri/src/
├── main.rs          # Entry point (calls lib::run())
├── lib.rs           # Plugins, setup, window close and exit handling
├── bindings.rs      # tauri-specta command registration
├── config.rs        # AppState: database connection + undo stack
├── errors.rs        # AppError / AppResult, the one command error type
├── api/             # Tauri commands, one file per resource (thin)
├── service/         # Business logic, one folder per resource; the only layer that writes SQL
├── entity/          # Row types per table and how to read them
├── domain/          # Pure computation: no database, no Tauri
├── db/              # Opening SQLite and running migrations
├── desktop/         # Tray, Todo Duo windows, monitor thread, background refresh
├── providers/       # Swappable data sources (machine monitor)
├── commands/        # Older commands: preferences, quick_pane, recovery, notifications
└── types.rs         # Preferences types, quick-pane shortcut constant
```

Requests flow `api` → `service` → `entity`/`db`, with `domain` called for rules that need no I/O.

## Adding a Command

1. **Logic in `service/<resource>/`.** Take a `&Connection` (or `&mut Connection` for transactions), validate with `service::validate`, return `AppResult<T>`. Real example: `service::ideas::mutation::create`.
2. **Thin command in `api/<resource>.rs`:**

   ```rust
   #[tauri::command]
   #[specta::specta]
   pub fn create_idea(state: State<'_, AppState>, title: String) -> AppResult<Idea> {
       mutation::create(&mut state.db(), &title)
   }
   ```

   A new file needs `pub mod <name>;` in `api/mod.rs`.

3. **Register it** in `collect_commands![...]` in `bindings.rs`.
4. **Regenerate bindings:** `npm run rust:bindings`.

See [tauri-commands.md](./tauri-commands.md) for the TypeScript side.

## Types

- Row types live in `entity/<table>.rs`. Request and filter types live next to the service that uses them (e.g. `service::ideas::query::IdeaFilter`, `service::ideas::mutation::IdeaUpdate`).
- Anything crossing to TypeScript needs `#[derive(Type)]` (specta) plus `Serialize`/`Deserialize`. Most use `#[serde(rename_all = "camelCase")]`.

## Errors

Commands in `api/` return `AppResult<T>` (`Result<T, AppError>`, `errors.rs`). `AppError` is tagged with `type`:

| Variant                 | Use                                    |
| ----------------------- | -------------------------------------- |
| `NotFound { what, id }` | `AppError::not_found("idea", id)`      |
| `Invalid { message }`   | `AppError::invalid(..)`, bad input     |
| `Network { message }`   | `AppError::network(..)`, failed lookup |
| `Database { message }`  | From `rusqlite::Error` via `?`         |

Shared input checks are in `service/validate.rs` (`clean_name`, `check_date`, `estimate_minutes`). The older commands in `commands/` still return `Result<T, String>`. See [error-handling.md](./error-handling.md).

## Platform Code

Use `#[cfg(desktop)]`, `#[cfg(target_os = "windows")]` etc. The `desktop` module is compiled only with `#[cfg(desktop)]`. macOS branches (`tauri-nspanel`, dock reopen) exist in `lib.rs` and `commands/quick_pane.rs` but are not built or tested. See [cross-platform.md](./cross-platform.md).

## Plugins

Registered in `lib.rs`. The single-instance plugin must be registered first. See [tauri-plugins.md](./tauri-plugins.md).

## Conventions

| Pattern           | Rule                                                             |
| ----------------- | ---------------------------------------------------------------- |
| Command naming    | `snake_case` (`load_preferences`)                                |
| Error returns     | `AppResult<T>` for every new command                             |
| SQL               | Bound parameters (`params![..]`), never `format!`                |
| Logging           | `log::info!`, `log::warn!`, ... (see [logging.md](./logging.md)) |
| String formatting | `format!("{variable}")`, not `format!("{}", variable)`           |

## New Resource or Table

- **New resource:** add `api/<name>.rs` and `service/<name>/`.
- **New table:** add a numbered migration in `src-tauri/migrations/`, list it in `db/mod.rs`, and add `entity/<name>.rs`. See [data-persistence.md](./data-persistence.md).
