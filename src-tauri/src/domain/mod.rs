//! Pure computation: no database, no Tauri. Every rule here has tests.

/// The project's GitHub repository, "owner/name", as a literal for `concat!`
/// (bug reports and the update check both point at it).
macro_rules! github_repo {
    () => {
        "EnvForIO/EnvForIO"
    };
}

pub mod conference;
pub mod day;
pub mod duration;
pub mod feed;
pub mod feedback;
pub mod ics;
pub mod linux_monitor;
pub mod menu_position;
pub mod monitor;
pub mod paper_ref;
pub mod safety_line;
pub mod ssh_config;
pub mod time_parse;
pub mod updates;
pub mod windows_zones;
