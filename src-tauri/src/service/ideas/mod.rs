//! Research ideas (Seedbank): status pipeline, priority, tags, target venue,
//! the research checklist and links. Reads in `query`, idea and tag writes
//! in `mutation`, steps and links in `parts`.

pub mod mutation;
pub mod parts;
pub mod query;

#[cfg(test)]
mod tests {
    use super::mutation::{self, IdeaUpdate};
    use super::{parts, query};
    use crate::db::open_in_memory;
    use crate::entity::idea::IdeaStatus;
    use crate::service::ideas::query::IdeaFilter;

    fn edit(title: &str, status: IdeaStatus, tags: Vec<i64>) -> IdeaUpdate {
        IdeaUpdate {
            title: title.into(),
            description: String::new(),
            status,
            priority: 2,
            is_pinned: false,
            venue: "MICCAI".into(),
            deadline: Some("2027-03-01".into()),
            tag_ids: tags,
        }
    }

    #[test]
    fn a_new_idea_has_the_eight_steps_and_progress_follows_them() {
        let mut conn = open_in_memory();
        let idea = mutation::create(&mut conn, "leaf stomata and heat").unwrap();
        assert_eq!(
            (idea.status, idea.step_count, idea.steps_done),
            (IdeaStatus::Spark, 8, 0)
        );
        assert_eq!(idea.current_step.as_deref(), Some("Literature review"));

        let steps = query::steps(&conn, idea.id).unwrap();
        parts::set_step_done(&conn, steps[0].id, true, "2026-11-20").unwrap();
        let idea = query::get(&conn, idea.id).unwrap();
        assert_eq!(
            (idea.steps_done, idea.current_step.as_deref()),
            (1, Some("Hypothesis"))
        );
        assert_eq!(
            query::steps(&conn, idea.id).unwrap()[0].done_on.as_deref(),
            Some("2026-11-20")
        );
    }

    #[test]
    fn filters_counts_and_tags() {
        let mut conn = open_in_memory();
        let ml = mutation::create_tag(&conn, "ML", "#3b82f6").unwrap();
        assert_eq!(
            mutation::create_tag(&conn, "ML", "#000000").unwrap().id,
            ml.id
        ); // same name, same tag
        let a = mutation::create(&mut conn, "a").unwrap();
        let b = mutation::create(&mut conn, "b").unwrap();
        mutation::update(
            &mut conn,
            a.id,
            &edit("a", IdeaStatus::Writing, vec![ml.id]),
        )
        .unwrap();
        mutation::update(&mut conn, b.id, &edit("b", IdeaStatus::Done, vec![])).unwrap();

        let writing = IdeaFilter {
            status: Some(IdeaStatus::Writing),
            ..IdeaFilter::default()
        };
        assert_eq!(query::list(&conn, &writing).unwrap().len(), 1);
        let open = IdeaFilter {
            unfinished: true,
            ..IdeaFilter::default()
        };
        assert_eq!(query::list(&conn, &open).unwrap()[0].title, "a");
        let tagged = IdeaFilter {
            tag_id: Some(ml.id),
            ..IdeaFilter::default()
        };
        assert_eq!(query::list(&conn, &tagged).unwrap()[0].tags[0].name, "ML");

        let counts = query::counts(&conn).unwrap();
        assert_eq!((counts.all, counts.unfinished, counts.pinned), (2, 1, 0));
        assert_eq!(counts.by_tag, vec![(ml.id, 1)]);
        assert!(counts.by_status.contains(&(IdeaStatus::Done, 1)));

        let mut bad = edit("a", IdeaStatus::Spark, vec![]);
        bad.priority = 9;
        assert!(mutation::update(&mut conn, a.id, &bad).is_err());
        mutation::delete(&conn, a.id).unwrap();
        assert!(query::get(&conn, a.id).is_err());
    }

    #[test]
    fn links_must_be_web_addresses() {
        let mut conn = open_in_memory();
        let idea = mutation::create(&mut conn, "x").unwrap();
        let link =
            parts::add_link(&conn, idea.id, "", "https://www.overleaf.com/project/1").unwrap();
        assert_eq!(link.label, "https://www.overleaf.com/project/1");
        assert!(parts::add_link(&conn, idea.id, "x", "file:///etc/passwd").is_err());
        assert_eq!(query::links(&conn, idea.id).unwrap().len(), 1);
    }
}
