# Keyboard Shortcuts

## Shortcuts and Where They Are Handled

| Shortcut           | Action                            | Handled in                                                                          |
| ------------------ | --------------------------------- | ----------------------------------------------------------------------------------- |
| Ctrl + `,`         | Open Preferences                  | `src/hooks/use-keyboard-shortcuts.ts`, called from `useMainWindowEventListeners.ts` |
| Ctrl + `1` / `2`   | Toggle left / right sidebar       | `src/hooks/use-keyboard-shortcuts.ts`                                               |
| Ctrl + K           | Command palette                   | `src/components/command-palette/CommandPalette.tsx`                                 |
| Ctrl + Z           | Undo the last task change         | `src/hooks/use-undo-shortcut.ts`, called from `MainWindow.tsx`                      |
| Ctrl + Shift + `.` | Quick pane, from any app (global) | Rust, `src-tauri/src/commands/quick_pane.rs`                                        |

The in-window handlers check `e.metaKey || e.ctrlKey`, so the same code would answer Cmd on macOS.

Ctrl+Z is skipped while focus is in an input, textarea or contenteditable, so typing keeps its normal undo.

The quick-pane shortcut is system-wide, registered with `tauri-plugin-global-shortcut`. The default is `CommandOrControl+Shift+.` (`DEFAULT_QUICK_PANE_SHORTCUT` in `src-tauri/src/types.rs`); users change it in Preferences > General. See [quick-panes.md](./quick-panes.md).

## Adding an In-Window Shortcut

Add a `case` to the `switch` in `use-keyboard-shortcuts.ts`. Call `e.preventDefault()` and read the store with `getState()`:

```typescript
case '2': {
  e.preventDefault()
  const { rightSidebarVisible, setRightSidebarVisible } = useUIStore.getState()
  setRightSidebarVisible(!rightSidebarVisible)
  break
}
```

If the action also has a command, set its `shortcut` display text (see [command-system.md](./command-system.md)). Shortcuts use plain `keydown` listeners on `document`, not a hotkey library.
