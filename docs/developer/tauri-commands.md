# Tauri Commands (tauri-specta)

Type-safe Tauri command bindings using [tauri-specta](https://github.com/specta-rs/tauri-specta).

## Overview

This app uses tauri-specta to generate TypeScript bindings from Rust commands, providing:

- **Compile-time type checking** - TypeScript catches errors before runtime
- **Auto-generated types** - No manual sync between Rust and TypeScript
- **IDE autocomplete** - Full IntelliSense for command names, parameters, and return types
- **Safe refactoring** - Rename commands safely across the stack

## Usage

### Calling Commands

```typescript
import { commands, type AppPreferences } from '@/lib/tauri-bindings'

// Commands return Result types for error handling
const result = await commands.loadPreferences()

if (result.status === 'ok') {
  console.log(result.data.theme) // Type-safe access
} else {
  console.error(result.error) // Type-safe error
}
```

### Result Type Pattern

Commands that can fail return a `Result<T, E>` type:

```typescript
type Result<T, E> = { status: 'ok'; data: T } | { status: 'error'; error: E }
```

See [error-handling.md](./error-handling.md) for comprehensive error handling patterns including structured error types, retry logic, and user feedback.

Handle both cases:

```typescript
const result = await commands.savePreferences({ theme: 'dark' })

if (result.status === 'error') {
  toast.error('Failed to save', { description: result.error })
  return
}

// result.data is available here
toast.success('Saved!')
```

### unwrapResult Helper

For cases where you want errors to propagate (throw) rather than handle them inline, use the `unwrapResult` helper:

```typescript
import { commands, unwrapResult } from '@/lib/tauri-bindings'

// Throws on error, returns data on success
const preferences = unwrapResult(await commands.loadPreferences())
```

**When to use each pattern:**

| Pattern          | Use When                                                        |
| ---------------- | --------------------------------------------------------------- |
| `unwrapResult`   | TanStack Query functions, errors should propagate to a boundary |
| Manual `if/else` | Event handlers, need explicit error handling (toasts, UI state) |

**TanStack Query example** (preferred pattern for data fetching):

```typescript
import { useQuery } from '@tanstack/react-query'
import { commands, unwrapResult } from '@/lib/tauri-bindings'

const { data, error } = useQuery({
  queryKey: ['preferences'],
  queryFn: async () => unwrapResult(await commands.loadPreferences()),
})
// TanStack Query handles the thrown error automatically
```

**Event handler example** (explicit error handling):

```typescript
const handleSave = async () => {
  const result = await commands.savePreferences(preferences)
  if (result.status === 'error') {
    toast.error('Failed to save', { description: result.error })
    return
  }
  toast.success('Preferences saved!')
}
```

## Adding New Commands

### 1. Define the Rust command

Commands go in `src-tauri/src/api/<resource>.rs` and stay thin; the work happens in `src-tauri/src/service/`. See [rust-architecture.md](./rust-architecture.md).

```rust
// src-tauri/src/api/widgets.rs

#[tauri::command]
#[specta::specta]  // Add this attribute
pub fn my_new_command(state: State<'_, AppState>, arg: String) -> AppResult<MyType> {
    crate::service::widgets::do_it(&state.db(), &arg)
}
```

### 2. Add Type derive to structs

```rust
use specta::Type;

#[derive(Debug, Clone, Serialize, Deserialize, Type)]
pub struct MyType {
    pub field: String,
}
```

### 3. Register in bindings.rs

```rust
// src-tauri/src/bindings.rs

pub fn generate_bindings() -> Builder<tauri::Wry> {
    use crate::api::{widgets, /* ... */};

    Builder::<tauri::Wry>::new().commands(collect_commands![
        // ... existing commands
        widgets::my_new_command,  // Add here
    ])
}
```

### 4. Regenerate TypeScript bindings

```bash
npm run rust:bindings
```

This runs `cargo test export_bindings -- --ignored` which generates `src/lib/bindings.ts`.

### 5. Use in frontend

```typescript
import { commands, type MyType } from '@/lib/tauri-bindings'

const result = await commands.myNewCommand('arg')
```

### 6. Commit both files

Always commit:

- Rust changes (`src-tauri/src/api/*.rs`, `src-tauri/src/bindings.rs`)
- Generated TypeScript (`src/lib/bindings.ts`)

## File Structure

```
src-tauri/src/
├── api/                # Commands with #[specta::specta], one file per resource
├── commands/           # Template commands (preferences, quick pane, recovery, notifications)
└── bindings.rs         # Command registration + export test

src/lib/
├── bindings.ts         # Generated (DO NOT EDIT)
└── tauri-bindings.ts   # Re-exports with project conventions

src/api/                # TanStack Query hooks that call the commands
```

## Known Limitations

### serde_json::Value becomes JsonValue/unknown

Commands using `serde_json::Value` (like `saveEmergencyData`) have `JsonValue` typed parameters:

```typescript
type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | Partial<{ [key in string]: JsonValue }>
```

Cast when needed:

```typescript
await commands.saveEmergencyData(filename, data as JsonValue)
```

### Bindings generated at runtime

TypeScript bindings are generated when the app runs in debug mode, or via:

```bash
npm run rust:bindings
```

This must be run after changing Rust commands.

## Testing

Mock the commands in tests:

```typescript
// src/test/setup.ts
vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    loadPreferences: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { theme: 'system' } }),
    savePreferences: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
    // ... other commands
  },
}))
```

## Available Commands

The full list is the `collect_commands!` call in `src-tauri/src/bindings.rs`. The app's commands live in `src-tauri/src/api/*.rs` (one file per resource: tasks, projects, plans, ideas, papers, ...) and return `AppResult<T>`; the template commands in `src-tauri/src/commands/` return `Result<T, String>`. The generated `src/lib/bindings.ts` shows every command's TypeScript signature.

## Dependencies

```toml
# src-tauri/Cargo.toml
specta = { version = "=2.0.0-rc.22", features = ["derive", "serde_json"] }
tauri-specta = { version = "=2.0.0-rc.21", features = ["typescript"] }
specta-typescript = "=0.0.9"
```

Note: Using exact versions (`=`) during RC phase to prevent breaking changes.

## References

- [tauri-specta GitHub](https://github.com/specta-rs/tauri-specta)
- [Specta documentation](https://specta.dev/docs/tauri-specta/v2)
