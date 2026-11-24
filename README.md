# EnvForIO

A desktop workspace for researchers. EnvForIO keeps your tasks, your paper deadlines, your research ideas and the machines your experiments run on in one Windows app, and works out each morning how much you need to do today to make every deadline.

Everything stays on your computer: one local database, no account, no telemetry.

## What it does

- **Tasks and My Day**: tasks with a day to work on them and a deadline, subtasks, estimates, a timer, quick capture from anywhere (Ctrl+Shift+.), and a small sticky (Todo Duo) the window can shrink into.
- **Projects and the safety line**: projects for conference and journal papers, proposals, grants and theses, split into phases with budgets. Each morning the safety line spreads the remaining work over your available hours, shows whether every phase is on track, and turns red when a deadline is out of reach.
- **Conference deadlines**: pick a conference and round from [ccfddl](https://github.com/ccfddl/ccf-deadlines)'s list; the paper and abstract deadlines arrive in your local time, and you are told if they move.
- **Research**: ideas from spark to submission, with checklists, todos, Markdown and LaTeX notes, problems and a log; a paper library that looks up DOIs and arXiv ids and copies BibTeX.
- **Calendar**: month and week views, drag tasks onto days, subscribe to Outlook or other ICS calendars, export to CSV or ICS.
- **Reader**: RSS and Atom feeds; turn an article into a reading task.
- **Monitor**: CPU, memory, drives and NVIDIA GPUs for this PC, WSL distributions and servers in your SSH config, including who is running what on each GPU.
- **Stats**: time per project, completion trends, a yearly heatmap and a year-in-review card.

The [user guide](docs/userguide/userguide.md) explains every part.

## Install

EnvForIO is built and tested on Windows 11; Windows 10 should work but is not tested. Download the latest installer from the Releases page:

- `EnvForIO_<version>_x64-setup.exe` installs for your account, without administrator rights.
- `EnvForIO_<version>_x64_en-US.msi` installs for every user on the machine.

The installers are not code-signed yet, so Windows SmartScreen may warn the first time: choose **More info**, then **Run anyway**. EnvForIO does not update itself: **Check for updates** (Preferences → General) tells you when a newer release is out and links to it, and you install it over the old one. Your data (in `%APPDATA%\io.github.envforio`) is kept.

## Build from source

You need Node.js 20 or later, Rust stable and the [Tauri prerequisites](https://tauri.app/start/prerequisites/). The minimum supported Rust version is declared by `rust-version` in [src-tauri/Cargo.toml](src-tauri/Cargo.toml).

```bash
npm install
npm run tauri:dev     # run the app
npm run check:all     # type check, lint, format, Clippy and all tests
npm run tauri:build   # build the installers
```

The stack is Tauri 2, React, TypeScript and Tailwind CSS; all logic and the SQLite database live in Rust. [CONTRIBUTING.md](docs/CONTRIBUTING.md) covers the setup (including building the Windows app from WSL), the layout of the code and how to send a change; [envforio-design.md](docs/developer/envforio-design.md) records the design decisions.

## Licence

EnvForIO is free software under the [GNU General Public License v3.0 or later](LICENSE). You may use, study, share and change it; if you distribute a changed version, you must share its source under the same licence.

## Credits

Started from [dannysmith/tauri-template](https://github.com/dannysmith/tauri-template) (MIT). Conference deadlines come from [ccfddl/ccf-deadlines](https://github.com/ccfddl/ccf-deadlines) (MIT). Notices for material included under other licences are in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).
