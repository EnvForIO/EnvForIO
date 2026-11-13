-- Subtasks (user decision 2026-11-21): a task can hold tasks of its own, one
-- level deep. A subtask is a full task (estimate, Do on, Due, timer) and
-- keeps its parent's project and module, so project views and the safety
-- line read it like any other task. Deleting the parent deletes them.
ALTER TABLE tasks ADD COLUMN parent_id INTEGER REFERENCES tasks (id) ON DELETE CASCADE;
CREATE INDEX tasks_parent_id ON tasks (parent_id);

-- Steps become subtasks. A ticked step had no date of its own: it takes the
-- parent's done time, or its last change.
-- NOTE: a subtask under an estimated parent shares the parent's minutes, so
-- a ticked step now counts as work done on that day in the history.
INSERT INTO tasks (title, parent_id, project_id, module_id, done_at, sort_order,
                   created_at, updated_at)
SELECT s.title, t.id, t.project_id, t.module_id,
       CASE WHEN s.is_done THEN coalesce(t.done_at, t.updated_at) END,
       s.sort_order, t.created_at, t.updated_at
  FROM task_steps s JOIN tasks t ON t.id = s.task_id
 ORDER BY s.task_id, s.sort_order, s.id;

DROP TABLE task_steps;
