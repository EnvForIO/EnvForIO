## What changes

<!-- What this pull request does, in a sentence or two. Link the issue it closes: "Closes #123". -->

## Why

<!-- The problem it solves, or the reason for the change. -->

## How I checked it

<!-- What you ran and what you looked at in the app. Screenshots help for UI changes. -->

## Checklist

- [ ] `npm run check:all` passes
- [ ] Changed or added a Rust command? Ran `npm run rust:bindings` and committed `src/lib/bindings.ts`
- [ ] Changed the database? Added a new migration in `src-tauri/migrations/` (no shipped migration edited)
- [ ] New text the user sees is in `locales/en.json`
- [ ] Changed how something works? Updated `docs/userguide/userguide.md`
