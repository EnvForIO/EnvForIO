//! Built-in project templates: the modules a new project starts with.
//! Module names are English constants; the template names are translated in the UI.

use serde::Serialize;
use specta::Type;

#[derive(Debug, Clone, Serialize, Type)]
pub struct ProjectTemplate {
    pub id: &'static str,
    pub modules: &'static [&'static str],
}

pub const TEMPLATES: &[ProjectTemplate] = &[
    ProjectTemplate {
        id: "blank",
        modules: &[],
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
    },
    ProjectTemplate {
        id: "thesis",
        modules: &["Outline", "Draft", "Revisions", "Defense preparation"],
    },
];

pub fn find(id: &str) -> Option<&'static ProjectTemplate> {
    TEMPLATES.iter().find(|t| t.id == id)
}
