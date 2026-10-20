-- 0005: timer sessions. At most one row has ended_at NULL (the running timer).
-- Stopping a session adds its minutes to tasks.actual_minutes.

CREATE TABLE time_entries (
    id         INTEGER PRIMARY KEY,
    task_id    INTEGER NOT NULL REFERENCES tasks (id) ON DELETE CASCADE,
    started_at TEXT    NOT NULL,   -- RFC 3339 UTC
    ended_at   TEXT                -- NULL while running
);

CREATE INDEX time_entries_task_id ON time_entries (task_id);
CREATE UNIQUE INDEX time_entries_one_running ON time_entries (ended_at IS NULL) WHERE ended_at IS NULL;
