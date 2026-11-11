//! Tasks: the four built-in lists, their steps, and the rules for changing them.
//! Reads are in `query`, writes in `mutation`.

pub mod items;
pub mod mutation;
pub mod partial;
pub mod query;
pub mod schedule;

#[cfg(test)]
mod tests {
    use super::mutation::{self, TaskUpdate};
    use super::query::{self, TaskView};
    use crate::db::open_in_memory;
    use crate::errors::AppError;

    const TODAY: &str = "2026-11-19";

    fn titles(tasks: &[crate::entity::task::Task]) -> Vec<&str> {
        tasks.iter().map(|t| t.title.as_str()).collect()
    }

    #[test]
    fn a_new_task_takes_the_defaults_of_its_list() {
        let conn = open_in_memory();
        let a = mutation::create(&conn, "  read paper  ", TaskView::MyDay, TODAY).unwrap();
        assert_eq!(a.title, "read paper");
        assert_eq!(a.scheduled_date.as_deref(), Some(TODAY));

        let b = mutation::create(&conn, "submit", TaskView::Planned, TODAY).unwrap();
        assert_eq!(b.due_date.as_deref(), Some(TODAY));

        let c = mutation::create(&conn, "flagged", TaskView::Important, TODAY).unwrap();
        assert!(c.is_important);

        // Due today puts "submit" in My Day too (since 2026-11-20).
        assert_eq!(
            titles(&query::list(&conn, TaskView::MyDay, TODAY).unwrap()),
            ["submit", "read paper"]
        );
        assert_eq!(
            titles(&query::list(&conn, TaskView::Planned, TODAY).unwrap()),
            ["submit"]
        );
        assert_eq!(
            titles(&query::list(&conn, TaskView::Important, TODAY).unwrap()),
            ["flagged"]
        );
        assert_eq!(query::list(&conn, TaskView::Tasks, TODAY).unwrap().len(), 3);
    }

    #[test]
    fn my_day_only_shows_today() {
        let conn = open_in_memory();
        let old = mutation::create(&conn, "yesterday's", TaskView::MyDay, "2026-11-18").unwrap();
        assert!(query::list(&conn, TaskView::MyDay, TODAY)
            .unwrap()
            .is_empty());
        // It does not follow the user into today; it waits to be planned again.
        let pool = super::schedule::unscheduled(&conn, TODAY).unwrap();
        assert_eq!(pool[0].id, old.id);
    }

    #[test]
    fn new_tasks_go_on_top_and_done_tasks_sink() {
        let conn = open_in_memory();
        let first = mutation::create(&conn, "first", TaskView::Tasks, TODAY).unwrap();
        mutation::create(&conn, "second", TaskView::Tasks, TODAY).unwrap();
        assert_eq!(
            titles(&query::list(&conn, TaskView::Tasks, TODAY).unwrap()),
            ["second", "first"]
        );

        let done = mutation::set_done(&conn, first.id, false).unwrap();
        assert!(done.done_at.is_none());
        mutation::set_done(&conn, first.id, true).unwrap();
        let second = query::list(&conn, TaskView::Tasks, TODAY).unwrap()[0].id;
        mutation::set_done(&conn, second, true).unwrap();
        mutation::create(&conn, "third", TaskView::Tasks, TODAY).unwrap();
        assert_eq!(
            titles(&query::list(&conn, TaskView::Tasks, TODAY).unwrap())[0],
            "third"
        );
    }

    #[test]
    fn update_validates_and_moves_in_and_out_of_my_day() {
        let conn = open_in_memory();
        let t = mutation::create(&conn, "draft", TaskView::Tasks, TODAY).unwrap();
        let mut edit = TaskUpdate {
            title: "draft intro".into(),
            note: "use the new figure".into(),
            is_important: true,
            is_pinned: true,
            scheduled_date: Some(TODAY.into()),
            due_date: Some("2026-12-01".into()),
            estimate: None,
        };
        let t = mutation::update(&conn, t.id, &edit).unwrap();
        assert_eq!(
            (t.title.as_str(), t.scheduled_date.as_deref()),
            ("draft intro", Some(TODAY))
        );
        assert_eq!(
            titles(&query::list(&conn, TaskView::MyDay, TODAY).unwrap()),
            ["draft intro"]
        );

        edit.scheduled_date = None;
        mutation::update(&conn, t.id, &edit).unwrap();
        assert!(query::list(&conn, TaskView::MyDay, TODAY)
            .unwrap()
            .is_empty());

        edit.scheduled_date = Some("tomorrow".into());
        assert!(matches!(
            mutation::update(&conn, t.id, &edit),
            Err(AppError::Invalid { .. })
        ));
        edit.scheduled_date = None;
        edit.due_date = Some("next week".into());
        assert!(matches!(
            mutation::update(&conn, t.id, &edit),
            Err(AppError::Invalid { .. })
        ));
        edit.due_date = None;
        edit.title = "   ".into();
        assert!(matches!(
            mutation::update(&conn, t.id, &edit),
            Err(AppError::Invalid { .. })
        ));
        edit.title = "draft intro".into();
        assert!(matches!(
            mutation::update(&conn, 999, &edit),
            Err(AppError::NotFound { .. })
        ));
    }

    #[test]
    fn steps_count_and_delete_with_their_task() {
        let conn = open_in_memory();
        let t = mutation::create(&conn, "experiment", TaskView::Tasks, TODAY).unwrap();
        let s1 = mutation::add_step(&conn, t.id, "prepare data").unwrap();
        mutation::add_step(&conn, t.id, "run baseline").unwrap();
        mutation::set_step_done(&conn, s1.id, true).unwrap();

        let t = query::get(&conn, t.id).unwrap();
        assert_eq!((t.step_count, t.steps_done), (2, 1));
        assert_eq!(query::steps(&conn, t.id).unwrap()[0].title, "prepare data");

        mutation::delete(&conn, t.id).unwrap();
        assert!(query::steps(&conn, t.id).unwrap().is_empty());
        assert!(matches!(
            query::get(&conn, t.id),
            Err(AppError::NotFound { .. })
        ));
        assert!(matches!(
            mutation::delete(&conn, t.id),
            Err(AppError::NotFound { .. })
        ));
    }

