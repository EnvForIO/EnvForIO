//! Typed estimates: "45m", "2h", "1h30m", "1.5h", or a bare number of minutes.

/// Minutes in a typed estimate, or None when it is not one.
/// Rounds to whole minutes; zero and negative estimates are rejected.
pub fn parse_minutes(text: &str) -> Option<i64> {
    let text = text.trim().to_lowercase().replace(' ', "");
    if text.is_empty() {
        return None;
    }
    if let Ok(minutes) = text.parse::<f64>() {
        return positive(minutes);
    }
    // "1h30m", "1.5h", "90m": an optional hours part, then an optional minutes part.
    let (hours, rest) = match text.split_once('h') {
        Some((h, rest)) => (h.parse::<f64>().ok()?, rest),
        None => (0.0, text.as_str()),
    };
    let minutes = match rest.strip_suffix('m').or(rest.strip_suffix("min")) {
        Some(m) if !m.is_empty() => m.parse::<f64>().ok()?,
        Some(_) => return None, // a bare "m"
        None if rest.is_empty() => 0.0,
        None => return None,
    };
    positive(hours * 60.0 + minutes)
}

fn positive(minutes: f64) -> Option<i64> {
    let rounded = minutes.round();
    (rounded >= 1.0 && rounded.is_finite()).then_some(rounded as i64)
}

#[cfg(test)]
mod tests {
    use super::parse_minutes;

    #[test]
    fn accepts_common_forms() {
        assert_eq!(parse_minutes("45"), Some(45));
        assert_eq!(parse_minutes("45m"), Some(45));
        assert_eq!(parse_minutes("2h"), Some(120));
        assert_eq!(parse_minutes("1h30m"), Some(90));
        assert_eq!(parse_minutes(" 1h 30m "), Some(90));
        assert_eq!(parse_minutes("1.5h"), Some(90));
        assert_eq!(parse_minutes("2H"), Some(120));
    }

    #[test]
    fn rejects_nonsense_and_zero() {
        for bad in ["", "m", "h", "abc", "0", "0m", "-5", "1x", "h30m3"] {
            assert_eq!(parse_minutes(bad), None, "{bad:?}");
        }
    }
}
