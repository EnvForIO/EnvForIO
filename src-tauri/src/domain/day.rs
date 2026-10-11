//! Which calendar day "now" belongs to.
//!
//! EnvIO's day starts at a rollover time (07:00 by default, as in DayEcho),
//! not at midnight: working until 01:30 still counts as the previous day.

use chrono::{Duration, Local, NaiveDate, NaiveDateTime, NaiveTime};

/// The default start of a new day.
pub const DEFAULT_DAY_START: NaiveTime = match NaiveTime::from_hms_opt(7, 0, 0) {
    Some(t) => t,
    None => panic!("07:00 is a valid time"),
};

/// The EnvIO day that a local date-time falls in.
pub fn day_of(local: NaiveDateTime, day_start: NaiveTime) -> NaiveDate {
    if local.time() < day_start {
        local.date() - Duration::days(1)
    } else {
        local.date()
    }
}

/// Today as EnvIO sees it, formatted 'YYYY-MM-DD' like the database stores dates.
pub fn today() -> String {
    day_of(Local::now().naive_local(), DEFAULT_DAY_START).to_string()
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

    #[test]
    fn before_the_rollover_is_still_yesterday() {
        assert_eq!(
            day_of(at("2026-11-20", "01:30"), DEFAULT_DAY_START).to_string(),
            "2026-11-19"
        );
        assert_eq!(
            day_of(at("2026-11-20", "06:59"), DEFAULT_DAY_START).to_string(),
            "2026-11-19"
        );
    }

    #[test]
    fn from_the_rollover_on_it_is_today() {
        assert_eq!(
            day_of(at("2026-11-20", "07:00"), DEFAULT_DAY_START).to_string(),
            "2026-11-20"
        );
        assert_eq!(
            day_of(at("2026-11-20", "23:59"), DEFAULT_DAY_START).to_string(),
            "2026-11-20"
        );
    }

    #[test]
    fn rollover_crosses_month_and_year() {
        assert_eq!(
            day_of(at("2027-01-01", "03:00"), DEFAULT_DAY_START).to_string(),
            "2026-12-31"
        );
    }
}
