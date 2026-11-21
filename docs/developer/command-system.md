# Command System

Commands are plain objects registered once and run from the command palette (Ctrl+K). Code is in `src/lib/commands/`.

| File                               | Contents                                                    |
| ---------------------------------- | ----------------------------------------------------------- |
| `types.ts`                         | `AppCommand`, `CommandContext`                              |
| `registry.ts`                      | `registerCommands`, `getAllCommands`, `executeCommand`      |
| `index.ts`                         | `initializeCommandSystem()`, called once from `src/App.tsx` |
| `navigation-commands.ts`           | Sidebars, preferences                                       |
| `window-commands.ts`               | Close, minimize, maximize, fullscreen                       |
| `help-commands.ts`                 | Check for updates, report a problem, open log folder        |
| `src/hooks/use-command-context.ts` | The `CommandContext` object                                 |

`CommandContext` has two actions: `openPreferences()` and `showToast(message, type?)`. Commands read and change other state with `useUIStore.getState()`.

## Example

```typescript
// src/lib/commands/navigation-commands.ts
{
  id: 'show-left-sidebar',
  labelKey: 'commands.showLeftSidebar.label',
  descriptionKey: 'commands.showLeftSidebar.description',
  icon: Sidebar,
  group: 'navigation',
  shortcut: '⌘+1',
  keywords: ['sidebar', 'left', 'panel', 'show'],
  execute: () => {
    useUIStore.getState().setLeftSidebarVisible(true)
  },
  isAvailable: () => !useUIStore.getState().leftSidebarVisible,
},
```

`shortcut` is display text only. The key itself is handled elsewhere; see [keyboard-shortcuts.md](./keyboard-shortcuts.md).

## Adding a Command

1. Add `commands.<id>.label` and `commands.<id>.description` to `locales/en.json` (keys are flat: `"commands.myAction.label": "My Action"`).
2. Add the object to the right `*-commands.ts` file, or create a new file and register it in `initializeCommandSystem()`.
3. Use `getState()` inside `execute` and `isAvailable`, never a store hook.
4. If commands need a new shared action, add it to `CommandContext` in `types.ts` and to `use-command-context.ts`.

## Groups

`group` sets the palette heading, translated from `commands.group.<name>`. Keys exist for `navigation`, `settings`, `window`, `help` and `other`. The commands in `window-commands.ts` set no group, so they show under `other`.

## Menus

The native menu (`src/lib/menu.ts`) does not go through the registry; each item calls its handler directly. See [menus.md](./menus.md).
