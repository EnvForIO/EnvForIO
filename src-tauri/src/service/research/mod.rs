//! The research side as a whole: the overview page (`overview`) and the
//! JSON archive of every idea and paper (`archive`).

pub mod archive;
pub mod overview;

#[cfg(test)]
mod tests {
    use rusqlite::params;

    use super::{archive, overview};
    use crate::db::open_in_memory;
    use crate::domain::paper_ref::PaperMeta;
    use crate::entity::idea::IdeaStatus;
    use crate::entity::paper::PaperRelation;
    use crate::service::ideas::mutation::{self as ideas, IdeaUpdate};
    use crate::service::ideas::notes;
    use crate::service::papers::mutation as papers;

    #[test]
    fn the_overview_sums_up_ideas_deadlines_and_papers() {
        let mut conn = open_in_memory();
        let idea = ideas::create(&mut conn, "stomata").unwrap();
        ideas::update(
            &mut conn,
            idea.id,
            &IdeaUpdate {
                title: "stomata".into(),
                description: String::new(),
                status: IdeaStatus::Writing,
                priority: 2,
                is_pinned: false,
                venue: "MICCAI".into(),
                deadline: Some("2026-12-01".into()),
                tag_ids: vec![],
            },
        )
        .unwrap();
        ideas::create(&mut conn, "spark only").unwrap();
        notes::add_todo(&conn, idea.id, "rerun baseline", Some("2026-11-25".into())).unwrap();
        notes::add_problem(&conn, idea.id, "noisy labels").unwrap();
        conn.execute(
            "INSERT INTO projects (name, deadline, created_at, updated_at)
             VALUES ('Thesis', '2026-11-30', '', '')",
            [],
        )
        .unwrap();
        conn.execute(
            "INSERT INTO tasks (title, due_date, created_at, updated_at)
             VALUES ('Old', '2026-01-01', '', ''), ('Review', '2026-11-20', '', '')",
            [],
        )
        .unwrap();
        papers::insert(
            &conn,
            &PaperMeta {
                title: "Leaves".into(),
                ..PaperMeta::default()
            },
        )
        .unwrap();

        let o = overview::overview(&conn, "2026-11-19").unwrap();
        assert_eq!(
            (o.unfinished, o.open_todos, o.open_problems, o.to_read),
            (2, 1, 1, 1)
        );
        assert!(o.by_status.contains(&(IdeaStatus::Writing, 1)));
        assert_eq!(o.active.len(), 1);
        // Sorted by date; a task overdue for more than a month is left out.
        let dates: Vec<(&str, i64)> = o
            .deadlines
            .iter()
            .map(|d| (d.title.as_str(), d.days_left))
            .collect();
        // An idea's dated todo is a task, so it is a deadline too.
        assert_eq!(
            dates,
            vec![
                ("Review", 1),
                ("rerun baseline", 6),
                ("Thesis", 11),
                ("stomata", 12)
            ]
        );
        assert_eq!(o.todos[0].idea_title, "stomata");
        assert_eq!(o.problems[0].problem, "noisy labels");
    }

    #[test]
    fn an_ideas_target_conference_is_a_deadline_until_it_has_a_project() {
        use crate::domain::conference::{parse_all, tests::SAMPLE};
        use crate::entity::conference::RoundRef;
        use crate::service::conferences;
        use crate::service::projects::mutation::ProjectInput;

        let mut conn = open_in_memory();
        conferences::replace_all(&mut conn, &parse_all(SAMPLE).unwrap(), "").unwrap();
        let idea = ideas::create(&mut conn, "sparse attention").unwrap();
        let update = |venue: &str| IdeaUpdate {
            title: "sparse attention".into(),
            description: String::new(),
            status: IdeaStatus::Researching,
            priority: 0,
            is_pinned: false,
            venue: venue.into(),
            deadline: None,
            tag_ids: vec![],
        };
        ideas::update(&mut conn, idea.id, &update("nips")).unwrap();

        let o = overview::overview(&conn, "2026-11-19").unwrap();
        let d = &o.deadlines[0];
        assert_eq!(d.kind, overview::DeadlineKind::Conference);
        assert_eq!((d.id, d.title.as_str()), (idea.id, "NeurIPS 2099"));
        assert_eq!(d.detail, "sparse attention");

        // A journal, or an unknown name: nothing.
        ideas::update(&mut conn, idea.id, &update("PLOS ONE")).unwrap();
        assert!(overview::overview(&conn, "2026-11-19")
            .unwrap()
            .deadlines
            .is_empty());

        // Once the edition has a project, the project's deadline stands for it.
        ideas::update(&mut conn, idea.id, &update("NeurIPS")).unwrap();
        let round = RoundRef {
            key: "nips".into(),
            edition_id: "nips99".into(),
            stage: 0,
        };
        let input = ProjectInput {
            name: "NeurIPS 2099".into(),
            color: "#f97316".into(),
            start_date: None,
            deadline: None,
            buffer_days: 0,
            is_archived: false,
        };
        conferences::create_project(&mut conn, &input, &[], &round, "2026-11-19", Some(idea.id))
            .unwrap();
        let kinds: Vec<_> = overview::overview(&conn, "2026-11-19")
            .unwrap()
            .deadlines
            .into_iter()
            .map(|d| d.kind)
            .collect();
        assert!(!kinds.contains(&overview::DeadlineKind::Conference));
        assert!(kinds.contains(&overview::DeadlineKind::Project));
    }

    #[test]
    fn the_archive_holds_every_idea_with_its_papers() {
        let mut conn = open_in_memory();
        let idea = ideas::create(&mut conn, "stomata").unwrap();
        notes::add_log(&conn, idea.id, "started", "2026-11-19").unwrap();
        let paper = papers::insert(
            &conn,
            &PaperMeta {
                title: "Leaves".into(),
                ..PaperMeta::default()
            },
        )
        .unwrap();
        papers::link(
            &conn,
            idea.id,
            paper.id,
            PaperRelation::Baseline,
            "same data",
        )
        .unwrap();
        conn.execute(
            "UPDATE ideas SET notes = '$x$' WHERE id = ?1",
            params![idea.id],
        )
        .unwrap();

        let a = archive::archive(&conn, "2026-11-19T00:00:00Z").unwrap();
        assert_eq!((a.ideas.len(), a.papers.len()), (1, 1));
        let json = archive::to_json(&a).unwrap();
        for part in [
            "\"format\": \"envio-research\"",
            "\"notes\": \"$x$\"",
            "\"text\": \"started\"",
            "\"relation\": \"Baseline\"",
            "\"note\": \"same data\"",
        ] {
            assert!(json.contains(part), "{part} missing from {json}");
        }
    }
}
