-- Phase 4 step 6: read-only external calendars from ICS links (Outlook /
-- Office 365, course and seminar feeds), refreshed on start and hourly.
CREATE TABLE calendars (
    id         INTEGER PRIMARY KEY,
    name       TEXT    NOT NULL CHECK (length(trim(name)) > 0),
    url        TEXT    NOT NULL UNIQUE,
    color      TEXT    NOT NULL,            -- '#rrggbb'
    is_visible INTEGER NOT NULL DEFAULT 1,
    fetched_at TEXT,                        -- last successful download, RFC 3339
    error      TEXT,                        -- why the last download failed
    sort_order REAL    NOT NULL DEFAULT 0
);

-- Each occurrence of each event, expanded from about three months back to
-- a year ahead; replaced whole on every successful download.
CREATE TABLE calendar_events (
    id          INTEGER PRIMARY KEY,
    calendar_id INTEGER NOT NULL REFERENCES calendars (id) ON DELETE CASCADE,
    title       TEXT    NOT NULL,
    location    TEXT    NOT NULL DEFAULT '',
    start_ms    INTEGER NOT NULL,           -- Unix ms
    end_ms      INTEGER NOT NULL,
    all_day     INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX calendar_events_start ON calendar_events (start_ms);
