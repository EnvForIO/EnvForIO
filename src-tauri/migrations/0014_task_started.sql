-- Phase 4 step 5: a project's board has To do / Doing / Done (user decision
-- 2026-11-20). A task is "doing" from when it is started (dragged to Doing,
-- or its timer started) until it is done.
ALTER TABLE tasks ADD COLUMN started_at TEXT; -- RFC 3339 UTC; NULL = not started
