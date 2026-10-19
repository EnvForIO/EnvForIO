//! Quick capture: a time at the start of a typed task becomes its time slot.
//!
//! "14:00-15:00 group meeting" -> 14:00 to 15:00, "group meeting"
//! "9:30 call Alice"           -> 09:30, "call Alice"
//! Ranges may use "-", "~", "–" or "to". Anything else is left as the title.

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct Captured {
    pub title: String,
    pub start: Option<String>, // 'HH:MM'
    pub end: Option<String>,   // 'HH:MM'
}

/// "9:05" or "09:05" -> "09:05"; None when it is not a time of day.
fn clock(text: &str) -> Option<String> {
    let (h, m) = text.split_once(':')?;
    let (h, m): (u32, u32) = (h.parse().ok()?, m.parse().ok()?);
    (h < 24 && m < 60 && text.len() <= 5).then(|| format!("{h:02}:{m:02}"))
}

pub fn capture(text: &str) -> Captured {
    let text = text.trim();
    let plain = || Captured {
        title: text.to_string(),
        start: None,
        end: None,
    };
    let Some((first, rest)) = text.split_once(char::is_whitespace) else {
        return plain();
    };
    let rest = rest.trim_start();
    if rest.is_empty() {
        return plain(); // a bare time is a title, not a slot
    }

    // "14:00-15:00 title" (no spaces inside the range)
    for sep in ['-', '~', '–'] {
        if let Some((a, b)) = first.split_once(sep) {
            return match (clock(a), clock(b)) {
                (Some(start), Some(end)) => Captured {
                    title: rest.to_string(),
                    start: Some(start),
                    end: Some(end),
                },
                _ => plain(),
            };
        }
    }
    let Some(start) = clock(first) else {
        return plain();
    };

    // "14:00 - 15:00 title" or "14:00 to 15:00 title"
    if let Some((sep, after)) = rest.split_once(char::is_whitespace) {
        if matches!(sep, "-" | "~" | "–" | "to") {
            if let Some((b, title)) = after.trim_start().split_once(char::is_whitespace) {
                if let Some(end) = clock(b) {
                    return Captured {
                        title: title.trim_start().to_string(),
                        start: Some(start),
                        end: Some(end),
                    };
                }
            }
        }
    }
    Captured {
        title: rest.to_string(),
        start: Some(start),
        end: None,
    }
}

#[cfg(test)]
mod tests {
    use super::capture;

    fn parts(text: &str) -> (String, Option<String>, Option<String>) {
        let c = capture(text);
        (c.title, c.start, c.end)
    }

    fn slot(
        title: &str,
        start: &str,
        end: Option<&str>,
    ) -> (String, Option<String>, Option<String>) {
        (title.into(), Some(start.into()), end.map(Into::into))
    }

    #[test]
    fn ranges_and_single_times() {
        assert_eq!(
            parts("14:00-15:00 group meeting"),
            slot("group meeting", "14:00", Some("15:00"))
        );
        assert_eq!(
            parts("9:30~10:00 call"),
            slot("call", "09:30", Some("10:00"))
        );
        assert_eq!(
            parts("14:00 - 15:30 seminar"),
            slot("seminar", "14:00", Some("15:30"))
        );
        assert_eq!(
            parts("14:00 to 15:30 seminar"),
            slot("seminar", "14:00", Some("15:30"))
        );
        assert_eq!(parts("9:30 call Alice"), slot("call Alice", "09:30", None));
    }

    #[test]
    fn everything_else_stays_a_title() {
        for text in [
            "read paper",
            "25:00 nope",
            "14:00",
            "3.5h of writing",
            "1:2:3 x",
            "10-20 pages",
        ] {
            assert_eq!(parts(text), (text.to_string(), None, None), "{text:?}");
        }
    }
}
