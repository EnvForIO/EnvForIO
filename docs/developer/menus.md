# Native Menu

The app menu is built in JavaScript (`src/lib/menu.ts`) with `@tauri-apps/api/menu`, so labels come from i18next. `src/App.tsx` calls `buildAppMenu()` after the language is set, then `setupMenuLanguageListener()`, which rebuilds the menu on `languageChanged`.

## Structure

```
EnvForIO
├── About EnvForIO
├── Preferences...           (CmdOrCtrl+,)
├── Hide / Hide Others / Show All   (predefined items, macOS)
└── Quit EnvForIO
View
├── Toggle Left Sidebar      (CmdOrCtrl+1)
└── Toggle Right Sidebar     (CmdOrCtrl+2)
```

The tray icon has its own menu: a small `tray-menu` window (`src-tauri/src/desktop/tray_menu.rs`, page `src/components/tray-menu/TrayMenu.tsx`) opened at the cursor on a right click, with the running timer, My Day, quick add, Show, Mini mode and Quit. It uses the same surface as the app's right-click menus (`components/ui/menu-styles.ts`). On Linux the tray keeps a native menu (`tray.rs`).

## Adding an Item

1. Add the label to `locales/en.json` (`"menu.myAction": "My Action"`).
2. Add a `MenuItem.new({ id, text: t('menu.myAction'), accelerator, action })` to the submenu in `buildAppMenu()`.
3. Write the handler in the same file. Read the store with `getState()`:

```typescript
function handleToggleLeftSidebar(): void {
  useUIStore.getState().toggleLeftSidebar()
}
```

Menu items call their handler directly; they do not go through the command registry or a Tauri event. If the action also has a keyboard shortcut in the window, add it in `use-keyboard-shortcuts.ts` too (see [keyboard-shortcuts.md](./keyboard-shortcuts.md)).
