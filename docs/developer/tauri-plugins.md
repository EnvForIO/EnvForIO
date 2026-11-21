# Tauri Plugins

Plugins are registered in `src-tauri/src/lib.rs`. Their permissions are in `src-tauri/capabilities/` (see [architecture-guide.md](./architecture-guide.md#security)).

## Installed

| Plugin                             | What EnvForIO uses it for                                                                                                 | Used from                                                |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `single-instance`                  | A second launch focuses the existing main window                                                                          | Rust only                                                |
| `autostart`                        | "Launch at login" (starts in the tray, `AUTOSTART_ARG`)                                                                   | `preferences/panes/LaunchAtLogin.tsx`                    |
| `window-state`                     | Saves and restores main window size and position (not visibility); `quick-pane`, `duo-capsule`, `duo-card` are denylisted | Rust only                                                |
| `log`                              | Stdout, log file and webview console targets                                                                              | Rust; see [logging.md](./logging.md)                     |
| `notification`                     | `commands.sendNativeNotification` (wired up; nothing sends one yet)                                                       | `src/lib/notifications.ts`                               |
| `dialog`                           | Save dialogs for exports                                                                                                  | `src/api/export.ts`, `src/api/research.ts`               |
| `clipboard-manager`                | Copy/paste in the app's edit menu, copying a paper's BibTeX                                                               | `components/ui/edit-menu.tsx`, `src/api/papers.ts`       |
| `opener`                           | Opening links in the browser                                                                                              | `src/lib/updates.ts`, idea/paper/reader pages            |
| `os`                               | Platform and locale detection                                                                                             | `src/hooks/use-platform.ts`, `src/i18n/language-init.ts` |
| `global-shortcut`                  | The quick-pane shortcut                                                                                                   | Rust (`commands/quick_pane.rs`)                          |
| `fs`, `persisted-scope`, `process` | Registered; no frontend code imports them                                                                                 | —                                                        |

There is no updater plugin; EnvForIO does not update itself. `tauri-nspanel` is a macOS-only dependency for the quick pane and is not built for Windows releases. The database uses `rusqlite` and web lookups use `reqwest` in Rust, so the `sql` and `http` plugins are not needed.

## Registration Order

1. `single-instance` first.
2. `autostart`, `window-state` (desktop only, `#[cfg(desktop)]`).
3. The rest.
4. `global-shortcut` is added inside `setup()`, then the saved shortcut is registered.

## Built In, No Plugin

- **Tray:** `src-tauri/src/desktop/tray.rs` (the `tray-icon` feature). Show EnvForIO, Mini mode (Todo Duo), Quit. Labels are English constants because the tray is built before translations load.
- **App menu:** `src/lib/menu.ts`, see [menus.md](./menus.md).
- **Context menus** are drawn by the app (`src/components/ui/context-menu.tsx`, Radix), not native. Give each item an icon, mark delete `variant="destructive"`, and use `<ContextMenu modal={false}>` when an item opens a dialog or input. The WebView's own browser menu is off outside text fields (`src/lib/browser-menu.ts`).

## Adding a Plugin

1. `npm run tauri add <name>`.
2. Check its place in `lib.rs`; wrap desktop-only plugins in `#[cfg(desktop)]`.
3. Add only the permissions it needs to the right capability file.
