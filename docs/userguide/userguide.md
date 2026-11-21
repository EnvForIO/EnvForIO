# EnvForIO User Guide

EnvForIO is a desktop app for researchers. It covers tasks, planning back from deadlines, research ideas and papers, conference deadlines, calendars, a feed reader, and monitoring of your machines and GPU servers. It runs on Windows. Everything is stored locally in `%APPDATA%\io.github.envforio\envio.db`.

## Getting around

The left sidebar has the task lists (My Day, Important, Tasks) and Calendar; Research (with its Overview, Ideas and Library tabs); then Reader, Monitor and Stats. Your projects are listed below them.

Clicking a task opens its details on the right. Closing the window hides EnvForIO to the tray; to quit, use the tray menu's **Quit EnvForIO**. Preferences → General → **Launch at login** starts EnvForIO hidden in the tray when you sign in.

| Shortcut     | Action                                                                        |
| ------------ | ----------------------------------------------------------------------------- |
| Ctrl+K       | Command palette                                                               |
| Ctrl+,       | Preferences                                                                   |
| Ctrl+1       | Show or hide the left sidebar                                                 |
| Ctrl+2       | Show or hide the details pane                                                 |
| Ctrl+Z       | Undo the last task change (outside text boxes)                                |
| Ctrl+Shift+. | Quick pane: type a task into My Day from anywhere (changeable in Preferences) |

Right-clicking empty space does nothing. In text boxes, or on selected text, right-click still gives cut, copy and paste.

## Tasks

- **My Day**: what you are doing today. It holds the tasks planned for today, the tasks due today, and overdue tasks that are still open. At the top are today's safety line and a line of note for the day. At the bottom, **To schedule** lists open tasks with no day to do them on.
- **Two dates per task**: **Do on** is the day you plan to work on it, **Due** is its deadline. A task shows on both days everywhere: My Day, Todo Duo, the calendar and the heatmap. "Add to My Day" sets **Do on** to today. A task you planned for a day and did not finish goes back to **To schedule** the next day; it does not move to today by itself.
- **Important**: flagged tasks.
- **Tasks**: every task that is not in a project. Filters at the top narrow it down:
  - **All** (the default), **With deadline** (open tasks with a due date, soonest first) or **Done** (most recent first).
  - The project picker: **Not in a project** (the default), **All projects**, or one project.
- **Order**: drag a task up or down to reorder My Day, Important, Tasks (under **All**) or a project module. **With deadline** and **Done** are sorted by date. Ctrl+Z undoes it.
- **Quick capture**: start a title with a time and it becomes the task's time slot. Examples: `14:00-15:00 group meeting`, `9:30 call`.
- **Details pane**: title, subtasks, timer, My Day, flag, pin, the Do on and Due dates, estimate (`45m`, `1h30m`, `1.5h`) and note. A task that came from an idea shows **Todo of idea …**; click it to open the idea.
- **Subtasks**: break a task into smaller ones under **Subtasks** in the details pane, with an optional estimate. A subtask is a full task: click it to give it its own Do on and Due dates, estimate or timer, and **Subtask of …** takes you back to the parent. Subtasks go one level deep, and have no pin: they keep their place under the parent.
  - In lists they sit under their parent, indented; the chevron folds them. A subtask that is in a list without its parent (planned for today, say, in My Day) shows the parent's name.
  - Finishing the parent finishes its open subtasks. Deleting it deletes them.
  - **Time**: the parent's estimate is a budget, like a phase's. Subtasks with an estimate count their own; those without share what is left of the parent's. A subtask with no dates of its own follows the parent's, and is not listed in **To schedule** (its parent is). A parent with no estimate counts its subtasks' total.
- **Timer**: the play button on a task row starts it (starting another stops the first). Stopping adds the time to the task. **Did part of it** finishes the part you did and moves the rest to the next work day.
- **Task menu**: right-click a task (in a list, a project or its board) to open it, add it to My Day, flag, pin or finish it, or delete it (with its subtasks).
- **Undo**: Ctrl+Z, or the Undo button that appears after deleting a task. It keeps the last 50 changes until EnvForIO closes.

## Todo Duo (mini mode)

The float button in the title bar (or **Mini mode** in the tray menu) shrinks EnvForIO into a small sticky: a capsule with today's progress and a pin, and a card under it. Drag either one to move both. The capsule's expand button, or a click on the tray icon, brings the window back.

The card has two tabs:

