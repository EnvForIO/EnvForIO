# Error Handling

How a failure in Rust reaches the user.

## Flow

```
Rust command → Result<T, AppError> → tauri-specta → { status: 'ok', data } | { status: 'error', error }
→ unwrapResult in src/api/ → query/mutation error → component shows a toast
```

## Rust

Every command in `src-tauri/src/api/` returns `AppResult<T>` (`Result<T, AppError>`, `src-tauri/src/errors.rs`). `AppError` is tagged with `type`:

```typescript
// generated in src/lib/bindings.ts
type AppError =
  | { type: 'NotFound'; what: string; id: number }
  | { type: 'Invalid'; message: string }
  | { type: 'Network'; message: string }
  | { type: 'Database'; message: string }
```

- `rusqlite::Error` converts into `Database` with `?` and is logged at error level.
- Build the others with `AppError::invalid(..)`, `AppError::not_found("task", id)`, `AppError::network(..)`.
- Don't add an error enum per feature. Add a variant only if the UI must react to a new kind of failure.

The older commands in `src-tauri/src/commands/` (preferences, quick pane, recovery, notifications) return `Result<T, String>`.

Log technical detail with `log::error!`/`log::warn!`; keep the returned message short and readable. See [logging.md](./logging.md).

## TypeScript

**Queries and mutations** (the usual case): the hooks in `src/api/` call `unwrapResult` (`src/lib/tauri-bindings.ts`), which throws the error so TanStack Query treats it as a failure. The component that triggered a write shows it, usually in `onError`:

```typescript
// src/pages/papers/PapersPage.tsx
onError: error => toast.error(errorText(error)),
```

`errorText` (`src/api/papers.ts`) turns an `AppError` or anything else into a string.

**Direct calls** outside TanStack Query check `result.status`:

```typescript
const result = await commands.savePreferences(prefs)
if (result.status === 'error') {
  toast.error(result.error)
}
```

There is no global error toast: `src/lib/query-client.ts` only sets retry (1 for queries and mutations) and cache defaults.

## Error Boundary

`src/components/ErrorBoundary.tsx` wraps the app in `src/App.tsx`. It catches render errors only, not errors in event handlers or promises.
