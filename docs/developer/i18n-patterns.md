# Internationalization (i18n)

All user-facing strings, including the native menu, come from `locales/en.json` through react-i18next. EnvForIO ships English only.

## Files

| File                        | Role                                                                                 |
| --------------------------- | ------------------------------------------------------------------------------------ |
| `locales/en.json`           | Every string, flat dotted keys (`"menu.quit": "Quit {{appName}}"`)                   |
| `src/i18n/config.ts`        | i18next setup, `resources`, `availableLanguages`                                     |
| `src/i18n/language-init.ts` | Picks the language: saved preference, then system locale (`plugin-os`), then English |
| `src/i18n/i18n.d.ts`        | Declares `en.json` as the resource type                                              |

## Using Strings

```typescript
const { t } = useTranslation()
t('preferences.title')
t('menu.about', { appName: 'EnvForIO' }) // interpolation
t('plans.streak', { count }) // plurals: plans.streak_one / plans.streak_other
```

Outside React (menu, toasts in `src/lib/`), use `i18n.t(...)` from `@/i18n/config`; see `src/lib/updates.ts`.

## Keys

- Prefix by feature: `preferences.*`, `tasks.*`, `commands.*`, `menu.*`, `common.*` for shared words.
- camelCase segments: `preferences.general.keyboardShortcuts`.
- Commands use `commands.<id>.label` and `commands.<id>.description`.

## Other Languages

Not shipped. To add one: create `locales/<code>.json` and register it in `resources` in `config.ts`; the Preferences language list and locale detection read `resources`. `config.ts` already sets `dir="rtl"` on `<html>` for `ar`, `he`, `fa`, `ur`, but the layout has not been checked in RTL.
