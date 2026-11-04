-- Phase 4 step 8: an RSS / Atom reader for a few low-volume feeds
-- (magazines and blogs), refreshed on start and every three hours.
CREATE TABLE feeds (
    id         INTEGER PRIMARY KEY,
    title      TEXT    NOT NULL,
    url        TEXT    NOT NULL UNIQUE,   -- the feed itself
    site       TEXT    NOT NULL DEFAULT '',
    fetched_at TEXT,                      -- last successful download, RFC 3339
    error      TEXT,
    sort_order REAL    NOT NULL DEFAULT 0
);

CREATE TABLE feed_items (
    id           INTEGER PRIMARY KEY,
    feed_id      INTEGER NOT NULL REFERENCES feeds (id) ON DELETE CASCADE,
    guid         TEXT    NOT NULL,
    title        TEXT    NOT NULL,
    link         TEXT    NOT NULL DEFAULT '',
    author       TEXT    NOT NULL DEFAULT '',
    summary      TEXT    NOT NULL DEFAULT '', -- plain text
    image        TEXT,
    published_ms INTEGER,                     -- Unix ms; NULL = undated
    seen_ms      INTEGER NOT NULL,            -- first downloaded
    is_read      INTEGER NOT NULL DEFAULT 0,
    task_id      INTEGER REFERENCES tasks (id) ON DELETE SET NULL, -- "Add to todos"
    UNIQUE (feed_id, guid)
);

CREATE INDEX feed_items_date ON feed_items (feed_id, published_ms);
