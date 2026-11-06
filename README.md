# EnvIO

A desktop app for researchers: tasks, deadline planning, research ideas and machine monitoring, in one place. Windows first; macOS later.

Status: phases 0–4 are built. How to use it is in the [user guide](docs/userguide/userguide.md); the design decisions are in [envio-design.md](docs/developer/envio-design.md).

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

## Credits

Started from [dannysmith/tauri-template](https://github.com/dannysmith/tauri-template) (MIT). Its license notice is kept in [LICENSE.md](LICENSE.md).
