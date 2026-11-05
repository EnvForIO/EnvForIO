//! Built-in project templates: the modules a new project starts with and,
//! for deadline templates (paper submission, proposal; user decision
//! 2026-11-20), milestone tasks dated back from the project's deadline.
//! The offsets are built in; the tasks made are ordinary tasks to edit.
//! Module and milestone names are English constants; the template names
//! are translated in the UI.

use serde::Serialize;
use specta::Type;

/// A task a template adds, due `days_before` the deadline, in `module`.
#[derive(Debug, Clone, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct Milestone {
    pub title: &'static str,
    pub days_before: u32,
    pub module: &'static str,
}

#[derive(Debug, Clone, Serialize, Type)]
pub struct ProjectTemplate {
    pub id: &'static str,
    pub modules: &'static [&'static str],
    pub milestones: &'static [Milestone],
}

const fn m(title: &'static str, days_before: u32, module: &'static str) -> Milestone {
    Milestone {
        title,
        days_before,
        module,
    }
}

pub const TEMPLATES: &[ProjectTemplate] = &[
    ProjectTemplate {
        id: "blank",
        modules: &[],
        milestones: &[],
    },
    ProjectTemplate {
        id: "paper",
        modules: &[
            "Literature review",
            "Method",
            "Experiments",
            "Writing",
            "Submission",
        ],
        milestones: &[
            m("Experiments done", 21, "Experiments"),
            m("Full draft", 14, "Writing"),
            m("Advisor review", 7, "Writing"),
            m("Final check and submit", 1, "Submission"),
        ],
    },
    ProjectTemplate {
        id: "proposal",
        modules: &["Literature review", "Proposal", "Presentation"],
        milestones: &[
            m("Literature review done", 30, "Literature review"),
            m("Proposal draft", 14, "Proposal"),
            m("Advisor sign-off", 7, "Proposal"),
            m("Slides", 3, "Presentation"),
            m("Rehearsal", 1, "Presentation"),
        ],
    },
    ProjectTemplate {
        id: "grant",
        modules: &[
            "Background",
            "Aims",
            "Budget",
            "Writing",
            "Review and submit",
        ],
        milestones: &[],
    },
    ProjectTemplate {
        id: "thesis",
        modules: &["Outline", "Draft", "Revisions", "Defense preparation"],
        milestones: &[],
    },
];

pub fn find(id: &str) -> Option<&'static ProjectTemplate> {
    TEMPLATES.iter().find(|t| t.id == id)
}
