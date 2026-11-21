# Data Persistence

Patterns for saving and loading data to disk.

## Choosing a Storage Method

| Need               | Solution            | When to Use                                                      |
| ------------------ | ------------------- | ---------------------------------------------------------------- |
| App data           | SQLite (`envio.db`) | Tasks, projects, plans, ideas, papers, machines, feeds, settings |
| UI preferences     | Preferences System  | Theme, language, quick-pane shortcut                             |
| Emergency recovery | Recovery System     | Crash recovery, backup before risky operations                   |
| External API data  | Fetched in Rust     | See [external-apis.md](./external-apis.md)                       |

SQLite is the main store. All data goes through Rust; the frontend uses TanStack Query (hooks in `src/api/`) for loading states and cache invalidation.

## File Locations

The app data directory is named after the app identifier `io.github.envforio`:

```
%APPDATA%\io.github.envforio\       (Windows)
├── envio.db                        # SQLite database (plus envio.db-wal / -shm)
├── preferences.json                # UI preferences
└── recovery/                       # Emergency data
    └── *.json
```

The database file keeps its old name `envio.db` so data from before the rename to EnvForIO still opens.

## Atomic Write Pattern (Critical)

All file writes use atomic operations to prevent corruption:

```rust
// Write to temp file first, then rename (atomic)
let temp_path = file_path.with_extension("tmp");
std::fs::write(&temp_path, content)?;
std::fs::rename(&temp_path, &file_path)?;
```

**Why**: If the app crashes during write, you either have the old file or the new file - never a corrupted partial file.

## Preferences System

### Rust Side

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct AppPreferences {
    pub theme: String,
    // Add new preferences here
}

impl Default for AppPreferences {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
        }
    }
}
```

### React Side

```typescript
// src/services/preferences.ts
export function usePreferences() {
  return useQuery({
    queryKey: ['preferences'],
    queryFn: async () => unwrapResult(await commands.loadPreferences()),
  })
}

export function useUpdatePreferences() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (preferences: AppPreferences) =>
      commands.savePreferences(preferences),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['preferences'] })
    },
  })
}
```

## Emergency Recovery System

For saving data before crashes or risky operations:

```typescript
// Save emergency data
await commands.saveEmergencyData({
  filename: 'unsaved-work',
  data: { content: userContent, timestamp: Date.now() },
})

// Load on startup
const recoveryData = await commands.loadEmergencyData({
  filename: 'unsaved-work',
})
if (recoveryData.status === 'ok' && recoveryData.data) {
  // Show recovery dialog
}
```

Recovery files are automatically cleaned up after 7 days via `cleanupOldRecoveryFiles`.

## Adding New Persistent Data

### 1. Define Rust struct

```rust
#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MyData {
    pub field: String,
}

impl Default for MyData {
    fn default() -> Self {
        Self { field: "default".to_string() }
    }
}
```

### 2. Add Tauri commands

Follow the pattern in `src-tauri/src/commands/preferences.rs`:

- `load_*` command with Default fallback
- `save_*` command with atomic write

### 3. Register commands

Add to `src-tauri/src/bindings.rs` and regenerate bindings:

```bash
npm run rust:bindings
```

### 4. Create React hooks

```typescript
export function useMyData() {
  return useQuery({
    queryKey: ['my-data'],
    queryFn: async () => unwrapResult(await commands.loadMyData()),
  })
}
```

## Security

### Filename Validation

Always validate filenames to prevent path traversal:

```rust
if filename.contains("..") || filename.contains("/") || filename.contains("\\") {
    return Err("Invalid filename".to_string());
}
```

### Directory Permissions

Use Tauri's `app_data_dir()` for safe storage locations - never write to arbitrary paths.

## SQLite Database

App data lives in one SQLite file, `envio.db`, opened with `rusqlite` (bundled SQLite).

```
React Component → TanStack Query (src/api/) → Tauri Command (src-tauri/src/api/) → service → SQLite
```

### Opening

`AppState::open` (`src-tauri/src/config.rs`) runs in `setup()` before any window can call a command. It creates the app data directory, calls `db::open` (`src-tauri/src/db/mod.rs`), which turns on WAL and foreign keys and runs pending migrations, then puts the connection behind a `Mutex` in `AppState`, managed as Tauri state. EnvForIO is single-user, so one connection is enough.

Commands reach it through `state.db()`:

```rust
#[tauri::command]
#[specta::specta]
pub fn list_ideas(state: State<'_, AppState>, filter: IdeaFilter) -> AppResult<Vec<Idea>> {
    query::list(&state.db(), &filter)
}
```

SQL lives only in `src-tauri/src/service/`; row types and their readers live in `src-tauri/src/entity/`. `rusqlite::Error` converts into `AppError::Database` with `?`.

### Migrations

- Migrations are numbered files in `src-tauri/migrations/` (`0001_initial_schema.sql`, ...), compiled in with `include_str!` and listed in order in the `MIGRATIONS` array in `src-tauri/src/db/mod.rs`.
- `PRAGMA user_version` records how many have run; each pending one runs once, in its own transaction.
- To change the schema, add the next numbered file and append it to `MIGRATIONS`. Never edit a migration that has shipped.

### Tests

`db::open_in_memory()` (test-only) returns an in-memory database with the full schema, for service tests.
