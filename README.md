# EnvForIO

A desktop app for researchers: tasks, deadline planning, research ideas and machine monitoring, in one place. Windows first; macOS later.

Status: phases 0–4 are built. How to use it is in the [user guide](docs/userguide/userguide.md); the design decisions are in [envforio-design.md](docs/developer/envforio-design.md).

## Stack

Tauri 2, React, TypeScript, Vite, Tailwind CSS, shadcn/ui. All business logic and the SQLite database live in Rust; the frontend only displays.

## Development

All toolchains run inside WSL (Ubuntu 24.04). Nothing is installed on the Windows side.

```bash
npm install
npm run tauri:dev     # run the app (WSLg window)
npm run check:all     # type check, lint, format, Rust checks and tests
```

Developer documentation from the starter template is in [docs/developer/](docs/developer/).

## License

EnvForIO is free software under the [GNU General Public License v3.0 or later](LICENSE). You may use, study, share and change it; if you distribute a changed version, you must share its source under the same licence.

## Credits

Started from [dannysmith/tauri-template](https://github.com/dannysmith/tauri-template) (MIT). Its notice, and those of the other material included under other licences, are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
