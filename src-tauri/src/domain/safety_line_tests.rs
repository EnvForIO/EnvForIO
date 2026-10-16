//! Worked examples of the safety line rules; each test is one rule.

use super::*;

fn d(s: &str) -> NaiveDate {
    NaiveDate::parse_from_str(s, "%Y-%m-%d").unwrap()
}

fn project(id: i64, deadline: &str, buffer: i64, remaining: i64) -> ProjectWork {
    ProjectWork {
        id,
        start: None,
        deadline: d(deadline),
        buffer_days: buffer,
        remaining,
    }
}

fn on(alloc: &Allocation, day: &str, id: i64) -> i64 {
    alloc.get(&(d(day), id)).copied().unwrap_or(0)
}

const NO_LIMIT: fn(NaiveDate) -> Option<i64> = |_| None;
const EVEN: Options = Options {
    level: false,
    earliest_first: false,
};

// 2026-11-16 is a Monday.

#[test]
fn even_split_over_the_window_up_to_the_plan_date() {
    // Due Fri 20th with 1 buffer day: aim for Thu 19th, 4 days from Mon 16th.
    let alloc = allocate(
        d("2026-11-16"),
        &[project(1, "2026-11-20", 1, 240)],
        &NO_LIMIT,
        EVEN,
    );
    for day in ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"] {
        assert_eq!(on(&alloc, day, 1), 60, "{day}");
    }
    assert_eq!(on(&alloc, "2026-11-20", 1), 0);
}

#[test]
fn rest_days_are_skipped() {
    // Weekend is a rest day: Fri 20th to Mon 23rd has two work days.
    let weekend = |day: NaiveDate| (day == d("2026-11-21") || day == d("2026-11-22")).then_some(0);
    let alloc = allocate(
        d("2026-11-20"),
        &[project(1, "2026-11-23", 0, 120)],
        &weekend,
        EVEN,
    );
    assert_eq!(on(&alloc, "2026-11-20", 1), 60);
    assert_eq!(on(&alloc, "2026-11-21", 1), 0);
    assert_eq!(on(&alloc, "2026-11-23", 1), 60);
}

#[test]
fn past_the_plan_date_aim_for_the_deadline_and_past_that_everything_is_today() {
    // Plan date was the 17th; on the 18th the target falls back to the 20th.
    let late = allocate(
        d("2026-11-18"),
        &[project(1, "2026-11-20", 3, 90)],
        &NO_LIMIT,
        EVEN,
    );
    assert_eq!(
        on(&late, "2026-11-18", 1) + on(&late, "2026-11-19", 1) + on(&late, "2026-11-20", 1),
        90
    );
    assert_eq!(on(&late, "2026-11-18", 1), 30);

    let overdue = allocate(
        d("2026-11-21"),
        &[project(1, "2026-11-20", 0, 90)],
        &NO_LIMIT,
        EVEN,
    );
    assert_eq!(on(&overdue, "2026-11-21", 1), 90);
}

#[test]
fn a_project_that_has_not_started_waits() {
    let mut p = project(1, "2026-11-20", 0, 60);
    p.start = Some(d("2026-11-19"));
    let alloc = allocate(d("2026-11-16"), &[p], &NO_LIMIT, EVEN);
    assert_eq!(on(&alloc, "2026-11-16", 1), 0);
    assert_eq!(
        on(&alloc, "2026-11-19", 1) + on(&alloc, "2026-11-20", 1),
        60
    );
}

#[test]
fn levelling_fills_the_lightest_days_within_capacity() {
    // Two hours a day. Project 1 (due Tue) needs 3h; project 2 (due Thu) needs 3h.
    let two_hours = |_: NaiveDate| Some(120);
    let alloc = allocate(
        d("2026-11-16"),
        &[
            project(1, "2026-11-17", 0, 180),
            project(2, "2026-11-19", 0, 180),
        ],
        &two_hours,
        Options::default(),
    );
    // Project 1 goes first and splits Mon/Tue; project 2 then fills what is lightest.
    assert_eq!(
        on(&alloc, "2026-11-16", 1) + on(&alloc, "2026-11-17", 1),
        180
    );
    let total = |day| on(&alloc, day, 1) + on(&alloc, day, 2);
    for day in ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"] {
        assert!(total(day) <= 120, "{day} is over capacity");
    }
    assert_eq!(
        (1..=2)
            .map(
                |id| ["2026-11-16", "2026-11-17", "2026-11-18", "2026-11-19"]
                    .iter()
                    .map(|day| on(&alloc, day, id))
                    .sum::<i64>()
            )
            .sum::<i64>(),
        360
    );
}

#[test]
fn when_everything_is_full_it_overflows_instead_of_dropping_work() {
    let one_hour = |_: NaiveDate| Some(60);
    let alloc = allocate(
        d("2026-11-16"),
        &[project(1, "2026-11-17", 0, 180)],
        &one_hour,
        Options::default(),
    );
    assert_eq!(
        on(&alloc, "2026-11-16", 1) + on(&alloc, "2026-11-17", 1),
        180
    );
}

#[test]
fn earliest_first_squeezes_the_first_project() {
    let opts = Options {
        level: true,
        earliest_first: true,
    };
    // Ten-day window: 70% = first 7 days (16th..22nd).
    let alloc = allocate(
        d("2026-11-16"),
        &[project(1, "2026-11-25", 0, 600)],
        &NO_LIMIT,
        opts,
    );
    assert_eq!(
        on(&alloc, "2026-11-23", 1) + on(&alloc, "2026-11-24", 1) + on(&alloc, "2026-11-25", 1),
        0
    );
}

#[test]
fn nothing_left_means_no_line() {
    let alloc = allocate(
        d("2026-11-16"),
        &[project(1, "2026-11-20", 0, 0)],
        &NO_LIMIT,
        Options::default(),
    );
    assert!(alloc.is_empty());
}
