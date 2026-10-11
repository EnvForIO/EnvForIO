# Phase 0: toolchain check

Goal: prove that a Windows build can be produced entirely inside WSL, with no toolchain on Windows, and that the window behaviours EnvIO depends on work.

Run on 2026-11-19.

## Probe app

A throwaway app outside this repo, at `~/.cache/envio-phase0/probe`, created with the official scaffold so that a failure would point at the environment, not at the template:

```bash
npm create tauri-app@latest probe -- --template vanilla-ts --manager npm --yes
```

Changes from the scaffold:

- `tauri.conf.json`: one 380×160 window with `transparent: true`, `decorations: false`, `shadow: false`, `resizable: false`; bundle target `nsis`.
- `capabilities/default.json`: `core:default`, `core:window:allow-start-dragging`, `core:window:allow-close`.
- Page: transparent `html`/`body`, a half-transparent rounded card marked `data-tauri-drag-region`, and a Close button calling `getCurrentWindow().close()`.

## Build

```bash
npm run tauri build -- --runner cargo-xwin --target x86_64-pc-windows-msvc
```

Result:

- `probe.exe`, 4.3 MB, built in about 1 min 40 s on the first run.
- NSIS installer `envio-probe_0.1.0_x64-setup.exe`, 1.5 MB.
- The exe ran on Windows 11 with its window titled "EnvIO probe", using about 31 MB of memory at start.

## Problems hit

| Problem                                                       | Cause                                                                             | Fix                                                      |
| ------------------------------------------------------------- | --------------------------------------------------------------------------------- | -------------------------------------------------------- |
| `cargo-xwin command not found`                                | It was installed to `~/.cargo/bin`, which is not on PATH (rustup comes from snap) | `ln -sf ~/.cargo/bin/cargo-xwin ~/.local/bin/cargo-xwin` |
| Many `lld-link: Cannot use debug info ... [LNK4099]` warnings | The MSVC runtime libraries reference PDB files that are not shipped               | Harmless; the build succeeds                             |
| "Signing ... skipping" warnings                               | Code signing only runs on Windows hosts                                           | Fine for local use; releases can sign in CI              |

`clang-cl` was not needed for this probe. It may still be needed once C dependencies such as SQLite are added.

## Running on Windows

Copy the exe out of WSL and start it, for example:

```powershell
Copy-Item "\\wsl.localhost\Ubuntu-24.04\home\<you>\.cache\envio-phase0\probe\src-tauri\target\x86_64-pc-windows-msvc\release\probe.exe" "$env:TEMP\envio-probe.exe"
Start-Process "$env:TEMP\envio-probe.exe"
```

## Checklist

- [x] Cross-compile a Windows exe in WSL and run it on this machine
- [x] Transparent, frameless, draggable window (confirmed by eye on Windows 11; Close works)

Phase 0 passed: the "no toolchain on Windows" premise holds.
