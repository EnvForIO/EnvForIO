-- 0009: the paper library (Seedbank), and papers attached to ideas.

CREATE TABLE papers (
    id         INTEGER PRIMARY KEY,
    title      TEXT    NOT NULL CHECK (length(trim(title)) > 0),
    authors    TEXT    NOT NULL DEFAULT '',     -- one "Given Family" per line
    year       INTEGER,
    venue      TEXT    NOT NULL DEFAULT '',     -- journal, proceedings or "arXiv"
    kind       TEXT    NOT NULL DEFAULT 'misc', -- BibTeX entry type: article, inproceedings, misc
    doi        TEXT    UNIQUE,
    arxiv_id   TEXT    UNIQUE,                  -- without version, e.g. 1706.03762
    url        TEXT    NOT NULL DEFAULT '',
    summary    TEXT    NOT NULL DEFAULT '',     -- the abstract
    pdf_url    TEXT,                            -- open-access PDF, if the lookup found one
    has_pdf    INTEGER NOT NULL DEFAULT 0,      -- a copy is in <app data>/papers/<id>.pdf
    status     TEXT    NOT NULL DEFAULT 'ToRead', -- see entity::paper::ReadingStatus
    notes      TEXT    NOT NULL DEFAULT '',     -- Markdown with LaTeX
    created_at TEXT    NOT NULL,
    updated_at TEXT    NOT NULL
);

CREATE TABLE idea_papers (
    idea_id  INTEGER NOT NULL REFERENCES ideas (id) ON DELETE CASCADE,
    paper_id INTEGER NOT NULL REFERENCES papers (id) ON DELETE CASCADE,
    relation TEXT    NOT NULL DEFAULT 'Inspiration', -- see entity::paper::PaperRelation
    note     TEXT    NOT NULL DEFAULT '',            -- why it matters for this idea
    PRIMARY KEY (idea_id, paper_id)
);

CREATE INDEX idea_papers_paper_id ON idea_papers (paper_id);
