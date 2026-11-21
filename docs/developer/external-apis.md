# External APIs

EnvForIO makes a few unauthenticated web lookups, all from Rust with `reqwest`. The frontend never calls the network itself.

| Lookup                                      | Code                                         |
| ------------------------------------------- | -------------------------------------------- |
| Paper metadata (Crossref, arXiv)            | `src-tauri/src/service/papers/fetch.rs`      |
| Conference deadlines (ccfddl)               | `src-tauri/src/service/conferences/fetch.rs` |
| Subscribed calendars (ICS)                  | `src-tauri/src/service/calendars/fetch.rs`   |
| RSS/Atom feeds                              | `src-tauri/src/service/feeds/fetch.rs`       |
| Latest GitHub release (opt-in update check) | `src-tauri/src/service/updates.rs`           |

`reqwest` uses `native-tls` (SChannel on Windows, so no C crypto library is needed) and `system-proxy` (the OS proxy settings).

## Shared Client

Use `src-tauri/src/service/net.rs`; don't build a client yourself.

- `net::client()`: a `reqwest::Client` with a generic `EnvForIO/<version> (desktop research app)` user agent (no user details) and a 40-second timeout.
- `net::network`: maps a `reqwest::Error` to `AppError::Network` and logs it without the URL (a calendar link can carry a private token, and logs may be attached to bug reports).

```rust
// src-tauri/src/service/conferences/fetch.rs
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

## Rules

- The command in `src-tauri/src/api/` is `async` and returns `AppResult<T>`.
- Don't hold `state.db()` across an `.await`: read what you need, fetch, then lock again to write. See `add_paper` in `src-tauri/src/api/papers.rs`.
- Save fetched data to SQLite, so the app keeps working offline with what it last downloaded.
- In the UI, a failed lookup is an error with `type === 'Network'`. See [error-handling.md](./error-handling.md).

## Background Refresh

`src-tauri/src/desktop/refresh.rs` refreshes calendars every hour and feeds every 3 hours on a background thread, then emits `calendars-changed` / `feeds-changed`. Pages refetch with `useInvalidateOn(event, queryKey)` (`src/hooks/useInvalidateOn.ts`).
