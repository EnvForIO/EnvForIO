---
name: code-style
description: EnvIO's code style - how to write a single file (modelled on karpathy/nanochat) and how to split code into small modules (modelled on LokiSharp). Use whenever writing, refactoring or reviewing TypeScript or Rust code in this repo.
user-invocable: true
allowed-tools: [Read, Glob, Grep, Edit, Write]
---

# Code style

Two sources, two jobs:

| Question                                  | Follow    | Source                                                                                                                                                                |
| ----------------------------------------- | --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| How is the code inside one file written?  | nanochat  | [karpathy/nanochat](https://github.com/karpathy/nanochat): "minimal, readable, hackable", "no giant configuration objects, model factories, or if-then-else monsters" |
| How is code split into files and modules? | LokiSharp | `CatallaX` and `workerd-manager`; the layered structure in `docs/PLAN.md`                                                                                             |

Do **not** copy nanochat's long files (its training script is about 800 lines). EnvIO files stay short. Only the style is borrowed from either, no code.

## The idea

A reader should be able to open one file, read it from top to bottom once, and understand what it does and why. Files are kept small enough that this takes a few minutes, and the module layout tells the reader which file to open.

## Modules (LokiSharp)

- **Split by layer, then by resource**, as set in `docs/PLAN.md`: `api/`, `service/<resources>/`, `entity/`, `domain/`, `providers/`, `pipeline/`, `desktop/` in Rust; `api/`, `pages/`, `windows/`, `layouts/`, `components/` in TypeScript.
- **One responsibility per file.** Inside a resource, split by role the way `workerd-manager` does: `query.rs` for reads, `mutation.rs` for writes, `mod.rs` only re-exports.
- **Keep files short.** Aim for under 200 lines; past about 300 lines, split the file by role or sub-concept into a folder with a `mod.rs` (Rust) or `index.ts` (TypeScript) that re-exports. These limits are a guideline, not a hard rule; tests at the bottom of a Rust file do not count.
- **Interface plus implementations for external sources**, as `CatallaX` does with its providers: `base.rs` defines the trait and shared types, `factory.rs` picks one, each implementation is its own file.
- **Same name for a resource in every layer**: `tasks` for collections, `task` for one table.

## Writing a file (nanochat)

- **Open every file with a header comment** saying what the file is, how it is used, and anything surprising. Rust: `//!` module docs. TypeScript: a `/** ... */` block before the imports.
  ```rust
  //! Daily safety line: how many hours each project needs today.
  //!
  //! Notable rules:
  //! - only work days count (available time 0 = rest day)
  //! - targets are deadline minus buffer days, falling back to the real deadline
  //! - work is levelled across projects in 15-minute chunks
  ```
- **Order the file so it reads top to bottom:** imports, constants, types, small helpers, then the main thing. A helper used by only this file sits just above its first caller; a helper shared by several files goes into the module the layout gives it, not a catch-all `utils` file.
- **Mark sections with a divider line and a one-line heading** when a file has more than one part, the way nanochat's scripts do:
  ```rust
  // ---------------------------------------------------------------------------
  // Levelling across projects
  ```
  Use the same 77-dash divider in TypeScript.

## Flow

- **Write straight-line code.** Do step 1, then step 2, then step 3. A reader follows it like a script.
- **No speculative abstraction.** No factories, registries, builders, plugin systems or generic base types until there are at least two real implementations. A trait or interface is fine when there are genuinely several implementations today (the monitor providers: local, WSL, SSH).
- **No if-else monsters.** If a function grows branches for many modes, the modes are probably different functions.
- **Plain data over objects.** Prefer a plain struct / type plus functions over a class with hidden state.
- **One dial instead of many knobs.** When a setting can be derived from another, derive it instead of exposing it. nanochat sets every hyperparameter from `--depth`; EnvIO should derive defaults (rest days, targets, chunk sizes) rather than ask the user for them.
- **Small typed config.** When configuration is needed, use one small typed struct with documented defaults, not a nested config object.

## Comments

- **Explain why and give intuition**, not what the next line does. Good: `// freeze today's line so finishing work does not lower it`. Bad: `// set x to 0`.
- **Short end-of-line comments for units, shapes and ranges:** `minutes: u32, // 15-minute chunks`, `ratio: f64, // actual / estimated, > 1 means slower`.
- **Be honest about rough edges.** `// NOTE:` for footguns, `// TODO:` for known gaps, with the reason. nanochat writes things like "NOTE a major footgun" and "TODO think through better"; that is better than hiding it.
- **Cite the source** when logic comes from somewhere (a paper, a spec, a reference app's behaviour): put the link or name in a comment.
- Keep commented-out code out of commits.

## Names

- Short names are fine where the domain already has them and the scope is small: `id`, `n`, `i`, `dt`, `cpu`, `gpu`. Elsewhere use full words.
- Name things after the domain, not the pattern: `safety_line`, `work_days`, not `CalculationManager` or `DataHelper`.

## Checks and errors

- **State invariants with assertions.** Rust: `debug_assert!` for internal invariants, `assert!` when continuing would corrupt data. TypeScript: throw early when an impossible state is reached.
- **Fail loudly at boundaries.** Return a typed error (`errors.rs`) from commands; do not swallow errors or return silent defaults.
- **Detect once, then reuse.** Facts about the environment (platform, GPU present, WSL available) are detected once at startup and stored, with the reason they were chosen, as nanochat does for its compute dtype.

## Dependencies

- Add a dependency only when it saves real work and is mature (see the library table in `docs/PLAN.md`). A few lines of our own code beat a package for a one-liner.

## Tests

- Tests live next to the code for Rust (`#[cfg(test)] mod tests` at the bottom of the file) and in `*.test.ts` files beside the source for TypeScript, as the template already does.
- Pure logic in `domain/` always gets tests; they double as worked examples of the rules.

## When reviewing

Ask of each changed file:

1. Is the file in the right layer and resource, and is it short? If it passed about 300 lines, split it by role.
1. Does the header comment still describe the file?
1. Can it be read top to bottom without jumping around?
1. Is there an abstraction with only one implementation? Remove it.
1. Is there a knob that could be derived? Derive it.
1. Do the comments explain why, and are rough edges marked honestly?
