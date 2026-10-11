-- 0001: tasks and their steps.
-- Columns marked "Phase 2" are created now so Phase 2 does not have to rework the table.
-- Dates are 'YYYY-MM-DD' (local), timestamps are RFC 3339 UTC, durations are minutes.

CREATE TABLE tasks (
    id               INTEGER PRIMARY KEY,
    title            TEXT    NOT NULL CHECK (length(trim(title)) > 0),
    note             TEXT    NOT NULL DEFAULT '',
    is_important     INTEGER NOT NULL DEFAULT 0,
    is_pinned        INTEGER NOT NULL DEFAULT 0,
    my_day_date      TEXT,             -- in My Day while this equals today
    due_date         TEXT,             -- Planned list; the deadline in Phase 2
    done_at          TEXT,             -- NULL = open
    sort_order       REAL    NOT NULL DEFAULT 0,
    project_id       INTEGER,          -- Phase 2 (FK added with the projects table)
    module_id        INTEGER,          -- Phase 2
    estimate_minutes INTEGER,          -- Phase 2
    actual_minutes   INTEGER,          -- Phase 2
    scheduled_date   TEXT,             -- Phase 2
    start_time       TEXT,             -- 'HH:MM', Phase 2 quick capture
    end_time         TEXT,             -- 'HH:MM'
    split_from_id    INTEGER REFERENCES tasks (id) ON DELETE SET NULL, -- Phase 2 partial completion
    created_at       TEXT    NOT NULL,
    updated_at       TEXT    NOT NULL
);

CREATE INDEX tasks_my_day_date ON tasks (my_day_date);
CREATE INDEX tasks_due_date ON tasks (due_date);
CREATE INDEX tasks_done_at ON tasks (done_at);

CREATE TABLE task_steps (
    id         INTEGER PRIMARY KEY,
    task_id    INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    title      TEXT    NOT NULL CHECK (length(trim(title)) > 0),
    is_done    INTEGER NOT NULL DEFAULT 0,
    sort_order REAL    NOT NULL DEFAULT 0
);

CREATE INDEX task_steps_task_id ON task_steps (task_id);
