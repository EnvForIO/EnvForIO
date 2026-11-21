# Rust Architecture

Module organization and patterns for the Tauri backend.

## Module Structure

```
src-tauri/src/
├── main.rs          # Entry point (just calls lib::run())
├── lib.rs           # App setup, plugins, startup logic
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
├── commands/        # Template commands not yet moved to api/
│                    # (preferences, quick_pane, recovery, notifications)
├── types.rs         # Preferences types, quick-pane shortcut constant
└── utils/
    └── platform.rs  # Platform-specific helpers
```

Requests flow `api` → `service` → `entity`/`db`, with `domain` called for rules that need no I/O.

## Adding New Commands

### 1. Put the logic in `service/`

```rust
// src-tauri/src/service/widgets/mod.rs
use rusqlite::Connection;
use crate::errors::AppResult;

pub fn rename(conn: &Connection, id: i64, name: &str) -> AppResult<Widget> {
    let name = crate::service::validate::clean_name(name)?;
    // SQL with bound parameters, errors convert into AppError via `?`
    ...
}
```

### 2. Add a thin command in `api/`

```rust
// src-tauri/src/api/widgets.rs
use tauri::State;
use crate::config::AppState;
use crate::errors::AppResult;

#[tauri::command]
#[specta::specta]
pub fn rename_widget(state: State<'_, AppState>, id: i64, name: String) -> AppResult<Widget> {
    crate::service::widgets::rename(&state.db(), id, &name)
}
```

Declare the module in `api/mod.rs` (`pub mod widgets;`).

### 3. Register in bindings.rs

```rust
use crate::api::{widgets, /* ... */};

Builder::<tauri::Wry>::new().commands(collect_commands![
    widgets::rename_widget,
    // ... other commands
])
```

### 4. Regenerate TypeScript bindings

```bash
npm run rust:bindings
```

## Type Patterns

### Row and Request Types

Row types live in `entity/<table>.rs`; request/filter types live next to the service that uses them (e.g. `service::ideas::query::IdeaFilter`):

```rust
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MyData {
    pub field: String,
}
```

**Note:** `#[derive(Type)]` from specta is required for TypeScript generation.

### Error Types

Commands in `api/` return `AppResult<T>` (`Result<T, AppError>`, from `errors.rs`). `AppError` has four variants: `NotFound { what, id }`, `Invalid { message }`, `Network { message }`, `Database { message }`. `rusqlite::Error` converts into `Database` with `?`. Use the constructors `AppError::invalid(..)`, `AppError::not_found(..)`, `AppError::network(..)`.

The `#[serde(tag = "type")]` makes errors easy to match in TypeScript:

```typescript
if (error.type === 'Invalid') {
  console.log(error.message)
}
```

The template commands in `commands/` still return `Result<T, String>`.

### Validation Functions

Shared input checks live in `service/validate.rs` (`clean_name`, `check_date`, `estimate_minutes`) and return `AppError::Invalid`.

## Platform-Specific Code

Use conditional compilation for platform-specific behavior:

```rust
#[cfg(target_os = "macos")]
fn macos_specific() { /* ... */ }

#[cfg(desktop)]
fn desktop_only() { /* ... */ }

#[cfg(not(target_os = "linux"))]
fn non_linux() { /* ... */ }
```

Platform utilities live in `utils/platform.rs`.

## Plugin Registration (lib.rs)

Plugins are registered in `lib.rs` during app setup:

```rust
// Desktop-only plugins
#[cfg(desktop)]
{
    app_builder = app_builder.plugin(tauri_plugin_window_state::Builder::new().build());
}

// All platforms
app_builder = app_builder
    .plugin(tauri_plugin_fs::init())
    .plugin(tauri_plugin_dialog::init())
```

**Order matters:** Single-instance plugin must be registered first.

## Conventions

| Pattern           | Example                                                  |
| ----------------- | -------------------------------------------------------- |
| Command naming    | `snake_case` (`load_preferences`, not `loadPreferences`) |
| Error returns     | `AppResult<T>` (`errors.rs`) for every new command       |
| Logging           | Use `log::info!`, `log::debug!`, etc.                    |
| String formatting | `format!("{variable}")` not `format!("{}", variable)`    |
| App handle        | Pass `AppHandle` not `Window` when possible              |

## Expanding This Architecture

When adding new features:

1. **New resource?** Add `api/<name>.rs` and a `service/<name>/` folder
2. **New table?** Add a numbered migration in `src-tauri/migrations/`, list it in `db/mod.rs`, and add `entity/<name>.rs`
3. **Platform-specific utils?** Add to `utils/platform.rs`
4. **New plugin?** Register in `lib.rs` setup
