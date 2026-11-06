# EnvIO User Guide

EnvIO is a desktop app for researchers. It covers tasks, planning back from deadlines, research ideas and papers, conference deadlines, calendars, a feed reader, and monitoring of your machines and GPU servers. It runs on Windows. Everything is stored locally in `%APPDATA%\io.github.envforio\envio.db`.

## Getting around

The left sidebar has the task lists (My Day, Important, Planned, Tasks), then the pages: Calendar, Items, Stats, Research, Conferences, Ideas, Library, Reader and Monitor. Your projects are listed below them.

Clicking a task opens its details on the right. Closing the window hides EnvIO to the tray; to quit, use the tray menu's **Quit EnvIO**. Preferences → General → **Launch at login** starts EnvIO hidden in the tray when you sign in.

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

- **My Day**: what you are doing today. It holds tasks you added to My Day, tasks scheduled for today, tasks due today, and overdue tasks that are still open. At the top are today's safety line and a line of note for the day. At the bottom, **To schedule** lists tasks that have no day.
- **Important**: flagged tasks.
- **Planned**: tasks with a due date, soonest first.
- **Tasks**: every task that is not in a project.
- **Order**: drag a task up or down to reorder My Day, Important, Tasks, a project module, or Items under Open or All (Planned, and Items with deadline or done, are sorted by date). Ctrl+Z undoes it.
- **Quick capture**: start a title with a time and it becomes the task's time slot. Examples: `14:00-15:00 group meeting`, `9:30 call`.
- **Details pane**: title, steps, timer, My Day, flag, pin, due date, estimate (`45m`, `1h30m`, `1.5h`) and note. A task that came from an idea shows **Todo of idea …**; click it to open the idea.
- **Timer**: the play button on a task row starts it (starting another stops the first). Stopping adds the time to the task. **Did part of it** finishes the part you did and moves the rest to the next work day.
- **Undo**: Ctrl+Z, or the Undo button that appears after deleting a task. It keeps the last 50 changes until EnvIO closes.

## Todo Duo (mini mode)

The float button in the title bar (or **Mini mode** in the tray menu) shrinks EnvIO into a small sticky: a capsule with a pin and a heatmap, and a card under it. Drag either one to move both. The capsule's expand button, or a click on the tray icon, brings the window back.

The card has two tabs:

- **Todo**: the day's tasks, with an add box. Click a day on the capsule's heatmap to see another day.
- **Month**: the month calendar.
  - **Shading**: how full each day is, comparing the time of the tasks scheduled on it with the time you have that day. Blue means room left, yellow nearly full, red over (or work planned on a rest day).
  - **Dots**: deadlines that day (projects, tasks due, followed conferences).
  - **Click** a day to list it below and to set the Todo tab to it.
  - **Double-click** a day to open the main calendar there.

Preferences → Appearance sets the sticky's material, font and text size.

## Projects and the safety line

- **New project** (the + next to Projects): name, colour, template, start date, deadline and **Finish early** days. The dialog shows what the template sets up.
  - **Blank**: starts empty.
  - **Grant** and **Thesis**: start with their modules.
  - **Paper**: adds dated milestones, counted back from the deadline. Experiments done −21 days, full draft −14, advisor review −7, final check and submit −1.
  - **Proposal (开题)**: literature review done −30 days, proposal draft −14, advisor sign-off −7, slides −3, rehearsal −1.

  The milestones are ordinary tasks you can edit. A milestone that would fall before the start date is left out.

- **Project page**: dates, progress, today's share of the safety line and a health badge (On track / Tight / Behind). The switch at the top right toggles between two views:
  - **List**: tasks grouped by module, each with an add row that takes a title and an estimate.
  - **Board**: To do / Doing / Done. Drag cards between the columns. Starting a task's timer moves it to Doing. Moving a card to Done completes it, and moving a card back to To do stops its timer.
