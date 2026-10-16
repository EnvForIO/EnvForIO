-- 0003: how much time is available for project work.
-- A weekday with no row has no limit and is a work day; 0 minutes = rest day.
-- A date override wins over its weekday.

CREATE TABLE weekday_capacity (
    weekday INTEGER PRIMARY KEY CHECK (weekday BETWEEN 0 AND 6), -- 0 = Monday
    minutes INTEGER NOT NULL CHECK (minutes >= 0)
);

CREATE TABLE day_overrides (
    date    TEXT    PRIMARY KEY,                       -- 'YYYY-MM-DD'
    minutes INTEGER NOT NULL CHECK (minutes >= 0)
);
