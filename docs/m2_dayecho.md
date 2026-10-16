# Phase 2: DayEcho parity

Started 2026-11-19. The checklist is in `docs/PLAN.md`; the safety line rules are in its "Safety line algorithm" section. This note records how the phase is built.

## Steps

Each step ends with a Windows build the user tries before the next one starts.

| Step | Contents | PLAN items |
| --- | --- | --- |
| 1 | Projects and modules; tasks get a project, a module and an estimate | Projects, Breakdown |
| 2 | Available time per weekday and per date | Available time |
| 3 | Safety line engine in `domain/`, frozen each morning, shown in My Day and on projects | Daily safety line |
| 4 | Month and week calendar, drag to schedule, right-click a day | Calendar |
| 5 | Today view (to do, to schedule, a line for today); quick capture with time parsing; item list filters | Today, Task pool and quick capture, Item list |
| 6 | Timer and actual time; partial completion | Timer, Partial completion |
| 7 | Estimate calibration, 14-day load forecast, check-ins and streaks, day rollover setting | Estimate calibration, Load forecast, Check-ins, Day rollover |
| 8 | Stats | Stats |
| 9 | Export, yearly review, undo; light / dark is already there | Export, Yearly review, Undo |

Project templates (paper submission and so on) come with step 1 as a few built-in module lists; conference-specific templates stay in Phase 4.

## Step 1: projects and modules

- Migration `0002_projects.sql`: `projects` (name, colour, start date, deadline, buffer days, archived) and `modules` (sections in a project). SQLite cannot add a foreign key to the existing `tasks.project_id`, so the service keeps it consistent: deleting a project deletes its tasks; deleting a module moves its tasks to the project's ungrouped section.
- Estimates are typed as text (`45m`, `2h`, `1h30m`, `1.5h`) and parsed in Rust (`domain/duration.rs`); the UI only formats minutes for display.
