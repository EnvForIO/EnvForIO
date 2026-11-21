# Error Handling

Patterns for consistent error handling across Rust and TypeScript.

## Error Propagation Flow

```
Rust Command (Result<T, E>) → tauri-specta → TypeScript discriminated union → TanStack Query/UI
```

Rust `Result<T, E>` types become TypeScript discriminated unions:

```typescript
type Result<T, E> = { status: 'ok'; data: T } | { status: 'error'; error: E }
```

## Rust Error Types

### AppError (all app commands)

Every command in `src-tauri/src/api/` returns `AppResult<T>`, which is `Result<T, AppError>` from `src-tauri/src/errors.rs`:

```rust
#[derive(Debug, Clone, Serialize, Type)]
#[serde(tag = "type")]  // Creates TypeScript discriminated union
pub enum AppError {
    NotFound { what: String, id: i64 },
    Invalid { message: String },
    Network { message: String },
    Database { message: String },
}
```

- `rusqlite::Error` converts into `AppError::Database` with `?` (and is logged).
- Build the others with `AppError::invalid(..)`, `AppError::not_found("task", id)`, `AppError::network(..)`.
- `Display` gives a short English message for logs.

Don't add a new error enum per feature; add a variant here only if the UI needs to react to a new kind of failure.

TypeScript receives (in `src/lib/bindings.ts`):

```typescript
type AppError =
  | { type: 'NotFound'; what: string; id: number }
  | { type: 'Invalid'; message: string }
  | { type: 'Network'; message: string }
  | { type: 'Database'; message: string }
```

### Template Commands

The commands in `src-tauri/src/commands/` (preferences, quick pane, recovery, notifications) come from the template and still return `Result<T, String>`.

## TypeScript Error Handling

### Pattern 1: Explicit Handling (Event Handlers)

```typescript
// ✅ GOOD: Handle errors inline with user feedback
const handleSave = async () => {
  const result = await commands.saveData(data)
  if (result.status === 'error') {
    toast.error('Save failed', { description: result.error })
    return
  }
  toast.success('Saved!')
}
```

### Pattern 2: unwrapResult (TanStack Query)

```typescript
// ✅ GOOD: Let TanStack Query handle errors
const { data, error } = useQuery({
  queryKey: ['data'],
  queryFn: async () => unwrapResult(await commands.loadData()),
})
```

### Pattern 3: Graceful Degradation

```typescript
// ✅ GOOD: Fall back to defaults on error
const { data } = useQuery({
  queryKey: ['preferences'],
  queryFn: async () => {
    const result = await commands.loadPreferences()
    if (result.status === 'error') {
      logger.warn('Failed to load preferences, using defaults')
      return defaultPreferences
    }
    return result.data
  },
})
```

## User-Facing vs Technical Errors

### Rust: Log Technical Details, Return User Messages

```rust
// ✅ GOOD: Log technical details, return user-friendly message
pub async fn load_file(path: &str) -> Result<String, String> {
    log::debug!("Loading file: {path}");

    std::fs::read_to_string(path).map_err(|e| {
        log::error!("Failed to read file {path}: {e}");  // Technical log
        format!("Could not read file")                   // User message
    })
}
```

### TypeScript: Toast for Users, Logger for Debugging

```typescript
// ✅ GOOD: Separate user feedback from technical logging
const result = await commands.saveData(data)
if (result.status === 'error') {
  logger.error('Save failed', { error: result.error, data }) // Technical
  toast.error('Failed to save') // User-facing
}
```

## Retry Configuration

Configure TanStack Query retry behavior based on error type:

```typescript
// ✅ GOOD: Smart retry logic
const { data } = useQuery({
  queryKey: ['data'],
  queryFn: loadData,
  retry: (failureCount, error) => {
    // Don't retry client errors (4xx)
    if (error.message.includes('API error: 4')) return false
    // Retry network/server errors up to 3 times
    return failureCount < 3
  },
})
```

Default retry settings in `query-client.ts`:

| Query Type | Retries | Rationale                            |
| ---------- | ------- | ------------------------------------ |
| Queries    | 1       | Transient failures may recover       |
| Mutations  | 1       | Avoid duplicate writes on slow saves |

## Where Errors Surface

There is no global error toast: `src/lib/query-client.ts` only sets retry and cache defaults. The hooks in `src/api/` call `unwrapResult`, so a failed command becomes a query or mutation error, and the component that triggered it decides what to show (usually a toast in the mutation's `onError`).

## React Error Boundaries

Error boundaries catch render errors, not async errors:

| Caught by Error Boundary    | NOT Caught                          |
| --------------------------- | ----------------------------------- |
| Errors during render        | Errors in event handlers            |
| Errors in lifecycle methods | Async code (promises)               |
| Errors in constructors      | Errors in the error boundary itself |

For async Tauri command errors, use explicit handling or `unwrapResult` with TanStack Query.

## Rollback Pattern

For multi-step operations, rollback on failure:

```typescript
// ✅ GOOD: Rollback on failure
const handleChange = async (newValue: string) => {
  const oldValue = currentValue

  // Step 1: Update backend
  const result = await commands.updateValue(newValue)
  if (result.status === 'error') {
    toast.error('Update failed')
    return
  }

  // Step 2: Persist
  try {
    await savePreferences.mutateAsync({ ...prefs, value: newValue })
  } catch {
    // Rollback step 1
    await commands.updateValue(oldValue)
    toast.error('Save failed, changes reverted')
  }
}
```

## Quick Reference

| Scenario               | Rust Error Type | TypeScript Pattern   | User Feedback    |
| ---------------------- | --------------- | -------------------- | ---------------- |
| Event handler          | `AppError`      | if/else + toast      | Toast on error   |
| Specific failure kinds | `AppError`      | Match on `.type`     | Context-specific |
| Data fetching          | `AppError`      | `unwrapResult`       | Query error UI   |
| Optional feature       | Either          | Graceful degradation | Silent fallback  |
| Critical operation     | `AppError`      | Explicit + rollback  | Toast + recovery |

See also: [tauri-commands.md](./tauri-commands.md) for Result type patterns, [logging.md](./logging.md) for logging best practices.
