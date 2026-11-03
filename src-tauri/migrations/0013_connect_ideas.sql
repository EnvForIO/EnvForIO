-- Phase 4 step 4: connect the parts (user decisions 2026-11-20).
-- An idea's todos become ordinary tasks that remember their idea, so they
-- show in Planned, My Day, the calendar and the heatmap. An idea can be
-- linked to a project; its todos are then that project's tasks.
ALTER TABLE tasks ADD COLUMN idea_id INTEGER REFERENCES ideas (id) ON DELETE CASCADE;
ALTER TABLE ideas ADD COLUMN project_id INTEGER REFERENCES projects (id) ON DELETE SET NULL;
CREATE INDEX tasks_idea_id ON tasks (idea_id);

INSERT INTO tasks (title, due_date, done_at, sort_order, idea_id, created_at, updated_at)
SELECT title, due_date, done_at, sort_order, idea_id,
       strftime('%Y-%m-%dT%H:%M:%SZ', 'now'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now')
FROM idea_todos
ORDER BY idea_id, sort_order, id;

DROP TABLE idea_todos;
