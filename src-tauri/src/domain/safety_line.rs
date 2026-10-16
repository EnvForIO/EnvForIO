//! The daily safety line: how many minutes each project needs on each day
//! so that it finishes on time. Rules (docs/PLAN.md, "Safety line algorithm"):
//!
//! 1. Only work days count: a day with 0 available minutes is a rest day.
//! 2. Aim for the plan date (deadline minus buffer); once that has passed,
//!    aim for the real deadline. Past the deadline, everything is due today.
//! 3. Without levelling, a project needs remaining / work days in its window.
//! 4. With levelling (default), remaining work is cut into 15-minute chunks,
//!    earliest deadline first, and each chunk goes on the lightest day in the
//!    project's window that still has room; if no day has room, on the day
//!    that is least full relative to its capacity.
//! 5. "Earliest first" (off by default) squeezes the earliest project into
//!    the first 70% of its window and the second into the first 85%.
//!
//! Pure: callers pass in "today", capacities and remaining minutes.

use std::collections::BTreeMap;

use chrono::{Duration, NaiveDate};

pub const CHUNK: i64 = 15; // minutes

#[derive(Debug, Clone)]
pub struct ProjectWork {
    pub id: i64,
    pub start: Option<NaiveDate>,
    pub deadline: NaiveDate,
    pub buffer_days: i64,
    pub remaining: i64, // minutes of estimated work not yet done
}

#[derive(Debug, Clone, Copy)]
pub struct Options {
    pub level: bool,
    pub earliest_first: bool,
}

impl Default for Options {
    fn default() -> Self {
        Self {
            level: true,
            earliest_first: false,
        }
    }
}

/// Minutes per (day, project id). Days and projects without work are absent.
pub type Allocation = BTreeMap<(NaiveDate, i64), i64>;

/// The days a project may use, in order: work days from max(today, start) to its target.
fn window(
    p: &ProjectWork,
    today: NaiveDate,
    squeeze: f64,
    capacity: &dyn Fn(NaiveDate) -> Option<i64>,
) -> Vec<NaiveDate> {
    if today > p.deadline {
        return vec![today]; // overdue: all of it today
    }
    let plan = p.deadline - Duration::days(p.buffer_days);
    let target = if today <= plan { plan } else { p.deadline };
    let from = p.start.map_or(today, |s| s.max(today));
    if from > target {
        return vec![today];
    }
    let span = (target - from).num_days() + 1;
    let used = ((span as f64 * squeeze).ceil() as i64).clamp(1, span);
    let days: Vec<_> = (0..used)
        .map(|i| from + Duration::days(i))
        .filter(|d| capacity(*d) != Some(0))
        .collect();
    if days.is_empty() {
        vec![today]
    } else {
        days
    }
}

pub fn allocate(
    today: NaiveDate,
    projects: &[ProjectWork],
    capacity: &dyn Fn(NaiveDate) -> Option<i64>,
    options: Options,
) -> Allocation {
    let mut order: Vec<&ProjectWork> = projects.iter().filter(|p| p.remaining > 0).collect();
    order.sort_by_key(|p| (p.deadline - Duration::days(p.buffer_days), p.id));

    let mut alloc = Allocation::new();
    let mut load: BTreeMap<NaiveDate, i64> = BTreeMap::new();
    for (rank, p) in order.iter().enumerate() {
        let squeeze = match (options.earliest_first, rank) {
            (true, 0) => 0.70,
            (true, 1) => 0.85,
            _ => 1.0,
        };
        let days = window(p, today, squeeze, capacity);
        if !options.level {
            spread_evenly(p, &days, &mut alloc);
            continue;
        }
        let mut left = p.remaining;
        while left > 0 {
            let chunk = left.min(CHUNK);
            let day = pick_day(&days, &load, chunk, capacity);
            *load.entry(day).or_default() += chunk;
            *alloc.entry((day, p.id)).or_default() += chunk;
            left -= chunk;
        }
    }
    alloc
}

/// remaining / days, the remainder going to the earliest days.
fn spread_evenly(p: &ProjectWork, days: &[NaiveDate], alloc: &mut Allocation) {
    let n = days.len() as i64;
    for (i, day) in days.iter().enumerate() {
        let share = p.remaining / n + i64::from((i as i64) < p.remaining % n);
        if share > 0 {
            *alloc.entry((*day, p.id)).or_default() += share;
        }
    }
}

/// The lightest day with room for the chunk; else the least full for its size. Ties: earliest.
fn pick_day(
    days: &[NaiveDate],
    load: &BTreeMap<NaiveDate, i64>,
    chunk: i64,
    capacity: &dyn Fn(NaiveDate) -> Option<i64>,
) -> NaiveDate {
    let load_on = |d: &NaiveDate| load.get(d).copied().unwrap_or(0);
    let fits = days
        .iter()
        .filter(|d| capacity(**d).is_none_or(|cap| load_on(d) + chunk <= cap))
        .min_by_key(|d| (load_on(d), **d));
    if let Some(day) = fits {
        return *day;
    }
    // Everything is full: overflow onto the day with the lowest load / capacity.
    *days
        .iter()
        .min_by(|a, b| {
            let ratio =
                |d: &NaiveDate| load_on(d) as f64 / capacity(*d).unwrap_or(i64::MAX).max(1) as f64;
            ratio(a).total_cmp(&ratio(b)).then(a.cmp(b))
        })
        .expect("a window always has at least one day")
}

#[cfg(test)]
#[path = "safety_line_tests.rs"]
mod tests;
