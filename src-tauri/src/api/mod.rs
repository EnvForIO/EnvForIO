//! Commands the frontend can call, one file per resource.
//! They only receive requests and return results; the work happens in `service`.
//!
//! The template's own commands (preferences, quick pane, recovery, notifications)
//! still live in `commands/` until they are moved here.

pub mod calendar;
pub mod export;
pub mod ideas;
pub mod monitor;
pub mod papers;
pub mod plans;
pub mod projects;
pub mod research;
pub mod stats;
pub mod tasks;
pub mod timer;
pub mod windows;
