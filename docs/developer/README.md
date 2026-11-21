# Developer Documentation

How EnvForIO is built and the patterns to follow when changing it. Written for human contributors and AI coding agents.

## Architecture & Patterns

| Document                                      | Description                                               |
| --------------------------------------------- | --------------------------------------------------------- |
| [Architecture Guide](./architecture-guide.md) | Where state lives, file layout, windows, events, security |
| [Rust Architecture](./rust-architecture.md)   | Rust modules, adding a command, errors                    |
| [EnvForIO Design](./envforio-design.md)       | Libraries, layout, request flow, safety line rules        |
| [State Management](./state-management.md)     | TanStack Query, Zustand, useState; selector rules         |
| [Error Handling](./error-handling.md)         | `AppError`, `unwrapResult`, toasts                        |

## Core Systems

| Document                                      | Description                                       |
| --------------------------------------------- | ------------------------------------------------- |
| [Command System](./command-system.md)         | Command palette commands and how to add one       |
| [Keyboard Shortcuts](./keyboard-shortcuts.md) | In-window shortcuts and the global quick-pane key |
| [Menus](./menus.md)                           | Native app menu built in JavaScript with i18n     |
| [Quick Pane](./quick-panes.md)                | The quick-capture window                          |
| [Tauri Commands](./tauri-commands.md)         | Typed Rust-TypeScript bridge (tauri-specta)       |
| [Tauri Plugins](./tauri-plugins.md)           | Installed plugins, tray, context menus            |

## UI & UX

| Document                                   | Description                                    |
| ------------------------------------------ | ---------------------------------------------- |
| [UI Patterns](./ui-patterns.md)            | CSS files, theme tokens, dark mode, components |
| [Internationalization](./i18n-patterns.md) | Translation strings (English only)             |
| [Notifications](./notifications.md)        | Toasts and the `notify()` helper               |
| [Cross-Platform](./cross-platform.md)      | Windows target, platform configs, title bar    |

## Data & Storage

| Document                                  | Description                                     |
| ----------------------------------------- | ----------------------------------------------- |
| [Data Persistence](./data-persistence.md) | SQLite, migrations, preferences, recovery files |
| [External APIs](./external-apis.md)       | Web lookups from Rust, background refresh       |

## Quality & Tooling

| Document                                              | Description                                     |
| ----------------------------------------------------- | ----------------------------------------------- |
| [Static Analysis](./static-analysis.md)               | `check:all`, ESLint, ast-grep, knip, jscpd      |
| [Writing ast-grep Rules](./writing-ast-grep-rules.md) | Adding an architecture rule                     |
| [Testing](./testing.md)                               | Vitest with Tauri mocks, Rust tests             |
| [Bundle Optimization](./bundle-optimization.md)       | What keeps the build small                      |
| [Logging](./logging.md)                               | Rust log file, frontend logger, what not to log |
| [Writing Docs](./writing-docs.md)                     | Guide for creating and maintaining these docs   |

## Release & Distribution

| Document                  | Description                                |
| ------------------------- | ------------------------------------------ |
| [Releases](./releases.md) | CI, Windows release build (no auto-update) |

---

**Updating these docs:** When adding new patterns or systems, update the relevant doc file and add a link here if creating a new document.
