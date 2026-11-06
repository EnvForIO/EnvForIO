# Phase 2.5: Seedbank idea parity

Started 2026-11-19. The checklist is in the product plan (deleted 2026-11-20 when finished; see git history). Ideas are separate from DayEcho projects (own tables); connecting them waits for Phase 4.

## Steps

Each step ends with a Windows build the user tries before the next one starts.

| Step | Contents                                                                                                                                                       | PLAN items                                                                                         |
| ---- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- |
| 1    | Ideas: status, priority, pin, tags, target venue, deadline, links; the default 8-step research checklist; the Ideas page with filters, cards and a detail view | Idea pipeline, Status, Priority/pin/tags, Target venue, List card, Detail page, Progress checklist |
| 2    | Inside an idea: todos with due dates, problems with solutions, progress log, Markdown + LaTeX notes                                                            | Todos and problems, Progress log, Notes                                                            |
| 3    | Paper library: DOI / arXiv lookup, reading status, notes, BibTeX; links from ideas with a relation                                                             | Paper library, Paper links                                                                         |
| 4    | Overview page; export                                                                                                                                          | Overview page, Export                                                                              |

Step 4 export, 2026-11-19 user decision: JSON only (no SQLite copy, no PDF). The overview keeps the deadline list, and it includes project and task deadlines as well as idea deadlines.

## Step 1: ideas

- Migration `0007_ideas.sql`: `ideas`, `idea_tags` (tags are shared, `tags` table), `idea_steps`, `idea_links`.
- Statuses: Spark, Researching, In progress, Writing, Submitted, Done, On hold, Dropped. "Unfinished" = not Done or Dropped.
- A new idea starts with the 8 default steps (literature review, hypothesis, experiment design, implementation, analysis, writing, submission prep, wrap-up); steps can be added, ticked (with the date) and removed.
- UI: an Ideas page in the sidebar with filter chips (All / Pinned / Unfinished / each status / tags, with counts), a card list, and a detail column.

## Step 2: inside an idea

- Migration `0008_idea_parts.sql`: `ideas.notes`, `idea_todos` (title, optional due date, done), `idea_problems` (problem, solution, solved), `idea_logs` (date, text).
- The idea detail ends in tabs: Progress (steps and links), Todos, Notes, Problems, Log, each with its count. Cards show open todos, open problems and log entries.
- Notes are Markdown with LaTeX (`react-markdown`, `remark-gfm`, `remark-math`, `rehype-katex`): shown rendered, click to edit, saved on blur.
- Problems list open ones first; a solution is saved when its box loses focus. Log entries are dated today and listed newest first.

## Step 3: paper library

- Migration `0009_papers.sql`: `papers` (DOI and arXiv id unique, reading status, Markdown notes) and `idea_papers` (relation and note per idea).
- Adding: paste a DOI (bare, `doi:` or a doi.org link) or an arXiv id or link. DOIs are looked up on Crossref, arXiv ids on the arXiv API (`service/papers/fetch.rs`, `reqwest` with native TLS, so SChannel on Windows). Anything else becomes a paper with that title. A DOI or arXiv id already in the library returns the existing paper.
- BibTeX is generated locally (`domain/paper_ref.rs`): key `family + year + first title word`, `@article` / `@inproceedings` / `@misc` from the Crossref type.
- UI: a Library page in the sidebar (status chips with counts, search, list, detail with BibTeX, DOI and arXiv links, abstract, reading notes and the ideas using it), and a Papers tab on ideas (search the library or paste a DOI to attach, relation and note per paper).
- No PDFs (2026-11-19, user decision): the user keeps PDFs in Zotero, so the library keeps only the DOI and arXiv links. Step 3 first shipped download, import and open buttons; migration `0010_drop_paper_pdfs.sql` drops `pdf_url` and `has_pdf`. Files downloaded before that stay in `<app data>/papers/` and can be deleted by hand.

## Step 4: overview and export

- `service/research/overview.rs`:
  - Four counts: unfinished ideas, plus open todos and open problems in unfinished ideas, and papers still to read.
  - Ideas by status.
  - Ideas being worked on (Researching, In progress, Writing), each with its step progress.
  - Deadlines from ideas (except Submitted, Done and Dropped), projects that are not archived, and open tasks. Sorted by date, up to 40 rows, and anything overdue by more than 30 days is left out.
  - Up to 20 open todos (dated ones first) and up to 20 open problems.
- A "Research" page in the sidebar, placed before Ideas. Clicking a tile opens Ideas or the Library. Clicking a row opens its idea (`openIdea` sets `focusIdeaId`, which the Ideas page opens with), its project, or its task in the details pane.
- "Export JSON" (`service/research/archive.rs`, the `export_research_json` command) writes one file:
  - `format: "envio-research"`, `version: 1`
  - the tags
  - every idea with its notes, steps, links, todos, problems, log, and attached papers (each with its relation and note)
  - the paper library

  EnvIO does not import the file back.

## Step 5: light and dark

Nothing to build: Settings → Appearance → Theme (Light, Dark, System) comes from the template. The idea, library and overview pages use the theme tokens (`muted`, `border`, `primary`, `destructive`, the Markdown styles in `App.css`). The only fixed colours are the status, relation and priority dots, which are mid-tones readable on both backgrounds.
