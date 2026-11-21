# Static Analysis

`npm run check:all` must pass before a commit; CI runs it on Linux (`.github/workflows/ci.yml`). `npm run fix:all` fixes what can be fixed automatically (ESLint, Prettier, cargo fmt, Clippy).

| Tool       | Checks                              | Command                  | In `check:all` | Config                             |
| ---------- | ----------------------------------- | ------------------------ | -------------- | ---------------------------------- |
| TypeScript | Types                               | `npm run typecheck`      | Yes            | `tsconfig.json`                    |
| ESLint     | TS/React rules, React Compiler rule | `npm run lint`           | Yes            | `eslint.config.js`                 |
| ast-grep   | Architecture rules                  | `npm run ast:lint`       | Yes            | `sgconfig.yml`, `.ast-grep/rules/` |
| Prettier   | Formatting                          | `npm run format:check`   | Yes            | `prettier.config.js`               |
| cargo fmt  | Rust formatting                     | `npm run rust:fmt:check` | Yes            |                                    |
| Clippy     | Rust lints (`-D warnings`)          | `npm run rust:clippy`    | Yes            |                                    |
| Vitest     | Frontend tests                      | `npm run test:run`       | Yes            | `vitest.config.ts`                 |
| cargo test | Rust tests                          | `npm run rust:test`      | Yes            |                                    |
| knip       | Unused files, exports, dependencies | `npm run knip`           | No             | `knip.json`                        |
| jscpd      | Duplicated code                     | `npm run jscpd`          | No             | `.jscpd.json`                      |

## ast-grep Rules

| Rule                                  | Enforces                                       |
| ------------------------------------- | ---------------------------------------------- |
| `zustand/no-destructure.yml`          | Select from `useUIStore`, don't destructure    |
| `architecture/hooks-in-hooks-dir.yml` | No `use*` hooks exported from `src/lib/`       |
| `architecture/no-store-in-lib.yml`    | `src/lib/` reads stores only with `getState()` |

To add one, see [writing-ast-grep-rules.md](./writing-ast-grep-rules.md).

## React Compiler

The compiler runs at build time (`vite.config.ts`) and memoizes for you, so don't add `useMemo`, `useCallback` or `React.memo` by hand. ESLint's `react-compiler/react-compiler` rule reports code it cannot compile.

## knip and jscpd

Run them now and then, not on every commit. The `cleanup` skill (`.claude/skills/cleanup/`, `/cleanup` in Claude Code) walks through their findings.