- **Todo**: the day's tasks, with an add box that plans the new task for that day.
- **Month**: the month calendar.
  - **Shading**: how full each day is, comparing the time of the tasks scheduled on it with the time you have that day. Blue means room left, yellow nearly full, red over (or work planned on a rest day).
  - **Dots**: deadlines that day (projects and tasks due, so a conference project's deadline and abstract too).
  - **Click** a day to list it below and to set the Todo tab to it.
  - **Double-click** a day to open the main calendar there.

Preferences → Appearance sets the sticky's material, font and text size.

## Projects and the safety line

- **Project menu**: right-click a project in the sidebar to open, edit or delete it. Deleting asks first and removes the project's tasks too.
- **New project** (the + next to Projects): template, name, colour, start date, deadline, **Finish early** days, and the project's phases.
  - **Conference paper**: type the conference's name and pick one of its open rounds. The list comes from ccfddl's open list of computer-science conference deadlines (CCF ranks included); it is downloaded the first time and again when it is a week old. Picking a round sets the name and the deadline (the paper deadline, in your local time), and the abstract deadline becomes a task. A conference that is not on the list: leave it out and set the deadline yourself.
  - **Journal paper**: the same phases; the deadline is optional.
  - **Proposal (开题)**: literature review until −30 days, proposal until −7, presentation until the deadline.
  - **Grant** and **Thesis**: start with their modules, without dates.
  - **Blank**: starts empty.
- **Phases**: a module with an end date is a phase. A paper's phases are experiments until 21 days before the deadline, writing until 7 days before, and revise and submit until the deadline. The dialog shows them with their dates; change, add or remove them before creating. On the project page, each module has its end date and budget next to its name.
  - The safety line plans a phase's tasks between the end of the phase before it and its own end, so experiments are not spread over the writing weeks.
  - A **budget** (e.g. `40h`) is the time you expect the phase to take. Its tasks without an estimate share what the estimated ones leave of it, and a phase with no tasks yet counts its whole budget until it ends. So you can plan before every task is estimated.
- **Project page**: dates, progress, today's share of the safety line and a health badge. A conference project also shows its round: a countdown to the paper deadline, the abstract and paper deadlines in your local time (the conference's own time zone on hover) and the website. If ccfddl later moves the deadline, the page says so; **Use the new deadline** updates the project (it never changes by itself). The switch at the top right toggles between two views:
  - **Health**: the worst phase decides it, and the badge says which ("needs 12h a day for phase Method, ending Sun, Nov 22"). **On track**, **Tight** (needs over 80% of your available time), **Behind** (needs more than your available time or more than 24 hours a day, or a phase ended with work left), **Overdue** (past the deadline), **Done**, **Not estimated** (no tasks, or open tasks without estimates or budgets), or **Daily time not set** (EnvForIO cannot judge until you set your available time; **Set daily time** opens it).
  - **List**: tasks grouped by module, each with an add row that takes a title and an estimate.
  - **Board**: To do / Doing / Done. Drag cards between the columns. Starting a task's timer moves it to Doing. Moving a card to Done completes it, and moving a card back to To do stops its timer.
- **Available time**: set per weekday in Preferences → Planning (0 = rest day). On the calendar, right-click a day to change it for that date only.
- **Safety line**: each morning EnvForIO works out how much of each project's estimated work to do today, so that each phase finishes by its end and the rest by the plan date (the deadline minus the finish-early days). It spreads the work over your work days.
  - A task's own dates come first: a task with **Do on** today or later is asked for on that day, and a task **Due** before its phase or project ends is planned up to its due date. A **Do on** day that passed with the task unfinished no longer counts.
  - My Day shows the line, your streak, yesterday's shortfall and a 14-day load forecast with each day's hours. When today asks more than your available time (or more than 24 hours), the line turns red and lists the projects and phases causing it.
  - Phases that end on the same day share their days.
  - Estimates are adjusted by how long tasks really take once you have timed a few.
  - Preferences → Planning sets the day start, levelling, and "earliest deadline first". A new day starts at midnight; if you often work past midnight, set the day start later (04:00, say) and that late work counts for the day before.

## Calendar

- **Views**: month or week, with **To schedule** on the right.
- **Scheduling**: drag a task onto a day to plan it for that day, or back onto **To schedule** to take its day away. A task also shows on its due day, with a due marker.
- **Day dialog**: double-click or right-click a day to add a task, write the day's note, or set its available time.
- **Export**: writes the month or week on screen as CSV (for Excel) or ICS. Project pages export the same way.
- **Calendars**: subscribes to read-only calendars from ICS links, such as Outlook / Office 365 or a course timetable.
  - In Outlook, go to Settings → Calendar → Shared calendars → **Publish a calendar**, then copy the ICS link.
  - Events show in their calendar's colour above the tasks; hover for the time and place.
  - Calendars are downloaded when EnvForIO starts and every hour. Each one can be hidden, removed, or refreshed now.
  - The links stay on your computer.

