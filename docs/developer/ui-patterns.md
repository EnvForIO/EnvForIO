# UI Patterns

Tailwind CSS v4 (configured in CSS, no `tailwind.config.js`) and shadcn/ui (`new-york` style, `components.json`). For EnvForIO's look and layout, see [envforio-design.md](./envforio-design.md).

## CSS Files

| File                      | Used by                                                                              |
| ------------------------- | ------------------------------------------------------------------------------------ |
| `src/theme-variables.css` | Every window: `@theme inline` token map, `:root` (light) and `.dark` values in OKLCH |
| `src/App.css`             | Main window: Tailwind imports, desktop base styles                                   |
| `src/quick-pane.css`      | Quick pane                                                                           |
| `src/pages/duo/duo.css`   | Todo Duo windows                                                                     |

Each window's CSS imports `theme-variables.css`, so new color tokens go there: add `--color-x: var(--x)` under `@theme inline` and a value under both `:root` and `.dark`. Then use `bg-x`, `text-x`.

## Dark Mode

`ThemeProvider` (`src/components/ThemeProvider.tsx`) puts `light` or `dark` on `<html>`; `@custom-variant dark (&:is(.dark *))` makes `dark:` work. Themes are `light`, `dark`, `system`. Read and set it with `useTheme()` (`src/hooks/use-theme.ts`). Changes are emitted as `theme-changed` for the other windows.

## Desktop Base Styles (`App.css`)

- `user-select: none` on the body; text stays selectable in `input`, `textarea` and `[contenteditable]`.
- `cursor: default` everywhere; add `cursor-pointer` only to clickable things.
- `overscroll-behavior: none` on the body.
- `data-tauri-drag-region` makes an element drag the window.
- `--app-corner-radius` rounds the window; `.square-corners` sets it to 0 (`useSquareCornersEffect`).

## Components

| Folder                        | Contents                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------- |
| `src/components/ui/`          | shadcn/ui primitives plus app ones (`ledger`, `segmented`, `tag-input`, `edit-menu`, ...) |
| `src/components/layout/`      | `MainWindow`, sidebars, sidebar nav                                                       |
| `src/components/titlebar/`    | Title bar and window controls (see [cross-platform.md](./cross-platform.md))              |
| `src/components/preferences/` | Preferences dialog and panes                                                              |
| `src/pages/<feature>/`        | Page components for each feature                                                          |

Add shadcn components with `npx shadcn@latest add <name>`; they land in `src/components/ui/` and can be edited.

Merge classes with `cn()` from `@/lib/utils` and accept a `className` prop on reusable components.

## Rules

- Use semantic tokens (`bg-background`, `text-muted-foreground`), not raw colors (`bg-white`, `text-gray-900`).
- Don't hardcode separate light and dark values in components; put them in `theme-variables.css`.
- Context menus are app-drawn; see [tauri-plugins.md](./tauri-plugins.md#built-in-no-plugin).
