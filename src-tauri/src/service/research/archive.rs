//! Every idea and paper as one JSON file: each idea with its notes, steps,
//! links, todos, problems, log and attached papers, then the paper library.
//! Read-only: EnvIO does not import it back.

use rusqlite::Connection;
use serde::Serialize;

use crate::entity::idea::{Idea, IdeaLink, IdeaStep, Tag};
use crate::entity::paper::{Paper, PaperRelation};
use crate::errors::{AppError, AppResult};
use crate::service::ideas::notes::{self, IdeaLog, IdeaProblem, IdeaTodo};
use crate::service::ideas::query::{self as ideas, IdeaFilter};
use crate::service::papers::query::{self as papers, PaperFilter};

const FORMAT: &str = "envio-research";
const VERSION: u32 = 1;

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AttachedPaper {
    pub paper_id: i64,
    pub title: String,
    pub relation: PaperRelation,
    pub note: String,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct IdeaRecord {
    #[serde(flatten)]
    pub idea: Idea,
    pub notes: String,
    pub steps: Vec<IdeaStep>,
    pub links: Vec<IdeaLink>,
    pub todos: Vec<IdeaTodo>,
    pub problems: Vec<IdeaProblem>,
    pub log: Vec<IdeaLog>,
    pub papers: Vec<AttachedPaper>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Archive {
    pub format: &'static str,
    pub version: u32,
    pub exported_at: String,
    pub tags: Vec<Tag>,
    pub ideas: Vec<IdeaRecord>,
    pub papers: Vec<Paper>,
}

pub fn archive(conn: &Connection, exported_at: &str) -> AppResult<Archive> {
    let mut records = Vec::new();
    for idea in ideas::list(conn, &IdeaFilter::default())? {
        let id = idea.id;
        records.push(IdeaRecord {
            notes: notes::notes(conn, id)?,
            steps: ideas::steps(conn, id)?,
            links: ideas::links(conn, id)?,
            todos: notes::todos(conn, id)?,
            problems: notes::problems(conn, id)?,
            log: notes::logs(conn, id)?,
            papers: papers::idea_papers(conn, id)?
                .into_iter()
                .map(|a| AttachedPaper {
                    paper_id: a.paper.id,
                    title: a.paper.title,
                    relation: a.relation,
                    note: a.note,
                })
                .collect(),
            idea,
        });
    }
    Ok(Archive {
        format: FORMAT,
        version: VERSION,
        exported_at: exported_at.to_string(),
        tags: ideas::tags(conn)?,
        ideas: records,
        papers: papers::list(conn, &PaperFilter::default())?,
    })
}

pub fn to_json(archive: &Archive) -> AppResult<String> {
    serde_json::to_string_pretty(archive)
        .map_err(|e| AppError::invalid(format!("could not write JSON: {e}")))
}
