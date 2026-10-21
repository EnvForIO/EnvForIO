//! Which days a statistics period covers: a week (Monday first), a calendar
//! month or a calendar year, `offset` periods before or after today's.

use chrono::{Datelike, Duration, NaiveDate};
use serde::{Deserialize, Serialize};
use specta::Type;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Type)]
pub enum Period {
    Week,
    Month,
    Year,
}

fn month_start(year: i32, month0: i32) -> NaiveDate {
    let y = year + month0.div_euclid(12);
    let m = month0.rem_euclid(12) as u32 + 1;
    NaiveDate::from_ymd_opt(y, m, 1).expect("the first of a month exists")
}

/// First and last day (inclusive) of the period.
pub fn bounds(period: Period, today: NaiveDate, offset: i32) -> (NaiveDate, NaiveDate) {
    match period {
        Period::Week => {
            let monday = today - Duration::days(i64::from(today.weekday().num_days_from_monday()));
            let first = monday + Duration::weeks(i64::from(offset));
            (first, first + Duration::days(6))
        }
        Period::Month => {
            let month0 = today.month0() as i32 + offset;
            let first = month_start(today.year(), month0);
            (
                first,
                month_start(today.year(), month0 + 1) - Duration::days(1),
            )
        }
        Period::Year => {
            let y = today.year() + offset;
            (
                NaiveDate::from_ymd_opt(y, 1, 1).expect("Jan 1"),
                NaiveDate::from_ymd_opt(y, 12, 31).expect("Dec 31"),
            )
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn d(s: &str) -> NaiveDate {
        NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap()
    }

    #[test]
    fn periods_and_offsets() {
        let today = d("2026-11-19"); // a Thursday
        assert_eq!(
            bounds(Period::Week, today, 0),
            (d("2026-11-16"), d("2026-11-22"))
        );
        assert_eq!(
            bounds(Period::Week, today, -1),
            (d("2026-11-09"), d("2026-11-15"))
        );
        assert_eq!(
            bounds(Period::Month, today, 0),
            (d("2026-11-01"), d("2026-11-30"))
        );
        assert_eq!(
            bounds(Period::Month, today, 2),
            (d("2027-01-01"), d("2027-01-31"))
        );
        assert_eq!(
            bounds(Period::Month, today, -11),
            (d("2025-12-01"), d("2025-12-31"))
        );
        assert_eq!(
            bounds(Period::Year, today, -1),
            (d("2025-01-01"), d("2025-12-31"))
        );
    }
}
