//! Which calendar day "now" belongs to.
//!
//! A new day starts at midnight by default, like the calendar. People who
//! work late can move the rollover (Preferences → Planning → Day start, e.g.
//! 04:00), and then working until 01:30 still counts as the previous day.
//! The rollover is a setting; it is loaded at startup and kept here so that
//! `today()` needs no database.

use std::sync::atomic::{AtomicU32, Ordering};

use chrono::{DateTime, Duration, Local, NaiveDate, NaiveDateTime, NaiveTime, Timelike};

/// The default start of a new day: midnight.
pub const DEFAULT_DAY_START: NaiveTime = NaiveTime::MIN;

/// The current rollover, in minutes after midnight.
static DAY_START_MINUTES: AtomicU32 = AtomicU32::new(0);

pub fn set_day_start(time: NaiveTime) {
    DAY_START_MINUTES.store(time.hour() * 60 + time.minute(), Ordering::Relaxed);
}

pub fn day_start() -> NaiveTime {
    let m = DAY_START_MINUTES.load(Ordering::Relaxed);
    NaiveTime::from_hms_opt(m / 60, m % 60, 0).unwrap_or(DEFAULT_DAY_START)
}

/// The EnvForIO day a UTC RFC 3339 timestamp (`done_at` and friends) falls on.
pub fn day_of_timestamp(timestamp: &str) -> Option<NaiveDate> {
    let utc = DateTime::parse_from_rfc3339(timestamp).ok()?;
    Some(day_of(utc.with_timezone(&Local).naive_local(), day_start()))
}

/// The EnvForIO day that a local date-time falls in.
pub fn day_of(local: NaiveDateTime, day_start: NaiveTime) -> NaiveDate {
    if local.time() < day_start {
        local.date() - Duration::days(1)
    } else {
        local.date()
    }
}

/// Today as EnvForIO sees it, formatted 'YYYY-MM-DD' like the database stores dates.
pub fn today() -> String {
    day_of(Local::now().naive_local(), day_start()).to_string()
}

/// The current time as an RFC 3339 UTC timestamp, for `created_at` and friends.
pub fn now_timestamp() -> String {
    chrono::Utc::now().to_rfc3339()
}

#[cfg(test)]
mod tests {
    use super::*;

    fn at(date: &str, time: &str) -> NaiveDateTime {
        NaiveDateTime::parse_from_str(&format!("{date} {time}"), "%Y-%m-%d %H:%M").unwrap()
    }

    fn seven() -> NaiveTime {
        NaiveTime::from_hms_opt(7, 0, 0).unwrap()
    }

    #[test]
    fn by_default_the_day_changes_at_midnight() {
        assert_eq!(
            day_of(at("2026-11-22", "00:00"), DEFAULT_DAY_START).to_string(),
            "2026-11-22"
        );
        assert_eq!(
            day_of(at("2026-11-21", "23:59"), DEFAULT_DAY_START).to_string(),
            "2026-11-21"
        );
    }

    #[test]
    fn before_a_later_rollover_is_still_yesterday() {
        assert_eq!(
            day_of(at("2026-11-20", "01:30"), seven()).to_string(),
            "2026-11-19"
        );
        assert_eq!(
            day_of(at("2026-11-20", "06:59"), seven()).to_string(),
            "2026-11-19"
        );
    }

    #[test]
    fn from_the_rollover_on_it_is_today() {
        assert_eq!(
            day_of(at("2026-11-20", "07:00"), seven()).to_string(),
            "2026-11-20"
        );
        assert_eq!(
            day_of(at("2026-11-20", "23:59"), seven()).to_string(),
            "2026-11-20"
        );
    }

    #[test]
    fn rollover_crosses_month_and_year() {
        assert_eq!(
            day_of(at("2027-01-01", "03:00"), seven()).to_string(),
            "2026-12-31"
        );
    }
}
