# External APIs

Patterns for calling external HTTP APIs from Tauri applications.

EnvForIO makes a few unauthenticated web lookups from Rust: paper metadata (Crossref, arXiv), conference deadlines (ccfddl), subscribed calendars (ICS) and RSS feeds. The fetch code is in `src-tauri/src/service/*/fetch.rs`.

## Rust vs Frontend: When to Use Which

**Default recommendation: Use Rust backend (reqwest)**

| Approach         | Pros                                              | Cons                            |
| ---------------- | ------------------------------------------------- | ------------------------------- |
| Rust (reqwest)   | CORS bypass, results saved to SQLite, type safety | More code per endpoint          |
| Frontend (fetch) | Less boilerplate, familiar API                    | CORS restrictions, exposed keys |

All of EnvForIO's lookups go through Rust.

## Setup

`reqwest` is already a dependency in `src-tauri/Cargo.toml`:

```toml
reqwest = { version = "0.13", default-features = false, features = ["native-tls", "json", "system-proxy"] }
```

`native-tls` uses SChannel on Windows, so no C crypto library is needed. `system-proxy` picks up the OS proxy settings.

### Shared Client

Use `src-tauri/src/service/net.rs` instead of building a client yourself:

- `net::client()` returns a `reqwest::Client` with a generic `EnvForIO/<version>` user agent (no user details) and a 40-second timeout.
- `net::network` maps a `reqwest::Error` to `AppError::Network` and logs it.

## Architecture Pattern

Follow the same pattern as local data: Tauri commands wrap API calls, TanStack Query provides caching.

```
React Component → TanStack Query → Tauri Command (reqwest) → External API
```

### Rust Fetch

```rust
// src-tauri/src/service/conferences/fetch.rs
use crate::errors::AppResult;
use crate::service::net::{client, network};

pub async fn download() -> AppResult<String> {
    client()?
        .get(URL)
        .send()
        .await
        .map_err(network)?
        .error_for_status()
        .map_err(network)?
        .text()
        .await
        .map_err(network)
}
```

The command in `src-tauri/src/api/` is `async` and returns `AppResult<T>`. Don't hold `state.db()` across an `.await`; read what you need, fetch, then lock again to write (see `add_paper` in `src-tauri/src/api/papers.rs`).

### React Hooks

```typescript
// src/api/users.ts
export const userQueryKeys = {
  all: ['users'] as const,
  user: (id: number) => [...userQueryKeys.all, id] as const,
}

export function useUser(userId: number) {
  return useQuery({
    queryKey: userQueryKeys.user(userId),
    queryFn: async () => unwrapResult(await commands.fetchUser(userId)),
    staleTime: 1000 * 60 * 5, // Cache for 5 minutes
  })
}

export function useUpdateUser() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      userId,
      data,
    }: {
      userId: number
      data: Partial<User>
    }) => {
      return unwrapResult(await commands.updateUser(userId, data))
    },
    onSuccess: (_, { userId }) => {
      queryClient.invalidateQueries({ queryKey: userQueryKeys.user(userId) })
    },
  })
}
```

## Error Handling

Network failures come back as `AppError::Network { message }`; match on `error.type === 'Network'` in the UI to show an "offline or server error" message. See [error-handling.md](./error-handling.md).

## Offline Handling

Fetched data is saved to SQLite, so the app keeps working offline with what it last downloaded. The general shape:

```rust
#[tauri::command]
#[specta::specta]
pub async fn fetch_with_cache(app: tauri::AppHandle, id: u32) -> AppResult<Data> {
    // Try network first
    match fetch_from_api(id).await {
        Ok(data) => {
            cache_to_db(&app, &data)?;  // Cache for offline
            Ok(data)
        }
        Err(_) => {
            // Fallback to cache on network error
            load_from_cache(&app, id)
        }
    }
}
```

See [data-persistence.md](./data-persistence.md) for the SQLite setup.

## Quick Reference

| Task            | Pattern                                    |
| --------------- | ------------------------------------------ |
| Basic API call  | `net::client()` in a `service/*/fetch.rs`  |
| Caching         | TanStack Query (frontend) and SQLite       |
| Type safety     | tauri-specta (same as local commands)      |
| Error handling  | `AppError::Network` via `net::network`     |
| Offline support | Save to SQLite, show what was last fetched |
