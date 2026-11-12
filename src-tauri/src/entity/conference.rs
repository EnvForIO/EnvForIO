//! Conference deadlines as the UI receives them. Times are Unix
//! milliseconds (the UI shows them in local time); `None` = not announced.

use serde::{Deserialize, Serialize};
use specta::Type;

/// One round of submission: an optional abstract deadline, then the paper.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Stage {
    pub abstract_at: Option<i64>,
    pub deadline_at: Option<i64>,
    pub comment: String, // "Regular round", "Fast track"; often empty
}

/// One year of a conference.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Edition {
    pub id: String, // ccfddl's id, e.g. "nips25"
    pub year: i32,
    pub link: String,
    pub date: String, // when it is held, as ccfddl writes it
    pub place: String,
    pub timezone: String, // the deadlines' original zone, e.g. "AoE"
    pub stages: Vec<Stage>,
    /// The project planned for this edition, if the user made one.
    #[serde(default)]
    pub project_id: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Conference {
    pub key: String, // ccfddl's conference_key, e.g. "AI/nips"
    pub title: String,
    pub description: String,
    pub area: String, // ccfddl's area code: AI, CG, CT, DB, DS, HI, MX, NW, SC, SE
    pub ccf: String,  // CCF rank: A, B, C or N; "" if unranked
    pub core: String, // CORE rank: A*, A, B, C; "" if unranked
    pub editions: Vec<Edition>,
}

/// The round a conference project was made for, as ccfddl has it now (it
/// may have moved the deadline since).
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ProjectRound {
    pub title: String, // the conference, e.g. "NeurIPS"
    pub edition: Edition,
    pub stage: u32, // index into `edition.stages`
}

/// Which round of which conference a new project is for.
#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct RoundRef {
    pub key: String,
    pub edition_id: String,
    pub stage: u32,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct ConferenceList {
    /// When the list was last downloaded (RFC 3339); None = never.
    pub fetched_at: Option<String>,
    pub conferences: Vec<Conference>,
}
