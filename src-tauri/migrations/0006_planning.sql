-- 0006: planning settings and each day's safety line as first seen.

CREATE TABLE settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
);

-- The line for each project the first time a day is looked at. Tomorrow it is
-- compared with what was actually done (check-ins, "fell short by").
-- project_id 0 with 0 minutes marks a day that was seen with no line at all.
CREATE TABLE daily_lines (
    date       TEXT    NOT NULL,   -- 'YYYY-MM-DD'
    project_id INTEGER NOT NULL,
    minutes    INTEGER NOT NULL,
    PRIMARY KEY (date, project_id)
);
