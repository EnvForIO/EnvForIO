# Testing

```bash
npm run test           # Vitest, watch mode
npm run test:run       # Vitest, once
npm run rust:test      # cargo test
npm run check:all      # everything, see static-analysis.md
```

## TypeScript (Vitest)

Vitest with jsdom and Testing Library (`vitest.config.ts`). Tests sit next to the code as `*.test.ts(x)`, e.g. `src/pages/tasks/nest.test.ts`, `src/store/ui-store.test.ts`. Most tests cover pure helpers (dates, ranges, formatting).

### Tauri Mocks

Tests run outside Tauri, so `src/test/setup.ts` mocks `@tauri-apps/api/event`, `@tauri-apps/plugin-autostart` and `@/lib/tauri-bindings` (a short list of commands resolving to `{ status: 'ok', ... }`; the mocked `unwrapResult` returns the data or throws). It also stubs `window.matchMedia`.

When a component under test calls a new command, add it to the `commands` mock in `setup.ts`:

```typescript
myNewCommand: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
```

Override per test with `vi.mocked(commands).loadPreferences.mockResolvedValue(...)`.

### Providers

`render` from `src/test/test-utils.tsx` wraps the component in a fresh `QueryClient` (retries off), the i18n provider and a mock theme provider:

```typescript
import { render, screen } from '@/test/test-utils'
```

## Rust

Unit tests are `#[cfg(test)] mod tests` blocks, mostly in `src-tauri/src/domain/` (pure functions) and `src-tauri/src/service/` (against a database). `db::open_in_memory()` (`src-tauri/src/db/mod.rs`, test-only) gives an in-memory SQLite connection with every migration applied.

There are no Rust dev-dependencies (no async test runtime, no `tempfile`), so keep logic that needs tests out of async and file-system code.
