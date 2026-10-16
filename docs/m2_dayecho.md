# Phase 2: DayEcho parity

Started 2026-11-19. The checklist is in `docs/PLAN.md`; the safety line rules are in its "Safety line algorithm" section. This note records how the phase is built.

## Steps

Each step ends with a Windows build the user tries before the next one starts.

| Step | Contents                                                                                              | PLAN items                                                   |
| ---- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------ |
| 1    | Projects and modules; tasks get a project, a module and an estimate                                   | Projects, Breakdown                                          |
| 2    | Available time per weekday and per date                                                               | Available time                                               |
| 3    | Safety line engine in `domain/`, frozen each morning, shown in My Day and on projects                 | Daily safety line                                            |
| 4    | Month and week calendar, drag to schedule, right-click a day                                          | Calendar                                                     |
| 5    | Today view (to do, to schedule, a line for today); quick capture with time parsing; item list filters | Today, Task pool and quick capture, Item list                |
| 6    | Timer and actual time; partial completion                                                             | Timer, Partial completion                                    |
| 7    | Estimate calibration, 14-day load forecast, check-ins and streaks, day rollover setting               | Estimate calibration, Load forecast, Check-ins, Day rollover |
| 8    | Stats                                                                                                 | Stats                                                        |
| 9    | Export, yearly review, undo; light / dark is already there                                            | Export, Yearly review, Undo                                  |

Project templates (paper submission and so on) come with step 1 as a few built-in module lists; conference-specific templates stay in Phase 4.

## Step 1: projects and modules

- Migration `0002_projects.sql`: `projects` (name, colour, start date, deadline, buffer days, archived) and `modules` (sections in a project). SQLite cannot add a foreign key to the existing `tasks.project_id`, so the service keeps it consistent: deleting a project deletes its tasks; deleting a module moves its tasks to the project's ungrouped section.
- Estimates are typed as text (`45m`, `2h`, `1h30m`, `1.5h`) and parsed in Rust (`domain/duration.rs`); the UI only formats minutes for display.
- Built-in templates (`service/projects/templates.rs`): blank, paper, grant, thesis. Module names are English constants; template names are translated in the UI.
- `Project.planDate` (deadline minus buffer days) is computed in SQL so the UI does no date arithmetic.
- UI: a Projects section in the sidebar with a + button; a project page with dates, progress (tasks and estimated time), modules (double-click to rename) and an add row per module that takes a title and an estimate; the details pane gained an estimate field.

## Steps 2 and 3: available time and the safety line

Done together, since available time only matters through the line.

- Migration `0003_capacity.sql`: `weekday_capacity` (Monday = 0) and `day_overrides`. No row = no limit and still a work day; 0 = rest day. Weekdays are set in Preferences > Planning; per-date overrides have a backend and get their UI with the calendar (step 4).
- `domain/safety_line.rs` implements the documented rules as one pure function with worked-example tests in `safety_line_tests.rs`. Levelling is on and earliest-first is off; the switches get a UI in step 7.
- Today's line is computed from the work left at the start of the day (tasks finished today still count as remaining), which gives the "frozen in the morning" behaviour without a table: finishing work does not lower it, changing the plan does. Storing each day's line for the next-day comparison comes with check-ins (step 7).
- Projects without a deadline have no line.
- UI: a safety line card at the top of My Day (total, done, per project), and "Today: X (Y done)" on each project page.
