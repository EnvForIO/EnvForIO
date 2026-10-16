//! Input checks shared by every service: names, dates, typed estimates.

use chrono::NaiveDate;

use crate::domain::duration::parse_minutes;
use crate::errors::{AppError, AppResult};

/// A trimmed, non-empty name or title.
pub fn clean_name(name: &str) -> AppResult<String> {
    let name = name.trim();
    if name.is_empty() {
        return Err(AppError::invalid("name is empty"));
    }
    Ok(name.to_string())
}

/// None, or a real 'YYYY-MM-DD' date.
pub fn check_date(date: &Option<String>) -> AppResult<()> {
    if let Some(d) = date {
        NaiveDate::parse_from_str(d, "%Y-%m-%d")
            .map_err(|_| AppError::invalid(format!("not a date: {d}")))?;
    }
    Ok(())
}

/// A typed estimate in minutes; empty means "no estimate", anything else must parse.
pub fn estimate_minutes(text: &Option<String>) -> AppResult<Option<i64>> {
    match text.as_deref().map(str::trim) {
        None | Some("") => Ok(None),
        Some(t) => parse_minutes(t)
            .map(Some)
            .ok_or_else(|| AppError::invalid(format!("not a duration: {t}"))),
    }
}
