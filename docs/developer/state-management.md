# State Management

Three layers, from widest to narrowest:

| Layer          | Use for                                                                            | Where                                                 |
| -------------- | ---------------------------------------------------------------------------------- | ----------------------------------------------------- |
| TanStack Query | Anything from Rust: app data, preferences                                          | `src/api/*.ts`, `src/services/preferences.ts`         |
| Zustand        | Shared UI state that is not saved: sidebars, selection, open dialogs, current page | `src/store/ui-store.ts`, `src/store/monitor-store.ts` |
| `useState`     | State one component owns                                                           | The component                                         |

Decision: needed by more than one component? If not, `useState`. Does it come from or go to Rust? Then TanStack Query. Otherwise Zustand.

## TanStack Query

Every Tauri command is called from a hook in `src/api/<resource>.ts`, never directly from a component. Each file defines its query keys and wraps commands with `unwrapResult`:

```typescript
// src/api/ideas.ts
export const useIdeas = (filter: IdeaFilter) =>
  useQuery({
    queryKey: ideaKeys.list(filter),
    queryFn: async () => unwrapResult(await commands.listIdeas(filter)),
  })
```

Writes use `useInvalidatingMutation` (`src/api/mutation.ts`), which refetches the given keys when the mutation settles. Tasks and ideas have their own mutation helpers that also emit `tasks-changed` so other windows refetch. Defaults (no refetch on focus, one retry, 5-minute stale time) are in `src/lib/query-client.ts`.

## Zustand

`useUIStore` holds sidebar visibility, the selected view/project/task/page, command palette and preferences state. `useMonitorStore` holds the last minute of machine samples pushed from Rust.

## Performance Patterns

### Select, don't destructure

```typescript
// ❌ BAD: subscribes to the whole store
const { leftSidebarVisible } = useUIStore()

// ✅ GOOD: re-renders only when this value changes
const leftSidebarVisible = useUIStore(state => state.leftSidebarVisible)
```

`.ast-grep/rules/zustand/no-destructure.yml` and its `.ts` twin enforce this for every store named `use…Store` (see [writing-ast-grep-rules.md](./writing-ast-grep-rules.md)).

### `getState()` in callbacks

In event handlers, commands and async code, read the store with `getState()` instead of subscribing:

```typescript
// src/lib/commands/navigation-commands.ts
execute: () => {
  useUIStore.getState().setLeftSidebarVisible(true)
},
```

### React Compiler

The React Compiler is on (`vite.config.ts`), so don't add `useMemo`, `useCallback` or `React.memo` by hand. It does not replace the selector and `getState()` rules above.

## Sidebars

`MainWindow.tsx` renders the sidebars conditionally (`{leftSidebarVisible && <LeftSideBar />}`). Their content keeps its state in Zustand or TanStack Query, so unmounting loses nothing. If a panel ever holds state that must survive hiding (scroll position, unsaved input), hide it with CSS instead.

## Adding a Store

Create it in `src/store/` and name it `use…Store`, so the lint rules cover it. `ui-store.ts` uses the `devtools` middleware.

Code in `src/lib/` may read stores only through `getState()`, never subscribe (`.ast-grep/rules/architecture/no-store-in-lib.yml`).