## Stats

- **Stats**: week, month or year, covering:
  - tasks done, time tracked, completion rate and active days
  - a trend chart
  - time per project
  - your weekly rhythm
  - the completion heatmap and project progress

  In Year view, **Year in review** saves a share card as an image.

## Research

One sidebar entry with three tabs: **Overview**, **Ideas** and **Library**.

- **Overview**: these sections:
  - counts of unfinished ideas, open todos, open problems and papers to read
  - ideas by status, and the ideas in progress
  - upcoming deadlines from ideas, projects, tasks, and ideas' target conferences (the next open round; once that edition has a project, the project's deadline stands for it)
  - open todos and problems

  **Export JSON** saves all ideas and papers to one file.

- **Ideas**: each idea has a status (Spark → Researching → In progress → Writing → Submitted → Done, or On hold or Dropped), a priority, a pin, tags, a target venue and a deadline.
  - **Filters**: by status, pinned or tag.
  - **Inside an idea**:
    - **Progress**: an 8-step checklist and links.
    - **Todos**: tasks with optional due dates. They are real tasks, so they show in My Day, Tasks (with deadline, all projects), the calendar and the heatmap.
    - **Notes**: Markdown with LaTeX.
    - **Problems**: each with its solution.
    - **Log**: dated entries.
    - **Papers**: papers from the library attached to the idea.
  - **Project link**: link an idea to a project and its todos become that project's tasks, so they count toward its safety line once estimated.
  - **Target conference**: if the idea's venue is a conference on ccfddl's list (for example MICCAI), the idea shows its next deadline. **Plan submission** opens the new-project dialog for that round; the project it makes is linked to the idea. This is also how to keep an eye on a conference you have not committed to yet.
- **Library**: paste a DOI or an arXiv id or link and the details are looked up online. Anything else becomes a paper with that title. Each paper has a reading status, notes and a BibTeX copy button, and lists the ideas using it. PDFs stay in your reference manager (Zotero).

## Reader

Paste the address of an RSS or Atom feed, or just a site (for example `quantamagazine.org`), and press Enter. Feeds refresh when EnvForIO starts and every three hours.

- **Article list**: articles appear newest first with cover images. Show All or Unread, and mark everything read.
- **Reading an article**: opening an article shows its summary and marks it read. Buttons:
  - **Open in browser**: reads the full article.
  - **Add to todos**: creates the task "Read: …" with the link in its note.
  - **Mark as unread**: puts it back in the unread list.
- **Feed menu**: right-click a feed to mark it read or remove it.

## Monitor

- **Overview**: one tile per machine. Start with This PC and add machines by hand with **Add machine**: a running WSL distribution, or a host from your SSH config (`%USERPROFILE%\.ssh\config`).
  - Each tile shows the machine's status, its GPUs as coloured blocks, CPU, memory and the hottest GPU.
  - A machine that can't be reached is greyed out, with when it was last seen.
  - Right-click a tile to open it or remove it.
- **Detail** (click a tile):
  - one tile per GPU: use, temperature, a minute's curve, VRAM and power, and the programs running on it (user, PID, VRAM, running time)
  - a GPU heatmap of the last minute
  - CPU threads, memory and drives
- **Colours**: green means fine, yellow from 70 %, red from 90 %. GPU temperature turns yellow at 70 °C and red at 85 °C.
- **SSH and other users' programs**:
  - SSH uses Windows' own `ssh.exe` with your keys and never asks for or stores passwords. Nothing is installed on the server.
  - On servers that hide other users' processes, their users come from the lab's gpustat cache (`/var/lib/lab-gpustat-cache`) when the server has one. Otherwise they show as **Other user**.

## Preferences

- **General**: the quick pane shortcut, launch at login, and Help:
  - **Check for updates** asks GitHub whether a newer EnvForIO is published and, if so, offers its download page. **Also check when EnvForIO starts** (off by default) does the same quietly at start-up and only speaks up when there is a new version. EnvForIO never downloads or installs anything itself: run the new installer over the old version, and your data is kept.
  - **Report a problem** opens a bug report on GitHub in your browser, with EnvForIO's version, your Windows version and where the log file is already filled in. Nothing is sent until you submit it yourself; the app has no telemetry.
  - **Open log folder** shows `%LOCALAPPDATA%\io.github.envforio\logs`. If you attach `EnvForIO.log` to a report, look through it first.
  - All three are also in the command palette (Ctrl+K).
- **Appearance**: language; Light, Dark or System theme; Todo Duo style.
- **Planning**: available time per weekday, day start, levelling, earliest deadline first.
