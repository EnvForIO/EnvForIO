# Logging

## Rust

Use the `log` crate (`log::info!`, `log::warn!`, ...). `tauri-plugin-log` is set up in `src-tauri/src/lib.rs`: Debug level in debug builds, Info in release.

| Target          | Platforms                                                       |
| --------------- | --------------------------------------------------------------- |
| Stdout          | All                                                             |
| Webview console | Windows (skipped on Linux, where it deadlocks during `setup()`) |
| Log file        | `EnvForIO.log` in the app log directory                         |

On Windows the log file is `%LOCALAPPDATA%\io.github.envforio\logs\EnvForIO.log`. It is capped at 1 MB; when full it is rotated and one previous file is kept. It stays on the machine: **Report a problem** (Preferences > General, or the command palette) only names its location in the bug report, and the user decides whether to attach it. **Open log folder** (`open_log_folder`, `src-tauri/src/api/feedback.rs`) shows it.

## TypeScript

```typescript
import { logger } from '@/lib/logger'

logger.warn('Failed to load preferences, using defaults', { error })
```

`src/lib/logger.ts` writes to the DevTools console in development builds only. In release builds it writes nothing, and it never sends to the Rust log file. Anything that must reach the log file has to be logged in Rust.

## What Not to Log

Users may attach the log file to a public GitHub issue, so log nothing private: no passwords or tokens, no task, idea or paper text, no hostnames, no URLs (`net::network` strips them), and no full paths (they contain the Windows user name). Log a file name, or a path through `domain::feedback::shareable_path`.
