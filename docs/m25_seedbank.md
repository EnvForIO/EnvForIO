# Phase 2.5: Seedbank idea parity

Started 2026-11-19. The checklist is in `docs/PLAN.md`. Ideas are separate from DayEcho projects (own tables); connecting them waits for Phase 4.

## Steps

Each step ends with a Windows build the user tries before the next one starts.

| Step | Contents                                                                                                                                                       | PLAN items                                                                                         |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1    | Ideas: status, priority, pin, tags, target venue, deadline, links; the default 8-step research checklist; the Ideas page with filters, cards and a detail view | Idea pipeline, Status, Priority/pin/tags, Target venue, List card, Detail page, Progress checklist |
| 2    | Inside an idea: todos with due dates, problems with solutions, progress log, Markdown + LaTeX notes                                                            | Todos and problems, Progress log, Notes                                                            |
| 3    | Paper library: DOI / arXiv lookup, reading status, notes, BibTeX; links from ideas with a relation; PDFs                                                       | Paper library, Paper links, PDF                                                                    |
| 4    | Overview page; export                                                                                                                                          | Overview page, Export                                                                              |

Open question for step 4: the reference exports SQLite, JSON and PDF, but EnvIO's export was cut to CSV and ICS on 2026-11-19. Ask before building it.

## Step 1: ideas

- Migration `0007_ideas.sql`: `ideas`, `idea_tags` (tags are shared, `tags` table), `idea_steps`, `idea_links`.
- Statuses: Spark, Researching, In progress, Writing, Submitted, Done, On hold, Dropped. "Unfinished" = not Done or Dropped.
- A new idea starts with the 8 default steps (literature review, hypothesis, experiment design, implementation, analysis, writing, submission prep, wrap-up); steps can be added, ticked (with the date) and removed.
- UI: an Ideas page in the sidebar with filter chips (All / Pinned / Unfinished / each status / tags, with counts), a card list, and a detail column.
