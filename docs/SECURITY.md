# Security policy

## Supported versions

Only the latest release gets security fixes.

## Reporting a vulnerability

Please do not report security problems in public issues. Use GitHub's private vulnerability reporting instead: on the repository's **Security** tab, choose **Report a vulnerability**. Only the maintainers see the report.

Include what you found, how to reproduce it, and what an attacker could do with it. We aim to reply within a week, agree on a fix and a timeline with you, and credit you in the release notes unless you would rather not be named.

## What EnvForIO touches

Useful context when looking for problems:

- **Local data**: everything is stored in a SQLite database in `%APPDATA%\io.github.envforio`. There is no telemetry and no server run by the project.
- **Network**: the app fetches feeds you subscribe to, calendar (ICS) links you add, the ccfddl conference list, and, when you ask or have turned on the start-up check, GitHub's latest-release record for this repository. Nothing is downloaded or installed from it. Feed and calendar content is shown as text, never inserted as HTML.
- **Remote machines**: the Monitor connects to servers you add through your system's `ssh` in batch mode, with your own SSH configuration and keys; it never asks for or stores a password.
- **Tauri**: each window gets only the permissions listed in `src-tauri/capabilities/`, and the content security policy is set in `src-tauri/tauri.conf.json`.
