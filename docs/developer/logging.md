# Logging

Simple logging setup for both Rust backend and TypeScript frontend.

## Quick Start

### Rust (Backend)

```rust
log::info!("Application starting up");
log::debug!("Debug info: {}", some_value);
log::warn!("Something unexpected happened");
log::error!("Error occurred: {}", error);
```

### TypeScript (Frontend)

```typescript
import { logger } from '@/lib/logger'

logger.info('User action completed')
logger.debug('Debug data', { userId: 123, action: 'click' })
logger.warn('Performance warning')
logger.error('Request failed', { error: response.error })
```

## Configuration

### Rust Backend

- Uses `tauri-plugin-log` with standard Rust `log` crate
- **Level**: Debug in debug builds, Info in release builds
- **Targets** (same in dev and production, set in `src-tauri/src/lib.rs`):

| Target          | Platforms                                                                 |
| --------------- | ------------------------------------------------------------------------- |
| Stdout          | All                                                                       |
| Webview console | Windows and macOS (skipped on Linux, where it deadlocks during `setup()`) |
| Log file        | All (`EnvForIO.log` in the app log directory)                             |

On Windows the log file is `%LOCALAPPDATA%\io.github.envforio\logs\EnvForIO.log`. It is capped at 1 MB; when full it is rotated and one previous file is kept. It stays on the machine: **Report a problem** (Preferences → General, or the command palette) only names its location in the bug report, and the user decides whether to attach it.

### TypeScript Frontend

- **Development**: All logs go to browser console
- **Production**: Console logging only (keeps it simple)
- Logger utility at `src/lib/logger.ts`

## Log Levels

| Level   | When to Use            | Dev | Prod |
| ------- | ---------------------- | --- | ---- |
| `trace` | Most verbose debugging | ✅  | ❌   |
| `debug` | Development debugging  | ✅  | ❌   |
| `info`  | General information    | ✅  | ✅   |
| `warn`  | Warning conditions     | ✅  | ✅   |
| `error` | Error conditions       | ✅  | ✅   |

## Where Logs Appear

- **Rust**: Terminal (stdout) + DevTools console (webview, not on Linux) + log file (the app log directory; **Open log folder** shows it)
- **TypeScript**: DevTools console

## Examples

### Rust Tauri Commands

```rust
#[tauri::command]
async fn save_data(data: MyData) -> Result<(), String> {
    log::info!("Saving data ({} items)", data.items.len());

    match save_to_disk(&data).await {
        Ok(_) => {
            log::info!("Data saved successfully");
            Ok(())
        }
        Err(e) => {
            log::error!("Failed to save data: {}", e);
            Err(format!("Save failed: {}", e))
        }
    }
}
```

### TypeScript React Components

```typescript
import { logger } from '@/lib/logger'

function MyComponent() {
  const handleClick = () => {
    logger.debug('Button clicked', { component: 'MyComponent' })

    try {
      performAction()
      logger.info('Action completed successfully')
    } catch (error) {
      logger.error('Action failed', { error })
    }
  }

  return <button onClick={handleClick}>Click me</button>
}
```

## Best Practices

1. **Use appropriate log levels** - Don't log everything as `info`
2. **Include context** - Add relevant data to help debugging
3. **Log errors with details** - Include error messages and context
4. **Keep messages concise** - But descriptive enough to be useful
5. **Use structured logging** - Include objects/context for complex data

See [error-handling.md](./error-handling.md) for patterns on when to log vs show errors to users.

## Production Considerations

- Users may attach the log file to a public GitHub issue, so log nothing private: no passwords or tokens, no task, idea or paper text, no hostnames, and no full paths (they contain the Windows user name). Log a file name, or a path through `domain::feedback::shareable_path`.
- Frontend logs stay in browser - not sent to backend by default
