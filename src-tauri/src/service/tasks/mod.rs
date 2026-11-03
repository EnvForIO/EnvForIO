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
        assert_eq!(a.my_day_date.as_deref(), Some(TODAY));

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
        mutation::create(&conn, "yesterday's", TaskView::MyDay, "2026-11-18").unwrap();
        assert!(query::list(&conn, TaskView::MyDay, TODAY)
            .unwrap()
            .is_empty());
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
            in_my_day: true,
            due_date: Some("2026-12-01".into()),
            estimate: None,
        };
        let t = mutation::update(&conn, t.id, &edit, TODAY).unwrap();
        assert_eq!(
            (t.title.as_str(), t.my_day_date.as_deref()),
            ("draft intro", Some(TODAY))
        );

        edit.in_my_day = false;
        assert!(mutation::update(&conn, t.id, &edit, TODAY)
            .unwrap()
            .my_day_date
            .is_none());

        edit.due_date = Some("next week".into());
        assert!(matches!(
            mutation::update(&conn, t.id, &edit, TODAY),
            Err(AppError::Invalid { .. })
        ));
        edit.due_date = None;
        edit.title = "   ".into();
        assert!(matches!(
            mutation::update(&conn, t.id, &edit, TODAY),
            Err(AppError::Invalid { .. })
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
    fn a_day_holds_its_my_day_and_due_tasks() {
        let conn = open_in_memory();
        let today_task = mutation::create_on_day(&conn, "standup", TODAY, TODAY).unwrap();
        assert_eq!(today_task.my_day_date.as_deref(), Some(TODAY));
        let later = mutation::create_on_day(&conn, "review", "2026-11-21", TODAY).unwrap();
        assert_eq!(later.due_date.as_deref(), Some("2026-11-21"));
        assert!(later.my_day_date.is_none());

        assert_eq!(titles(&query::list_day(&conn, TODAY).unwrap()), ["standup"]);
        assert_eq!(
            titles(&query::list_day(&conn, "2026-11-21").unwrap()),
            ["review"]
        );
        assert!(query::list_day(&conn, "2026-11-20").unwrap().is_empty());
        assert!(mutation::create_on_day(&conn, "x", "someday", TODAY).is_err());
    }

    #[test]
    fn day_completion_counts_each_task_once_per_day() {
        let conn = open_in_memory();
        let a = mutation::create_on_day(&conn, "a", TODAY, TODAY).unwrap();
        mutation::create_on_day(&conn, "b", TODAY, TODAY).unwrap();
        mutation::create_on_day(&conn, "c", "2026-11-25", TODAY).unwrap();
        mutation::set_done(&conn, a.id, true).unwrap();
        // In My Day today and also due today: still one task for today.
        let edit = TaskUpdate {
            title: "a".into(),
            note: String::new(),
            is_important: false,
            is_pinned: false,
            in_my_day: true,
            due_date: Some(TODAY.into()),
            estimate: None,
        };
        mutation::update(&conn, a.id, &edit, TODAY).unwrap();

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
}
