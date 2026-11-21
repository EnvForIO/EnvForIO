# Quick Pane

The quick pane is a small floating window for quick capture: the user presses a global shortcut from any app, types a task, and it lands in My Day.

## Pieces

| Piece                   | Where                                                                                                   |
| ----------------------- | ------------------------------------------------------------------------------------------------------- |
| Window creation         | `init_quick_pane` in `src-tauri/src/commands/quick_pane.rs`, called from `setup()` in `lib.rs`          |
| Show / dismiss / toggle | `show_quick_pane`, `dismiss_quick_pane`, `toggle_quick_pane` commands (same file)                       |
| Global shortcut         | `register_quick_pane_shortcut`, `update_quick_pane_shortcut` (same file)                                |
| Default shortcut        | `DEFAULT_QUICK_PANE_SHORTCUT` = `CommandOrControl+Shift+.` in `src-tauri/src/types.rs`                  |
| View                    | `src/windows/quick-pane` → `src/components/quick-pane/QuickPaneApp.tsx`, styles in `src/quick-pane.css` |
| Permissions             | `src-tauri/capabilities/quick-pane.json`                                                                |

## How It Works

- The window is created once at startup, hidden, as an always-on-top, undecorated, transparent window loading `index.html?window=quick-pane`. Showing it later reuses that window.
- `show_quick_pane` centres it on the monitor that holds the mouse cursor.
- It hides on Escape (with `preventDefault()`, which stops the system beep) and when it loses focus.
- On submit it calls `commands.createTask(text, 'MyDay')`, then emits `tasks-changed`; `useTaskSync` (`src/api/tasks.ts`) in the main window refetches. The main window needs no listener of its own.
- It listens for `theme-changed` from `ThemeProvider` and also re-applies the theme on focus, which catches changes made while it was hidden.
- Users change the shortcut in Preferences > General (`commands.updateQuickPaneShortcut(shortcut)`, `null` resets it).

## Size

`QUICK_PANE_WIDTH` and `QUICK_PANE_HEIGHT` in `quick_pane.rs` set the pane's size, both when it is created and when it is centred on the screen.

## macOS

A separate `init_quick_pane_macos` path builds the pane as an NSPanel with `tauri-nspanel` (so it can float over fullscreen apps). It is not built or tested; Windows releases use `init_quick_pane_standard`.
