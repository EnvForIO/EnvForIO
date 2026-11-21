# Releases

How EnvForIO is checked on every change and how a release is built.

## Continuous integration

`.github/workflows/ci.yml` runs on every push to `main` and every pull request:

- **Checks (Linux)**: `npm run check:all` on Ubuntu 24.04: type check, ESLint, ast-grep, Prettier, rustfmt, Clippy, Vitest and `cargo test`.
- **Clippy (Windows)**: `cargo clippy -- -D warnings` on Windows, so Windows-only code (`#[cfg(windows)]`) is compiled and linted too.

Run `npm run check:all` locally before pushing; it is the same gate.

## Building a release

Releases are Windows-only for now. `.github/workflows/release.yml` builds two installers and attaches them to a **draft** GitHub release:

- `EnvForIO_<version>_x64-setup.exe` (NSIS): installs for the current user, no administrator rights.
- `EnvForIO_<version>_x64_en-US.msi` (WiX): installs for all users.

### Steps

```bash
npm run release:prepare v0.2.0
```

The script checks that the working tree is clean, runs `npm run check:all`, sets the version in `package.json`, `src-tauri/Cargo.toml` and `src-tauri/tauri.conf.json`, updates the lock files, and offers to commit, tag and push. By hand it is:

```bash
# set the version in the three files, then
npm run check:all
git commit -am "chore: release v0.2.0"
git tag v0.2.0
git push origin main --tags
```

Pushing the tag starts the workflow. It stops if the tag does not match the version in `tauri.conf.json`. When it finishes, open the draft under Releases, check the installers and the notes, and publish it. The workflow can also be started from the Actions tab with a tag name.

## How users hear about a release

**Check for updates** (Preferences → General, the command palette, and an opt-in check at start-up) reads GitHub's latest-release record (`/repos/EnvForIO/EnvForIO/releases/latest`) and compares its tag with the running version (`domain/updates.rs`). So:

- A release is seen only once it is **published**: drafts are invisible, and so are releases marked as pre-release.
- The tag must be a version (`v0.2.0`); anything else is ignored.
- The app only links to the release page; users install it themselves.

The repository name is set once, in the `github_repo!` macro in `src-tauri/src/domain/mod.rs` (bug reports use it too).

## Versions

Semantic versioning; the three files above must hold the same version, and the tag is that version with a `v` in front.

## Not done yet

- **Code signing**: the installers are unsigned, so SmartScreen warns on first run. Signing needs a code-signing certificate stored as repository secrets.
- **Auto-update**: the app tells users about a release but does not install it. Installing in the app means `tauri-plugin-updater`, a signing key pair (`tauri signer generate`), the public key and an endpoint in `tauri.conf.json`, `createUpdaterArtifacts: true`, and `uploadUpdaterJson: true` in the release workflow.
- **macOS and Linux builds**: the app runs on Windows; other platforms are not built or tested.
