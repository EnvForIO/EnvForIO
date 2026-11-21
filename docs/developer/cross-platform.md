# Cross-Platform

EnvForIO is released for Windows only. The code still has macOS and Linux branches; Linux is used for development (WSL) and CI checks, and macOS code is neither built nor tested. Build and release steps are in [releases.md](./releases.md).

## Window Config

Tauri merges `src-tauri/tauri.<platform>.conf.json` over `tauri.conf.json` with JSON Merge Patch. Arrays are replaced whole, so a platform file must repeat the full `windows` entry, not just the changed keys.

| File                      | Main window                                                                     |
| ------------------------- | ------------------------------------------------------------------------------- |
| `tauri.conf.json`         | Native decorations (the base, used on Linux)                                    |
| `tauri.windows.conf.json` | `decorations: false`, `transparent: true`, `shadow: true`; bundle target `nsis` |
| `tauri.linux.conf.json`   | Native decorations                                                              |
| `tauri.macos.conf.json`   | Frameless with vibrancy (not built)                                             |

## Title Bar

`src/components/titlebar/TitleBar.tsx` picks the layout from `usePlatform()`:

| Platform | Layout                                                                     |
| -------- | -------------------------------------------------------------------------- |
| Windows  | Custom bar, `data-tauri-drag-region`, `WindowsWindowControls` on the right |
| Linux    | `LinuxTitleBar`: toolbar only; native decorations draw the controls        |
| macOS    | Custom bar with `MacOSWindowControls` on the left                          |

In development, `<TitleBar forcePlatform="windows" />` previews another layout.

## Detecting the Platform

- **Frontend:** `usePlatform()`, `useIsWindows()`, etc. and `getPlatform()` in `src/hooks/use-platform.ts` (uses `@tauri-apps/plugin-os`). Current users: `TitleBar` and `useSquareCornersEffect`.
- **Rust:** `#[cfg(target_os = "windows")]`, `#[cfg(desktop)]`. Prefer compile-time checks.