    #[test]
    fn a_day_holds_its_planned_and_due_tasks() {
        let conn = open_in_memory();
        let today_task = mutation::create_on_day(&conn, "standup", TODAY).unwrap();
        assert_eq!(today_task.scheduled_date.as_deref(), Some(TODAY));
        // Another day's task is planned for that day, not due on it.
        let later = mutation::create_on_day(&conn, "review", "2026-11-21").unwrap();
        assert_eq!(later.scheduled_date.as_deref(), Some("2026-11-21"));
        assert!(later.due_date.is_none());
        // Planned Saturday, due Monday: on both days, and only those.
        let edit = TaskUpdate {
            title: "review".into(),
            note: String::new(),
            is_important: false,
            is_pinned: false,
            scheduled_date: later.scheduled_date.clone(),
            due_date: Some("2026-11-23".into()),
            estimate: None,
        };
        mutation::update(&conn, later.id, &edit).unwrap();

        assert_eq!(titles(&query::list_day(&conn, TODAY).unwrap()), ["standup"]);
        for day in ["2026-11-21", "2026-11-23"] {
            assert_eq!(titles(&query::list_day(&conn, day).unwrap()), ["review"]);
        }
        assert!(query::list_day(&conn, "2026-11-22").unwrap().is_empty());
        let week = super::schedule::in_range(&conn, "2026-11-16", "2026-11-23").unwrap();
        assert_eq!(week.len(), 2); // "review" comes back once for its two days
        assert!(mutation::create_on_day(&conn, "x", "someday").is_err());
    }

    #[test]
    fn day_completion_counts_each_task_once_per_day() {
        let conn = open_in_memory();
        let a = mutation::create_on_day(&conn, "a", TODAY).unwrap();
        mutation::create_on_day(&conn, "b", TODAY).unwrap();
        mutation::create_on_day(&conn, "c", "2026-11-25").unwrap();
        mutation::set_done(&conn, a.id, true).unwrap();
        // Planned for today and also due today: still one task for today.
        let edit = TaskUpdate {
            title: "a".into(),
            note: String::new(),
            is_important: false,
            is_pinned: false,
            scheduled_date: Some(TODAY.into()),
            due_date: Some(TODAY.into()),
            estimate: None,
        };
        mutation::update(&conn, a.id, &edit).unwrap();

        let days = query::day_completion(&conn, "2026-11-01", "2026-11-30").unwrap();
        let summary: Vec<_> = days
            .iter()
            .map(|d| (d.date.as_str(), d.total, d.done))
            .collect();
        assert_eq!(summary, [(TODAY, 2, 1), ("2026-11-25", 1, 0)]);
        assert!(query::day_completion(&conn, "2026-12-01", "2026-12-31")
            .unwrap()
            .is_empty());
    }

    #[test]
    fn a_task_moves_through_the_board_stages() {
        use super::mutation::{set_stage, TaskStage};
        let conn = open_in_memory();
        let task = mutation::create(&conn, "write intro", TaskView::Tasks, TODAY).unwrap();
        assert_eq!(task.started_at, None);

        let doing = set_stage(&conn, task.id, TaskStage::Doing).unwrap();
        let started = doing.started_at.clone().unwrap();
        // Doing again keeps the first start; Done completes; back to Doing reopens.
        assert_eq!(
            set_stage(&conn, task.id, TaskStage::Doing)
                .unwrap()
                .started_at,
            Some(started.clone())
        );
        assert!(set_stage(&conn, task.id, TaskStage::Done)
            .unwrap()
            .done_at
            .is_some());
        let reopened = set_stage(&conn, task.id, TaskStage::Doing).unwrap();
        assert_eq!(
            (reopened.done_at, reopened.started_at),
            (None, Some(started))
        );
        let todo = set_stage(&conn, task.id, TaskStage::Todo).unwrap();
        assert_eq!((todo.done_at, todo.started_at), (None, None));

        // Starting the timer marks the task as in progress.
        crate::service::timer::start(&conn, task.id).unwrap();
        assert!(query::get(&conn, task.id).unwrap().started_at.is_some());
        // Back to To do stops the timer.
        set_stage(&conn, task.id, TaskStage::Todo).unwrap();
        assert!(crate::service::timer::running(&conn).unwrap().is_none());
    }

    #[test]
    fn a_dragged_order_sticks() {
        let mut conn = open_in_memory();
        let a = mutation::create(&conn, "a", TaskView::MyDay, TODAY).unwrap();
        let b = mutation::create(&conn, "b", TaskView::MyDay, TODAY).unwrap();
        let c = mutation::create(&conn, "c", TaskView::MyDay, TODAY).unwrap();
        // New tasks go on top: c, b, a. Drag a to the top.
        mutation::reorder(&mut conn, &[a.id, c.id, b.id]).unwrap();
        assert_eq!(
            titles(&query::list(&conn, TaskView::MyDay, TODAY).unwrap()),
            ["a", "c", "b"]
        );
        assert!(mutation::reorder(&mut conn, &[b.id, 999]).is_err());
        // A failed reorder changes nothing.
        assert_eq!(
            titles(&query::list(&conn, TaskView::MyDay, TODAY).unwrap()),
            ["a", "c", "b"]
        );
    }
}
