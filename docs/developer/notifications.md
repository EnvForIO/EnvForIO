# Notifications

## Toasts

In-app toasts use Sonner. The main window renders one `<Toaster position="bottom-right">` in `src/components/layout/MainWindow.tsx`, themed from `useTheme()`. Most code calls Sonner directly:

```typescript
import { toast } from 'sonner'

toast.error(errorText(error)) // failed mutation
toast(t('undo.done', { what: label })) // src/hooks/use-undo-shortcut.ts
```

Translate the text (see [i18n-patterns.md](./i18n-patterns.md)). For failures, see [error-handling.md](./error-handling.md).

## `notify()` Helper

`src/lib/notifications.ts` exports `notify(title, message?, { type, native, duration })` and the shortcuts `notifications.success/error/info/warning`. `CommandContext.showToast` uses it. With `native: true` it calls `commands.sendNativeNotification` (Rust, `src-tauri/src/commands/notifications.rs`, `tauri-plugin-notification`) and falls back to an error toast if that fails.

No feature sends a native notification yet. The plugin is called from Rust only, so the webview needs no `notification` permission.
