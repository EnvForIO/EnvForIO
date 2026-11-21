# Keyboard Shortcuts

Centralized keyboard shortcut management using native DOM event listeners.

## Current Shortcuts

| Shortcut             | Mac         | Windows/Linux | Action                            |
| -------------------- | ----------- | ------------- | --------------------------------- |
| Open Preferences     | Cmd+,       | Ctrl+,        | Opens settings dialog             |
| Command Palette      | Cmd+K       | Ctrl+K        | Opens command search              |
| Toggle Left Sidebar  | Cmd+1       | Ctrl+1        | Show/hide left panel              |
| Toggle Right Sidebar | Cmd+2       | Ctrl+2        | Show/hide right panel             |
| Undo task change     | Cmd+Z       | Ctrl+Z        | Undoes the last task change       |
| Quick pane (global)  | Cmd+Shift+. | Ctrl+Shift+.  | Shows the quick pane from any app |

## Architecture

| Shortcut               | Handled in                                                                          |
| ---------------------- | ----------------------------------------------------------------------------------- |
| Cmd/Ctrl + `,` `1` `2` | `src/hooks/use-keyboard-shortcuts.ts`, called from `useMainWindowEventListeners.ts` |
| Cmd/Ctrl + K           | `src/components/command-palette/CommandPalette.tsx`                                 |
| Cmd/Ctrl + Z           | `src/hooks/use-undo-shortcut.ts`, called from `MainWindow.tsx`                      |
| Quick pane             | Rust global shortcut in `src-tauri/src/commands/quick_pane.rs`                      |

Ctrl+Z is skipped while focus is in an input, textarea or contenteditable, so typing keeps its normal undo.

The quick-pane shortcut is system-wide, registered in Rust with `tauri-plugin-global-shortcut`. The default is `CommandOrControl+Shift+.` (`DEFAULT_QUICK_PANE_SHORTCUT` in `src-tauri/src/types.rs`); users change it in Preferences > General. See [quick-panes.md](./quick-panes.md).

The in-window shortcuts use plain `keydown` listeners:

```typescript
// src/hooks/use-keyboard-shortcuts.ts
export function useKeyboardShortcuts(commandContext: CommandContext) {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey) {
        switch (e.key) {
          case ',': {
            e.preventDefault()
            commandContext.openPreferences()
            break
          }
          case '1': {
            e.preventDefault()
            const { leftSidebarVisible, setLeftSidebarVisible } =
              useUIStore.getState()
            setLeftSidebarVisible(!leftSidebarVisible)
            break
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [commandContext])
}
```

**Critical**: Use `getState()` to access store data in event handlers to avoid render cascades. See [State Management](./state-management.md#the-getstate-pattern).

## Adding New Shortcuts

### 1. Add to event handler

```typescript
// src/hooks/use-keyboard-shortcuts.ts
case '3': {
  e.preventDefault()
  commandContext.myNewAction()
  break
}
```

### 2. Add to native menu (if applicable)

```typescript
// src/lib/menu.ts
await MenuItem.new({
  id: 'my-action',
  text: t('menu.myAction'),
  accelerator: 'CmdOrCtrl+3',
  action: handleMyAction,
})
```

See [Menus](./menus.md) for full menu integration details.

## Modifier Keys

```typescript
// Cross-platform modifier (Cmd on Mac, Ctrl elsewhere)
if (e.metaKey || e.ctrlKey) {
}

// With Shift
if ((e.metaKey || e.ctrlKey) && e.shiftKey) {
}

// Function keys (no modifier needed)
if (e.key === 'F1') {
}
```

**Always call `e.preventDefault()`** to prevent browser defaults (like Cmd+, opening browser settings).

## Why Native DOM Events

Native DOM event listeners are used instead of libraries like `react-hotkeys-hook` because they provide more reliable execution in the Tauri environment.

## Conventions

| Pattern         | Keys                |
| --------------- | ------------------- |
| Preferences     | Cmd/Ctrl + ,        |
| Search/Command  | Cmd/Ctrl + K        |
| Panel toggles   | Cmd/Ctrl + 1,2,3... |
| File operations | Cmd/Ctrl + N,O,S    |
| Undo            | Cmd/Ctrl + Z        |

## Troubleshooting

| Issue                             | Check                                              |
| --------------------------------- | -------------------------------------------------- |
| Shortcuts not firing              | `useMainWindowEventListeners` called in MainWindow |
| Browser intercepts shortcut       | Add `e.preventDefault()`                           |
| Different behavior Mac vs Windows | Test `e.metaKey \|\| e.ctrlKey`                    |
