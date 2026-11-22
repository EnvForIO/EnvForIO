//! What EnvForIO does as a desktop app, outside its commands: the tray and
//! its menu window, the Todo Duo windows (mini mode), the machine monitor's
//! sampling thread, and the background refresh of subscribed calendars and
//! RSS feeds.

pub mod duo;
pub mod monitor;
pub mod refresh;
pub mod tray;
#[cfg(not(target_os = "linux"))]
pub mod tray_menu;
