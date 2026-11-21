# Testing

Testing patterns for Rust and TypeScript, with focus on Tauri-specific mocking.

## Running Tests

```bash
npm run check:all      # All tests and checks
npm run test           # TypeScript tests (watch mode)
npm run test:run       # TypeScript tests (single run)
npm run rust:test      # Rust tests
```

## TypeScript Testing

Uses **Vitest** + **@testing-library/react**. Configuration in `vitest.config.ts`.

### Test File Location

Place tests next to the code they test:

```
src/components/ui/Button.tsx
src/components/ui/Button.test.tsx
```

### Mocking Tauri APIs (Critical)

Tauri commands must be mocked since tests run outside the Tauri environment. Mocks are configured in `src/test/setup.ts`:

```typescript
// src/test/setup.ts
import { vi } from 'vitest'

// Mock Tauri event APIs
vi.mock('@tauri-apps/api/event', () => ({
  emit: vi.fn().mockResolvedValue(undefined),
  listen: vi.fn().mockResolvedValue(() => {}),
}))

vi.mock('@tauri-apps/plugin-autostart', () => ({
  isEnabled: vi.fn().mockResolvedValue(false),
  enable: vi.fn().mockResolvedValue(undefined),
  disable: vi.fn().mockResolvedValue(undefined),
}))

// Mock typed Tauri bindings (tauri-specta generated)
vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    loadPreferences: vi
      .fn()
      .mockResolvedValue({ status: 'ok', data: { theme: 'system' } }),
    listTasks: vi.fn().mockResolvedValue({ status: 'ok', data: [] }),
    // ... see setup.ts for the full list
  },
  unwrapResult: vi.fn(/* returns data, throws on error */),
}))
```

`setup.ts` also mocks `window.matchMedia`.

### Testing with Mocked Commands

```typescript
import { vi } from 'vitest'
import { commands } from '@/lib/tauri-bindings'

const mockCommands = vi.mocked(commands)

test('loads preferences', async () => {
  mockCommands.loadPreferences.mockResolvedValue({
    status: 'ok',
    data: { theme: 'dark' },
  })

  // Test code that calls loadPreferences
})
```

### Test Wrapper for Providers

`src/test/test-utils.tsx` re-exports `@testing-library/react` with a `render` that wraps the component in a fresh `QueryClient` (retries off), the i18n provider and a mock theme provider:

```typescript
import { render, screen } from '@/test/test-utils'

test('component with query', () => {
  render(<MyComponent />)
})
```

### Testing Zustand Stores

```typescript
import { renderHook, act } from '@testing-library/react'
import { useUIStore } from '@/store/ui-store'

test('toggles sidebar visibility', () => {
  const { result } = renderHook(() => useUIStore())

  expect(result.current.leftSidebarVisible).toBe(true)

  act(() => {
    result.current.setLeftSidebarVisible(false)
  })

  expect(result.current.leftSidebarVisible).toBe(false)
})
```

## Rust Testing

### Unit Tests

```rust
#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_preferences_default() {
        let prefs = AppPreferences::default();
        assert_eq!(prefs.theme, "system");
    }
}
```

Rust tests live in `src-tauri/src/domain/` (pure functions) and `src-tauri/src/service/` (against an in-memory database). There are no Rust dev-dependencies (no `tokio` test runtime, no `tempfile`); keep logic that needs testing out of async and file-system code.

### Database Tests

`db::open_in_memory()` (in `src-tauri/src/db/mod.rs`, `#[cfg(test)]`) gives an in-memory SQLite connection with every migration applied. Service tests use it.

## Adding New Command Mocks

When adding new Tauri commands, update `src/test/setup.ts`:

```typescript
vi.mock('@/lib/tauri-bindings', () => ({
  commands: {
    // ... existing mocks
    myNewCommand: vi.fn().mockResolvedValue({ status: 'ok', data: null }),
  },
}))
```

## Best Practices

| Do                                    | Don't                         |
| ------------------------------------- | ----------------------------- |
| Mock Tauri commands in setup.ts       | Call real Tauri APIs in tests |
| Use `vi.mocked()` for type-safe mocks | Use untyped mock assertions   |
| Test user-visible behavior            | Test implementation details   |
| Use `db::open_in_memory()` in Rust    | Write to real file system     |
