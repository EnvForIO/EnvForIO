//! The paper library (Seedbank): papers looked up by DOI or arXiv id or
//! typed by hand, reading status, notes, BibTeX, and papers attached to
//! ideas. Network in `fetch`. PDFs stay in the user's reference manager.

pub mod fetch;
pub mod mutation;
pub mod query;

#[cfg(test)]
mod tests {
    use super::mutation::{self, PaperUpdate};
    use super::query::{self, PaperFilter};
    use crate::db::open_in_memory;
    use crate::domain::paper_ref::PaperMeta;
    use crate::entity::paper::{PaperRelation, ReadingStatus};
    use crate::service::ideas::mutation as ideas;

    fn meta(title: &str, doi: Option<&str>) -> PaperMeta {
        PaperMeta {
            title: title.into(),
            authors: vec!["Ada Lovelace".into(), "Charles Babbage".into()],
            year: Some(1843),
            venue: "Taylor's Scientific Memoirs".into(),
            kind: "article".into(),
            doi: doi.map(str::to_string),
            ..PaperMeta::default()
        }
    }

    #[test]
    fn the_same_doi_is_one_paper_and_filters_find_it() {
        let conn = open_in_memory();
        let a = mutation::insert(&conn, &meta("Notes on the engine", Some("10.1/x"))).unwrap();
        let again = mutation::insert(&conn, &meta("Other title", Some("10.1/x"))).unwrap();
        assert_eq!(a.id, again.id);
        assert_eq!(a.authors, vec!["Ada Lovelace", "Charles Babbage"]);
        assert_eq!(a.status, ReadingStatus::ToRead);
        mutation::insert(&conn, &meta("By hand", None)).unwrap();

        let search = PaperFilter {
            search: Some("babbage".into()),
            ..PaperFilter::default()
        };
        assert_eq!(query::list(&conn, &search).unwrap().len(), 2);

        mutation::update(
            &conn,
            a.id,
            &PaperUpdate {
                title: "Notes on the engine".into(),
                authors: vec!["Ada Lovelace".into(), " ".into()],
                year: Some(1843),
                venue: String::new(),
                status: ReadingStatus::Read,
                notes: "$x^2$".into(),
            },
        )
        .unwrap();
        let read = PaperFilter {
            status: Some(ReadingStatus::Read),
            ..PaperFilter::default()
        };
        let found = query::list(&conn, &read).unwrap();
        assert_eq!((found.len(), found[0].authors.len()), (1, 1));
        let counts = query::counts(&conn).unwrap();
        assert_eq!(counts.all, 2);
        assert!(counts.by_status.contains(&(ReadingStatus::ToRead, 1)));
        assert!(query::bibtex(&conn, a.id)
            .unwrap()
            .starts_with("@article{lovelace1843notes,"));
    }

    #[test]
    fn papers_attach_to_ideas_once_and_go_with_either() {
        let mut conn = open_in_memory();
        let idea = ideas::create(&mut conn, "stomata").unwrap();
        let paper = mutation::insert(&conn, &meta("Leaves", None)).unwrap();
        mutation::link(&conn, idea.id, paper.id, PaperRelation::Baseline, "").unwrap();
        mutation::link(
            &conn,
            idea.id,
            paper.id,
            PaperRelation::Competing,
            " same data ",
        )
        .unwrap();

        let attached = query::idea_papers(&conn, idea.id).unwrap();
        assert_eq!(attached.len(), 1);
        assert_eq!(
            (attached[0].relation, attached[0].note.as_str()),
            (PaperRelation::Competing, "same data")
        );
        assert_eq!(query::get(&conn, paper.id).unwrap().idea_count, 1);
        assert_eq!(
            query::paper_ideas(&conn, paper.id).unwrap()[0].title,
            "stomata"
        );
        assert!(mutation::link(&conn, 999, paper.id, PaperRelation::Baseline, "").is_err());

        mutation::delete(&conn, paper.id).unwrap();
        assert!(query::idea_papers(&conn, idea.id).unwrap().is_empty());
    }
}
