# Bundle Optimization

What already keeps the app small, and the one rule to follow.

## In Place

- **Rust release profile** (`src-tauri/Cargo.toml`): `codegen-units = 1`, `lto = true`, `opt-level = "s"`, `panic = "abort"`, `strip = true`.
- **`build.removeUnusedCommands: true`** (`src-tauri/tauri.conf.json`): drops plugin commands the capabilities don't allow.
- **One lazy import per window** (`src/main.tsx`): each window loads only its own code and CSS.
- **Dev-only code** like `src/dev/browser-mock.ts` is imported behind `import.meta.env.DEV` and drops out of production builds.
- `vite.config.ts` raises `chunkSizeWarningLimit` to 600 kB.

## Rule

Import named items, never a whole library:

```typescript
// ✅ GOOD
import { Search, Settings } from 'lucide-react'

// ❌ BAD
import * as icons from 'lucide-react'
```

## Checking

`npm run build`, then look at the sizes in `dist/assets/`.
