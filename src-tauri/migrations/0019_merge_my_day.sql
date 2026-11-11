-- One "do on" day per task (user decision 2026-11-20). My Day and the
-- calendar's scheduled day were two columns for the same thing: "Add to
-- My Day" and "schedule for today" looked alike and wrote different fields.
-- From here on "in My Day" means scheduled for today.
--
-- A task that was put in My Day on some day takes that day as its scheduled
-- day, unless the calendar already gave it one.
--
-- NOTE: my_day_date stays in the table, unread and unwritten from now on, so
-- this migration loses nothing. Drop it (and its index) in a later migration.
UPDATE tasks SET scheduled_date = my_day_date
 WHERE scheduled_date IS NULL AND my_day_date IS NOT NULL;
