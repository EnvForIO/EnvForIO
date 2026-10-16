//! Commands the frontend can call, one file per resource.
//! They only receive requests and return results; the work happens in `service`.
//!
//! The template's own commands (preferences, quick pane, recovery, notifications)
//! still live in `commands/` until they are moved here.

pub mod plans;
pub mod projects;
pub mod tasks;
