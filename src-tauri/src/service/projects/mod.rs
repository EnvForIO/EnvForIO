//! Projects: a deadline, a buffer, modules (phases when they have
//! an end date), and estimated tasks.
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

    /// (name, end date) of each module of a project, in order.
    fn phases(conn: &rusqlite::Connection, project: i64) -> Vec<(String, Option<String>)> {
        query::modules(conn, project)
            .unwrap()
            .into_iter()
            .map(|m| (m.name, m.end_date))
            .collect()
    }

    #[test]
    fn a_template_creates_its_phases() {
        let mut conn = open_in_memory();
        // input(): starts 2026-11-20, deadline 2026-12-20.
        let p = mutation::create(&mut conn, &input("ICML paper"), "conference", None).unwrap();
        assert_eq!(
            phases(&conn, p.id),
            [
                ("Experiments".into(), Some("2026-11-29".into())),
                ("Writing".into(), Some("2026-12-13".into())),
                ("Revise and submit".into(), Some("2026-12-20".into())),
            ]
        );
        // Phases replace milestone tasks: nothing to do is made up.
        assert!(query::tasks(&conn, p.id).unwrap().is_empty());
        // Modules without dates stay plain modules.
        let thesis = mutation::create(&mut conn, &input("Thesis"), "thesis", None).unwrap();
        assert!(phases(&conn, thesis.id)
            .iter()
            .all(|(_, end)| end.is_none()));
        assert!(matches!(
            mutation::create(&mut conn, &input("x"), "nope", None),
            Err(AppError::Invalid { .. })
        ));
    }

    #[test]
    fn phases_too_early_or_without_a_deadline_get_no_date() {
        let mut conn = open_in_memory();
        // Proposal phases end 30, 7 and 0 days before; the first is before the start.
        let mut soon = input("Soon");
        soon.deadline = Some("2026-12-10".into());
        let p = mutation::create(&mut conn, &soon, "proposal", None).unwrap();
        assert_eq!(
            phases(&conn, p.id),
            [
                ("Literature review".into(), None),
                ("Proposal".into(), Some("2026-12-03".into())),
                ("Presentation".into(), Some("2026-12-10".into())),
            ]
        );
        let mut open = input("Open");
        open.deadline = None;
        let p = mutation::create(&mut conn, &open, "journal", None).unwrap();
        assert!(phases(&conn, p.id).iter().all(|(_, end)| end.is_none()));
    }

    #[test]
    fn the_dialogs_phases_and_later_edits_are_kept() {
        let mut conn = open_in_memory();
        let edited = [
            mutation::PhaseInput {
                name: "Experiments".into(),
                end_date: Some("2026-11-22".into()),
                budget: Some("40h".into()),
            },
            mutation::PhaseInput {
                name: "Writing".into(),
                end_date: None,
                budget: None,
            },
        ];
        let p = mutation::create(&mut conn, &input("p"), "conference", Some(&edited)).unwrap();
        let modules = query::modules(&conn, p.id).unwrap();
        assert_eq!(modules[0].budget_minutes, Some(2400));
        assert_eq!(modules[1].end_date, None);

        let m =
            mutation::set_phase(&conn, modules[1].id, &Some("2026-12-01".into()), &None).unwrap();
        assert_eq!(
            (m.end_date.as_deref(), m.budget_minutes),
            (Some("2026-12-01"), None)
        );
        assert!(mutation::set_phase(&conn, m.id, &Some("soon".into()), &None).is_err());
        assert!(mutation::set_phase(&conn, m.id, &None, &Some("lots".into())).is_err());
        assert!(mutation::set_phase(&conn, 999, &None, &None).is_err());

        let bad = [mutation::PhaseInput {
            name: " ".into(),
            end_date: None,
            budget: None,
        }];
        assert!(mutation::create(&mut conn, &input("p"), "blank", Some(&bad)).is_err());
    }

    #[test]
    fn input_is_checked() {
        let mut conn = open_in_memory();
        let mut bad = input("x");
        bad.color = "blue".into();
        assert!(mutation::create(&mut conn, &bad, "blank", None).is_err());
        let mut bad = input("x");
        bad.start_date = Some("2027-01-01".into());
        assert!(mutation::create(&mut conn, &bad, "blank", None).is_err());
        let mut bad = input("x");
        bad.buffer_days = -1;
        assert!(mutation::create(&mut conn, &bad, "blank", None).is_err());
    }

    #[test]
    fn totals_follow_task_estimates() {
        let mut conn = open_in_memory();
        let p = mutation::create(&mut conn, &input("thesis"), "thesis", None).unwrap();
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
        // Plan date = Dec 20 minus 3 buffer days.
        assert_eq!(p.plan_date.as_deref(), Some("2026-12-17"));

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
        let p = mutation::create(&mut conn, &input("grant"), "grant", None).unwrap();
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
