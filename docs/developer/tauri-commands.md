# Tauri Commands (tauri-specta)

Rust commands get typed TypeScript bindings from [tauri-specta](https://github.com/specta-rs/tauri-specta). Versions are pinned exactly in `src-tauri/Cargo.toml` (`specta =2.0.0-rc.22`, `tauri-specta =2.0.0-rc.21`, `specta-typescript =0.0.9`) because they are release candidates.

## Files

| File                          | Role                                                                                          |
| ----------------------------- | --------------------------------------------------------------------------------------------- |
| `src-tauri/src/api/*.rs`      | App commands, one file per resource, return `AppResult<T>`                                    |
| `src-tauri/src/commands/*.rs` | Older commands (preferences, quick pane, recovery, notifications), return `Result<T, String>` |
| `src-tauri/src/bindings.rs`   | `collect_commands![...]` (the full command list) and `export_ts_bindings()`                   |
| `src/lib/bindings.ts`         | Generated. Do not edit                                                                        |
| `src/lib/tauri-bindings.ts`   | Re-exports `commands`, the types the app uses, and `unwrapResult`                             |
| `src/api/*.ts`                | TanStack Query hooks that call the commands                                                   |

Import from `@/lib/tauri-bindings`, not `@/lib/bindings`.

## Calling a Command

Every command returns `{ status: 'ok', data } | { status: 'error', error }`.

In a query or mutation, unwrap it so the error throws:

```typescript
queryFn: async () => unwrapResult(await commands.listIdeas(filter)),
```

Outside TanStack Query, check `status`. See [error-handling.md](./error-handling.md).

## Adding a Command

1. Write the service function and a thin `#[tauri::command] #[specta::specta]` wrapper in `src-tauri/src/api/<resource>.rs` (see [rust-architecture.md](./rust-architecture.md)). Types it takes or returns need `#[derive(Type)]`.
2. Add it to `collect_commands![...]` in `src-tauri/src/bindings.rs`.
3. Run `npm run rust:bindings` (`cargo test export_bindings -- --ignored`), which writes `src/lib/bindings.ts`. Debug builds (`npm run tauri:dev`) also regenerate it on start.
4. If the frontend needs a new type, add it to the `export type { ... }` list in `src/lib/tauri-bindings.ts`.
5. Call it from a hook in `src/api/<resource>.ts`.
6. Commit the Rust changes and the regenerated `bindings.ts` together.

## Notes

- `i64` values export as plain `number` (`BigIntExportBehavior::Number` in `bindings.rs`); ids and counts never get near 2^53.
- Parameters typed `serde_json::Value` become `JsonValue` in TypeScript (e.g. `saveEmergencyData`).
- `tauri.conf.json` sets `build.removeUnusedCommands: true`.
- Tests mock `@/lib/tauri-bindings` in `src/test/setup.ts`. See [testing.md](./testing.md).