- **Available time**: set per weekday in Preferences → Planning (0 = rest day). On the calendar, right-click a day to change it for that date only.
- **Safety line**: each morning EnvIO works out how much of each project's estimated work to do today, so that it finishes by its plan date (the deadline minus the finish-early days). It spreads the work over your work days.
  - My Day shows the line, your streak, yesterday's shortfall and a 14-day load forecast.
  - Estimates are adjusted by how long tasks really take once you have timed a few.
  - Preferences → Planning sets the day start (default 07:00), levelling, and "earliest deadline first".

## Calendar

- **Views**: month or week, with **To schedule** on the right.
- **Scheduling**: drag a task onto a day to schedule it, or back onto **To schedule** to remove it from the calendar.
- **Day dialog**: double-click or right-click a day to add a task, write the day's note, or set its available time.
- **Export**: writes the month or week on screen as CSV (for Excel) or ICS. Project pages export the same way.
- **Calendars**: subscribes to read-only calendars from ICS links, such as Outlook / Office 365 or a course timetable.
  - In Outlook, go to Settings → Calendar → Shared calendars → **Publish a calendar**, then copy the ICS link.
  - Events show in their calendar's colour above the tasks; hover for the time and place.
  - Calendars are downloaded when EnvIO starts and every hour. Each one can be hidden, removed, or refreshed now.
  - The links stay on your computer.

## Items and Stats

- **Items**: every task, filtered by open, with deadline, done or all, and by project.
- **Stats**: week, month or year, covering:
  - tasks done, time tracked, completion rate and active days
  - a trend chart
  - time per project
  - your weekly rhythm
  - the completion heatmap and project progress

  In Year view, **Year in review** saves a share card as an image.

## Research

- **Ideas**: each idea has a status (Spark → Researching → In progress → Writing → Submitted → Done, or On hold or Dropped), a priority, a pin, tags, a target venue and a deadline.
  - **Filters**: by status, pinned or tag.
  - **Inside an idea**:
    - **Progress**: an 8-step checklist and links.
    - **Todos**: tasks with optional due dates. They are real tasks, so they show in Planned, My Day, the calendar and the heatmap.
    - **Notes**: Markdown with LaTeX.
    - **Problems**: each with its solution.
    - **Log**: dated entries.
    - **Papers**: papers from the library attached to the idea.
  - **Project link**: link an idea to a project and its todos become that project's tasks, so they count toward its safety line once estimated.
  - **Target conference**: if the idea's venue is a conference on the Conferences page (for example MICCAI), the idea shows its next deadline. **Plan submission** makes the project and links it to the idea.
- **Library**: paste a DOI or an arXiv id or link and the details are looked up online. Anything else becomes a paper with that title. Each paper has a reading status, notes and a BibTeX copy button, and lists the ideas using it. PDFs stay in your reference manager (Zotero).
- **Research**: an overview with these sections:
  - counts of unfinished ideas, open todos, open problems and papers to read
  - ideas by status, and the ideas in progress
  - upcoming deadlines from ideas, projects and tasks
  - open todos and problems

  **Export JSON** saves all ideas and papers to one file.

## Conferences

Deadlines come from ccfddl's open list of computer-science conferences (CCF ranks included). The list is downloaded only when you press **Download list** or **Refresh**.

- **Following**: star a conference to get a card with these parts:
  - the time left, red under a week and yellow under a month
  - the abstract and paper deadlines in your local time (AoE and other zones are converted; hover to see the original zone)
  - place and dates, and a link to the website
- **Plan submission**: makes a Paper project whose deadline is the paper deadline. It includes the milestones plus a task for the abstract deadline. Once made, the button becomes **Open project**.
- **Find conferences**: search by name, area and CCF rank.

## Reader

Paste the address of an RSS or Atom feed, or just a site (for example `quantamagazine.org`), and press Enter. Feeds refresh when EnvIO starts and every three hours.

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

- **General**: the quick pane shortcut, launch at login.
- **Appearance**: language; Light, Dark or System theme; Todo Duo style.
- **Planning**: available time per weekday, day start, levelling, earliest deadline first.
