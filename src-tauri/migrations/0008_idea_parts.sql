-- 0008: inside an idea: notes, todos, problems with their solutions, and a log.

ALTER TABLE ideas ADD COLUMN notes TEXT NOT NULL DEFAULT ''; -- Markdown with LaTeX

CREATE TABLE idea_todos (
    id         INTEGER PRIMARY KEY,
    idea_id    INTEGER NOT NULL REFERENCES ideas (id) ON DELETE CASCADE,
    title      TEXT    NOT NULL CHECK (length(trim(title)) > 0),
    due_date   TEXT,                 -- 'YYYY-MM-DD'
    done_at    TEXT,                 -- RFC 3339 UTC
    sort_order REAL    NOT NULL DEFAULT 0
);

CREATE TABLE idea_problems (
    id         INTEGER PRIMARY KEY,
    idea_id    INTEGER NOT NULL REFERENCES ideas (id) ON DELETE CASCADE,
    problem    TEXT    NOT NULL CHECK (length(trim(problem)) > 0),
    solution   TEXT    NOT NULL DEFAULT '',
    is_solved  INTEGER NOT NULL DEFAULT 0,
    created_at TEXT    NOT NULL
);

CREATE TABLE idea_logs (
    id         INTEGER PRIMARY KEY,
    idea_id    INTEGER NOT NULL REFERENCES ideas (id) ON DELETE CASCADE,
    date       TEXT    NOT NULL,     -- 'YYYY-MM-DD'
    text       TEXT    NOT NULL CHECK (length(trim(text)) > 0),
    created_at TEXT    NOT NULL
);

CREATE INDEX idea_todos_idea_id ON idea_todos (idea_id);
CREATE INDEX idea_problems_idea_id ON idea_problems (idea_id);
CREATE INDEX idea_logs_idea_id ON idea_logs (idea_id);
