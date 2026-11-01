-- Conference deadlines (phase 4 step 3): ccfddl's list as last downloaded,
-- the conferences the user follows, and projects planned from an edition.
CREATE TABLE conferences (
    key         TEXT PRIMARY KEY,           -- ccfddl's conference_key
    title       TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    area        TEXT NOT NULL DEFAULT '',
    ccf         TEXT NOT NULL DEFAULT '',
    core        TEXT NOT NULL DEFAULT '',
    editions    TEXT NOT NULL DEFAULT '[]'  -- JSON list of entity::conference::Edition
);

-- When the list was downloaded; one row.
CREATE TABLE conference_source (
    id         INTEGER PRIMARY KEY CHECK (id = 1),
    fetched_at TEXT NOT NULL
);

-- No foreign key: a follow survives a download that drops the conference.
CREATE TABLE conference_follows (
    key TEXT PRIMARY KEY
);

CREATE TABLE conference_projects (
    edition_id TEXT PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE
);
