//! Projects (DayEcho): a deadline, a buffer, modules, and estimated tasks.
//! Reads are in `query`, writes in `mutation`, starting modules in `templates`.

pub mod mutation;
pub mod query;
pub mod templates;

#[cfg(test)]
mod tests {
    use super::mutation::{self, ProjectInput};
    use super::query;
    use crate::db::open_in_memory;
    use crate::errors::AppError;
    use crate::service::tasks;

    fn input(name: &str) -> ProjectInput {
        ProjectInput {
            name: name.into(),
            color: "#3b82f6".into(),
            start_date: Some("2026-11-20".into()),
            deadline: Some("2026-12-20".into()),
            buffer_days: 3,
            is_archived: false,
        }
    }

    #[test]
    fn a_template_creates_its_modules() {
        let mut conn = open_in_memory();
        let p = mutation::create(&mut conn, &input("ICML paper"), "paper").unwrap();
        let names: Vec<_> = query::modules(&conn, p.id)
            .unwrap()
            .into_iter()
            .map(|m| m.name)
            .collect();
        assert_eq!(
            names,
            [
                "Literature review",
                "Method",
                "Experiments",
                "Writing",
                "Submission"
            ]
        );
        assert!(matches!(
            mutation::create(&mut conn, &input("x"), "nope"),
            Err(AppError::Invalid { .. })
        ));
    }

    #[test]
    fn input_is_checked() {
        let mut conn = open_in_memory();
        let mut bad = input("x");
        bad.color = "blue".into();
        assert!(mutation::create(&mut conn, &bad, "blank").is_err());
        let mut bad = input("x");
        bad.start_date = Some("2027-01-01".into());
        assert!(mutation::create(&mut conn, &bad, "blank").is_err());
        let mut bad = input("x");
        bad.buffer_days = -1;
        assert!(mutation::create(&mut conn, &bad, "blank").is_err());
    }

    #[test]
    fn totals_follow_task_estimates() {
        let mut conn = open_in_memory();
        let p = mutation::create(&mut conn, &input("thesis"), "thesis").unwrap();
        let module = query::modules(&conn, p.id).unwrap()[0].id;
        let a = mutation::add_task(&conn, p.id, Some(module), "outline", &Some("1h30m".into()))
            .unwrap();
        mutation::add_task(&conn, p.id, None, "email advisor", &Some("15m".into())).unwrap();
        assert_eq!(
            (a.project_id, a.module_id, a.estimate_minutes),
            (Some(p.id), Some(module), Some(90))
        );
        assert!(mutation::add_task(&conn, p.id, None, "x", &Some("soon".into())).is_err());

        tasks::mutation::set_done(&conn, a.id, true).unwrap();
        let p = query::get(&conn, p.id).unwrap();
        assert_eq!((p.task_count, p.done_count), (2, 1));
        assert_eq!((p.estimate_minutes, p.done_estimate_minutes), (105, 90));
        assert_eq!(p.plan_date.as_deref(), Some("2026-12-17")); // Dec 20 minus 3 buffer days
        // Project tasks are not in the Tasks pool.
        assert!(
            tasks::query::list(&conn, tasks::query::TaskView::Tasks, "2026-11-20")
                .unwrap()
                .is_empty()
        );
    }

    #[test]
    fn deleting_cleans_up() {
        let mut conn = open_in_memory();
        let p = mutation::create(&mut conn, &input("grant"), "grant").unwrap();
        let module = query::modules(&conn, p.id).unwrap()[0].id;
        let t = mutation::add_task(&conn, p.id, Some(module), "budget table", &None).unwrap();

        mutation::delete_module(&conn, module).unwrap();
        assert_eq!(tasks::query::get(&conn, t.id).unwrap().module_id, None);
        assert_eq!(query::tasks(&conn, p.id).unwrap().len(), 1);

        mutation::delete(&mut conn, p.id).unwrap();
        assert!(query::list(&conn).unwrap().is_empty());
        assert!(matches!(
            tasks::query::get(&conn, t.id),
            Err(AppError::NotFound { .. })
        ));
        assert!(matches!(
            mutation::delete(&mut conn, p.id),
            Err(AppError::NotFound { .. })
        ));
    }
}
