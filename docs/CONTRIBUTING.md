# Contributing to EnvForIO

Thanks for helping. Bug reports, ideas and pull requests are all welcome; for anything larger than a small fix, open an issue first so we can agree on the approach before you spend time on it.

## Set up

You need [Node.js](https://nodejs.org/) 20 or later, [Rust](https://rustup.rs/) stable, and the [Tauri prerequisites](https://tauri.app/start/prerequisites/) for your system. The minimum supported Rust version is declared by `rust-version` in [src-tauri/Cargo.toml](../src-tauri/Cargo.toml).

```bash
git clone <this repository>
cd EnvForIO
npm install
npm run tauri:dev     # run the app
npm run check:all     # the full quality gate
```

EnvForIO ships for **Windows**. You can develop on Windows directly (Rust with the MSVC toolchain, the Microsoft C++ Build Tools; WebView2 comes with Windows 11), or, as the maintainers do, keep every toolchain in WSL and cross-compile the Windows build with `cargo-xwin`:

```bash
npm run tauri build -- --runner cargo-xwin --target x86_64-pc-windows-msvc --no-bundle
```

For that setup you need, inside WSL: the Tauri Linux dependencies, `nsis`, `lld`, `clang`, the Rust target `x86_64-pc-windows-msvc` and `cargo-xwin` (if `cargo-xwin` is not found, `~/.cargo/bin` is not on your PATH). Copy the exe from `src-tauri/target/x86_64-pc-windows-msvc/release/` to Windows to run it. `lld-link: Cannot use debug info … [LNK4099]` warnings are harmless. The [design notes](developer/envforio-design.md#development-environment) say more. On Linux, `npm run tauri:dev` opens the app too, but only Windows is tested.

## Where things are

- `src-tauri/src/`: all business logic and the SQLite database, in Rust.
- `src/`: the React frontend, which only displays and calls Rust commands.
- `locales/en.json`: every string the user sees.
- `docs/developer/envforio-design.md`: the lasting decisions; read it before a larger change. The rest of `docs/developer/` covers individual patterns.
- `docs/userguide/userguide.md`: the user guide; update it when behaviour changes.

## Rules of thumb

- **Rust commands**: after adding or changing a `#[tauri::command]`, run `npm run rust:bindings` to regenerate `src/lib/bindings.ts`, and commit it.
- **Database**: schema changes are new numbered files in `src-tauri/migrations/`, listed in `src-tauri/src/db/mod.rs`. Never edit a migration that has shipped.
- **Text**: put user-facing strings in `locales/en.json`, not in components.
- **Tests**: Rust logic gets tests next to the code; frontend helpers get Vitest tests.
- **npm only**: the project uses npm, not pnpm or yarn.

## Before a pull request

1. `npm run check:all` passes: type check, ESLint, ast-grep, Prettier, rustfmt, Clippy, Vitest and `cargo test`. CI runs the same, plus Clippy on Windows.
2. Commits follow [Conventional Commits](https://www.conventionalcommits.org/) (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`, `chore:`, `ci:`), with a body that says why.
3. The pull request says what changed and how you checked it; screenshots help for UI changes.

Keep pull requests focused: one change each.

## Security issues

Do not open a public issue; see [SECURITY.md](SECURITY.md).

## Licence

EnvForIO is licensed under the [GNU General Public License v3.0 or later](../LICENSE). By contributing, you agree that your contributions are licensed under the same terms.
