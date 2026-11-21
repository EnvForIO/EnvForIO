//! Built-in project templates: the modules a new project starts with. A
//! module with `days_before` is a phase that ends that many days before the
//! project's deadline: a project's time is split into phases instead of
//! milestone tasks. The new-project dialog shows
//! the phases with their dates and lets the user change them first.
//! Module names are English constants; template names are translated in the UI.

use serde::Serialize;
use specta::Type;

#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct TemplatePhase {
    pub name: &'static str,
    pub days_before: Option<u32>, // None = a module without an end date
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct ProjectTemplate {
    pub id: &'static str,
    pub phases: &'static [TemplatePhase],
}

const fn ends(name: &'static str, days_before: u32) -> TemplatePhase {
    TemplatePhase {
        name,
        days_before: Some(days_before),
    }
}

const fn open(name: &'static str) -> TemplatePhase {
    TemplatePhase {
        name,
        days_before: None,
    }
}

/// A paper's phases, the same for a conference or a journal.
const PAPER: &[TemplatePhase] = &[
    ends("Experiments", 21),
    ends("Writing", 7),
    ends("Revise and submit", 0),
];

pub const TEMPLATES: &[ProjectTemplate] = &[
    ProjectTemplate {
        id: "blank",
        phases: &[],
    },
    ProjectTemplate {
        id: "conference",
        phases: PAPER,
    },
    ProjectTemplate {
        id: "journal",
        phases: PAPER,
    },
    ProjectTemplate {
        id: "proposal",
        phases: &[
            ends("Literature review", 30),
            ends("Proposal", 7),
            ends("Presentation", 0),
        ],
    },
    ProjectTemplate {
        id: "grant",
        phases: &[
            open("Background"),
            open("Aims"),
            open("Budget"),
            open("Writing"),
            open("Review and submit"),
        ],
    },
    ProjectTemplate {
        id: "thesis",
        phases: &[
            open("Outline"),
            open("Draft"),
            open("Revisions"),
            open("Defense preparation"),
        ],
    },
];

pub fn find(id: &str) -> Option<&'static ProjectTemplate> {
    TEMPLATES.iter().find(|t| t.id == id)
}
