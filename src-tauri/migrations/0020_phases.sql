-- Phases (user decision 2026-11-20): a module can end on a date and carry a
-- time budget, so a project's time is split into stages that the safety line
-- plans one after another. Templates set these instead of milestone tasks.
ALTER TABLE modules ADD COLUMN end_date TEXT;          -- 'YYYY-MM-DD'; NULL = not a dated phase
ALTER TABLE modules ADD COLUMN budget_minutes INTEGER; -- NULL = no budget

-- A conference project remembers the round it was made for, so its page can
-- count down to it and notice when ccfddl moves the deadline.
ALTER TABLE conference_projects ADD COLUMN conference_key TEXT;
ALTER TABLE conference_projects ADD COLUMN stage INTEGER NOT NULL DEFAULT 0;
-- NOTE: projects planned before this migration get round 0 of their edition;
-- the round actually picked was not stored. Most editions have one round.
UPDATE conference_projects SET conference_key = (
    SELECT c.key FROM conferences c, json_each(c.editions) e
     WHERE json_extract(e.value, '$.id') = conference_projects.edition_id
);

-- Following a conference without a project is gone (user decision
-- 2026-11-20): an idea's target venue does that job now.
DROP TABLE conference_follows;
