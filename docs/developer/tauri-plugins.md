# Tauri Plugins

Guide to all Tauri plugins installed in this app, plus built-in features and guidance on when to add more.

## Installed Plugins

### Core Functionality

| Plugin              | Purpose                                 | Frontend Package                  |
| ------------------- | --------------------------------------- | --------------------------------- |
| **single-instance** | Prevents multiple app instances         | None (Rust-only)                  |
| **window-state**    | Saves/restores window position and size | `@tauri-apps/plugin-window-state` |
| **log**             | Rust and frontend logging               | `@tauri-apps/plugin-log`          |

### File System & Storage

| Plugin              | Purpose                            | Frontend Package            |
| ------------------- | ---------------------------------- | --------------------------- |
| **fs**              | File system access                 | `@tauri-apps/plugin-fs`     |
| **persisted-scope** | Persistent file access permissions | None (Rust-only)            |
| **dialog**          | Native open/save/message dialogs   | `@tauri-apps/plugin-dialog` |

### System Integration

| Plugin                | Purpose                           | Frontend Package                       |
| --------------------- | --------------------------------- | -------------------------------------- |
| **opener**            | Open files/URLs with default apps | `@tauri-apps/plugin-opener`            |
| **clipboard-manager** | Clipboard read/write              | `@tauri-apps/plugin-clipboard-manager` |
| **notification**      | System notifications              | `@tauri-apps/plugin-notification`      |
| **process**           | Exit/restart app                  | `@tauri-apps/plugin-process`           |
| **os**                | OS information                    | `@tauri-apps/plugin-os`                |
| **global-shortcut**   | System-wide keyboard shortcuts    | None (configured in Rust)              |
| **autostart**         | "Launch at login" preference      | `@tauri-apps/plugin-autostart`         |

There is no updater plugin; EnvForIO does not update itself.

### Platform-Specific

| Plugin            | Purpose               | Platform   |
| ----------------- | --------------------- | ---------- |
| **tauri-nspanel** | Native panel behavior | macOS only |

## Plugin Usage Patterns

### Single Instance

Prevents multiple instances of your app from running. When a user tries to open a second instance, the existing window is focused instead.

**Configuration** (`src-tauri/src/lib.rs`):

```rust
#[cfg(desktop)]
{
    app_builder = app_builder.plugin(tauri_plugin_single_instance::init(
        |app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
                let _ = window.unminimize();
            }
        },
    ));
}
```

**Important**: This plugin must be registered FIRST in the plugin chain.

### Window State

Automatically saves and restores window position, size, and state (maximized, etc.).

**How it works**:

- Window state is saved when the app closes (and when the main window is hidden to the tray)
- State is restored when the app opens; visibility is not restored
- `quick-pane`, `duo-capsule` and `duo-card` are on the denylist in `lib.rs`

**No frontend code needed** - works automatically.

### Context Menus

EnvForIO draws its right-click menus itself (`src/components/ui/context-menu.tsx`, Radix) so they match the app; the native Windows menu looked out of place (user, 2026-11-21), and the template's native helper was removed. Wrap the element in `ContextMenu` / `ContextMenuTrigger asChild`, give each item an icon, and mark delete `variant="destructive"`. Use `modal={false}` when an item opens a dialog or an input. The WebView's own browser menu is turned off outside text fields (`src/lib/browser-menu.ts`).

```tsx
<ContextMenu modal={false}>
  <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
  <ContextMenuContent>
    <ContextMenuItem onSelect={open}>
      <PencilIcon />
      Edit
    </ContextMenuItem>
    <ContextMenuSeparator />
    <ContextMenuItem variant="destructive" onSelect={remove}>
      <Trash2Icon />
      Delete
    </ContextMenuItem>
  </ContextMenuContent>
</ContextMenu>
```

### Dialog

Native file open/save dialogs and message boxes.

```typescript
import { open, save, message, ask, confirm } from '@tauri-apps/plugin-dialog'

// Open file dialog
const file = await open({
  multiple: false,
  filters: [{ name: 'Text', extensions: ['txt', 'md'] }],
})

// Save dialog
const path = await save({
  defaultPath: 'document.txt',
})

// Message box
await message('Operation complete!', { title: 'Success', kind: 'info' })

// Confirmation dialog
const confirmed = await confirm('Are you sure?', {
  title: 'Confirm',
  kind: 'warning',
})
```

### Notifications

System notifications.

```typescript
import { sendNotification } from '@tauri-apps/plugin-notification'

sendNotification({
  title: 'Download Complete',
  body: 'Your file has been downloaded.',
})
```

Or use the typed command:

```typescript
import { commands } from '@/lib/tauri-bindings'
await commands.sendNativeNotification('Title', 'Body text')
```

### Clipboard

Read/write system clipboard.

```typescript
import { writeText, readText } from '@tauri-apps/plugin-clipboard-manager'

await writeText('Hello, clipboard!')
const text = await readText()
```

### Opener

Open files/URLs with the default system application.

```typescript
import { openUrl, openPath } from '@tauri-apps/plugin-opener'

// Open URL in default browser
await openUrl('https://example.com')

// Open file with default app
await openPath('/path/to/document.pdf')
```

## Built-in Features (No Plugin Needed)

### System Tray

Built into Tauri v2 via the `tray-icon` feature. EnvForIO's tray is created in `src-tauri/src/desktop/tray.rs`: left click or "Show EnvForIO" brings the main window back, "Mini mode" opens the Todo Duo windows, and "Quit" exits. Closing the main window hides it to the tray. Tray labels are plain English constants, since the tray is built before the frontend's translations load.

### App Menus

The Menu API is built into `@tauri-apps/api/menu`. This app uses it for:

- Application menu: the app menu (About, Preferences, Hide, Quit) and View (sidebar toggles), built in `src/lib/menu.ts`
- Context menus are app-drawn (`src/components/ui/context-menu.tsx`), not native

## Plugins to Consider Adding

These plugins aren't included by default but are commonly needed:

| Plugin         | When to Add                                                 |
| -------------- | ----------------------------------------------------------- |
| **shell**      | Need to spawn child processes or run terminal commands      |
| **deep-link**  | Custom URL schemes (myapp://path)                           |
| **positioner** | Tray apps or floating windows that need precise positioning |

Not needed here: **sql** (the database uses `rusqlite` in Rust, see [data-persistence.md](./data-persistence.md)) and **http** (web lookups use `reqwest` in Rust, see [external-apis.md](./external-apis.md)).

## Adding a New Plugin

1. **Install via CLI**:

   ```bash
   npm run tauri add PLUGIN_NAME
   ```

2. **Check placement** in `lib.rs`:
   - `single-instance` must be FIRST
   - Desktop-only plugins should be wrapped in `#[cfg(desktop)]`

3. **Add capability permissions** if needed (check plugin docs)

4. **Create frontend utilities** in `src/lib/` if the plugin needs a wrapper

## Plugin Registration Order

The order plugins are registered matters:

1. **single-instance** - Must be first
2. **autostart**, **window-state** - Desktop only, before other windowing plugins
3. All other plugins in any order
4. **global-shortcut** - Registered inside `setup()`, after the database and tray are ready

## References

- [Tauri v2 Plugin Documentation](https://v2.tauri.app/plugin/)
- [Official Plugins Repository](https://github.com/tauri-apps/plugins-workspace)
- [Window State Plugin](https://v2.tauri.app/plugin/window-state/)
- [Single Instance Plugin](https://v2.tauri.app/plugin/single-instance/)
