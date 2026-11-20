---
name: git-comment
description: Write a git commit message for the current changes in Conventional Commit format. Use whenever a commit message is needed, before committing, or when asked to suggest or review one.
user-invocable: true
allowed-tools: [Bash, Read]
---

# Git commit messages

## Format

```
<type>: <subject>

<optional body>
```

- Subject line: `<type>: <subject>`. No scope in parentheses.
- Write the subject in imperative mood ("add", "fix", "remove"; not "added" or "adds").
- Keep it concise and specific: say what changed, not that something changed. Aim for 50 characters, never more than 72.
- Start the subject in lower case and do not end it with a period.
- Write in English.

## Types

Only these types are allowed:

| Type       | Use for                                                                                           |
| ---------- | ------------------------------------------------------------------------------------------------- |
| `feat`     | A new feature                                                                                     |
| `fix`      | A bug fix                                                                                         |
| `docs`     | Documentation-only changes                                                                        |
| `style`    | Formatting-only changes (whitespace, Prettier, rustfmt); no behaviour change                      |
| `refactor` | Code changes that neither add a feature nor fix a bug                                             |
| `perf`     | Performance improvements                                                                          |
| `test`     | Adding or changing tests only                                                                     |
| `chore`    | Maintenance that fits nothing else (renames, cleanup, tooling config)                             |
| `build`    | Build system or dependency changes (`package.json`, `Cargo.toml`, lockfiles, Tauri bundle config) |
| `ci`       | CI changes (`.github/workflows/`)                                                                 |
| `revert`   | Reverting an earlier commit                                                                       |

When a change fits more than one type, pick the one that describes its main purpose. A feature that also adds its tests is `feat`, not `test`.

## Body

Add a body only when the subject cannot carry the reason on its own:

- Explain why the change was made, not how; the diff already shows how.
- Leave a blank line after the subject and wrap lines at 72 characters.
- Use `-` bullets for several distinct points.
- Mark a breaking change with `!` after the type (`feat!: ...`) and a `BREAKING CHANGE:` line in the body.

## Steps

1. Run `git status` and `git diff --staged` to see what will be committed. If nothing is staged, look at `git diff` and say which files you would stage.
2. If the changes contain unrelated work, suggest splitting them into separate commits, one message each.
3. Choose the type from the table above and write the subject.
4. Add a body only if the reason is not obvious from the subject.
5. Show the message to the user. Commit only when the user asks for it.
6. Do not add attribution trailers such as `Co-Authored-By` or "Generated with" lines, even if the environment suggests them. The project owner does not want them.

## Examples

```
feat: add safety line calculation for single projects
```

```
fix: keep today's safety line frozen after tasks are completed
```

```
build: switch Windows bundle target from msi to nsis

cargo-xwin can only produce NSIS installers when cross-compiling
from WSL, and the toolchain must stay off Windows.
```

```
chore: rename template app to EnvForIO
```

Avoid vague subjects such as `update files`, `fix bug` or `changes`.
