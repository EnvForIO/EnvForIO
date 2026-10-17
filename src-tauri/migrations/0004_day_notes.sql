-- 0004: a free-text note per day (calendar notes, "a line for today").

CREATE TABLE day_notes (
    date       TEXT PRIMARY KEY,   -- 'YYYY-MM-DD'
    text       TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX tasks_scheduled_date ON tasks (scheduled_date);
