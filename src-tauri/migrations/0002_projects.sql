-- 0002: projects and their modules (sections).
-- tasks.project_id / tasks.module_id already exist (0001) without foreign keys;
-- service/projects keeps them consistent on delete.

CREATE TABLE projects (
    id          INTEGER PRIMARY KEY,
    name        TEXT    NOT NULL CHECK (length(trim(name)) > 0),
    color       TEXT    NOT NULL DEFAULT '#3b82f6',  -- '#rrggbb'
    template    TEXT    NOT NULL DEFAULT 'blank',    -- which built-in template created it
    start_date  TEXT,                                -- 'YYYY-MM-DD'; NULL = from today
    deadline    TEXT,                                -- 'YYYY-MM-DD'
    buffer_days INTEGER NOT NULL DEFAULT 0 CHECK (buffer_days >= 0), -- plan to finish this many days early
    is_archived INTEGER NOT NULL DEFAULT 0,
    sort_order  REAL    NOT NULL DEFAULT 0,
    created_at  TEXT    NOT NULL,
    updated_at  TEXT    NOT NULL
);

CREATE TABLE modules (
    id         INTEGER PRIMARY KEY,
    project_id INTEGER NOT NULL REFERENCES projects (id) ON DELETE CASCADE,
    name       TEXT    NOT NULL CHECK (length(trim(name)) > 0),
    sort_order REAL    NOT NULL DEFAULT 0
);

CREATE INDEX modules_project_id ON modules (project_id);
CREATE INDEX tasks_project_id ON tasks (project_id);
