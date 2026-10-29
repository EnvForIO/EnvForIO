-- 0011: the machines on the monitor's overview, in the order shown.
-- The user adds them by hand (2026-11-19); This PC is there from the start.

CREATE TABLE machines (
    id         INTEGER PRIMARY KEY,
    kind       TEXT NOT NULL CHECK (kind IN ('local', 'wsl', 'ssh')),
    name       TEXT NOT NULL DEFAULT '', -- WSL distribution or SSH host; '' for this PC
    sort_order REAL NOT NULL DEFAULT 0,
    UNIQUE (kind, name)
);

INSERT INTO machines (kind, name, sort_order) VALUES ('local', '', 0);
