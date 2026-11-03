-- Phase 4 step 7: the desktop calendar widget remembers whether it is shown
-- (its position and size are kept by the window-state plugin).
CREATE TABLE widgets (
    name    TEXT PRIMARY KEY,
    visible INTEGER NOT NULL DEFAULT 0
);
