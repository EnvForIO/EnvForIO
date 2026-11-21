# Writing ast-grep Rules

ast-grep enforces architecture rules that ESLint can't express. Rules are YAML files in `.ast-grep/rules/`, found through `sgconfig.yml`, and run by `npm run ast:lint` (part of `check:all`). The current rules are listed in [static-analysis.md](./static-analysis.md#ast-grep-rules).

Add a rule when the same architectural mistake keeps coming back and a code pattern can catch it.

## Real Example

`.ast-grep/rules/zustand/no-destructure.yml`:

```yaml
id: no-destructure-zustand
message: |
  Never destructure from Zustand stores. Use selector syntax instead.

  BAD: const { leftSidebarVisible } = useUIStore()
  GOOD: const leftSidebarVisible = useUIStore(state => state.leftSidebarVisible)
severity: error
language: Tsx
rule:
  pattern: const { $$$PROPS } = $STORE($$$ARGS)
constraints:
  STORE:
    regex: '^use[A-Z]\w*Store$'
note: |
  See: docs/developer/state-management.md (Performance Patterns)
```

The `$STORE` metavariable with a `constraints` regex covers every store named `use…Store`, so a new store needs no rule change. Restrict a rule to paths with `files:` (see `architecture/hooks-in-hooks-dir.yml`, which applies to `src/lib/**`).

## `language` Picks the Files

`language: Tsx` checks only `.tsx` files and `language: TypeScript` only `.ts` files, whatever `sgconfig.yml` says. So every rule here is written twice, once per language, with the twin's id ending in `-ts` or `-tsx` (`no-destructure.yml` and `no-destructure-ts.yml`). Keep the pair identical apart from `id`, `language` and `files`.

## Pattern Syntax

| Syntax    | Matches            |
| --------- | ------------------ |
| `$VAR`    | One AST node       |
| `$$$ARGS` | Zero or more nodes |

## Trying a Pattern or Rule

```bash
npx ast-grep run --lang tsx --pattern 'const { $$$PROPS } = useUIStore($$$ARGS)' src/
npx ast-grep scan -r .ast-grep/rules/zustand/no-destructure.yml
```

If a rule matches nothing, check `language` against the file extension and the `files` globs first.

Reference: [pattern syntax](https://ast-grep.github.io/guide/pattern-syntax.html), [rule config](https://ast-grep.github.io/reference/yaml.html).
