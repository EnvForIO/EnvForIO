//! What EnvForIO does as a desktop app, outside its commands: the tray, the
//! Todo Duo windows (mini mode), the machine monitor's sampling thread, and
//! the background refresh of subscribed calendars and RSS feeds.

pub mod duo;
pub mod monitor;
pub mod refresh;
pub mod tray;
