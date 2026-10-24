-- 0007: research ideas (Seedbank), separate from DayEcho projects.

CREATE TABLE ideas (
    id          INTEGER PRIMARY KEY,
    title       TEXT    NOT NULL CHECK (length(trim(title)) > 0),
    description TEXT    NOT NULL DEFAULT '',
    status      TEXT    NOT NULL DEFAULT 'Spark', -- see entity::idea::IdeaStatus
    priority    INTEGER NOT NULL DEFAULT 0 CHECK (priority BETWEEN 0 AND 3), -- 0 none .. 3 high
    is_pinned   INTEGER NOT NULL DEFAULT 0,
    venue       TEXT    NOT NULL DEFAULT '',      -- target journal or conference, e.g. MICCAI
    deadline    TEXT,                             -- 'YYYY-MM-DD'
    sort_order  REAL    NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
);

CREATE TABLE tags (
    id    INTEGER PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE CHECK (length(trim(name)) > 0),
    color TEXT NOT NULL DEFAULT '#64748b'
);

CREATE TABLE idea_tags (
    idea_id INTEGER NOT NULL REFERENCES ideas (id) ON DELETE CASCADE,
    tag_id  INTEGER NOT NULL REFERENCES tags (id) ON DELETE CASCADE,
    PRIMARY KEY (idea_id, tag_id)
);

-- The research checklist: literature review, hypothesis, ... wrap-up.
CREATE TABLE idea_steps (
    id         INTEGER PRIMARY KEY,
    idea_id    INTEGER NOT NULL REFERENCES ideas (id) ON DELETE CASCADE,
    title      TEXT    NOT NULL CHECK (length(trim(title)) > 0),
    done_on    TEXT,                 -- 'YYYY-MM-DD' when ticked
    sort_order REAL    NOT NULL DEFAULT 0
);

CREATE TABLE idea_links (
    id      INTEGER PRIMARY KEY,
    idea_id INTEGER NOT NULL REFERENCES ideas (id) ON DELETE CASCADE,
    label   TEXT    NOT NULL,        -- e.g. "Overleaf"
    url     TEXT    NOT NULL
);

CREATE INDEX idea_steps_idea_id ON idea_steps (idea_id);
CREATE INDEX idea_links_idea_id ON idea_links (idea_id);
