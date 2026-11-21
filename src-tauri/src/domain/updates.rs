//! "Check for updates" without an updater: compare the app's version with the
//! latest release published on GitHub. It only tells the user; downloading
//! and installing stay with them.

use serde::Serialize;
use specta::Type;

/// GitHub's latest published release (drafts and pre-releases are skipped).
pub const LATEST_RELEASE_API: &str = concat!(
    "https://api.github.com/repos/",
    github_repo!(),
    "/releases/latest"
);

/// All releases, for when there is none yet or the API cannot be reached.
pub const RELEASES_PAGE: &str = concat!("https://github.com/", github_repo!(), "/releases");

#[derive(Debug, Clone, PartialEq, Eq, Serialize, Type)]
#[serde(rename_all = "camelCase")]
pub struct UpdateCheck {
    /// The running version, e.g. "0.1.0".
    pub current: String,
    /// The latest release's version without the "v", or None if nothing is published yet.
    pub latest: Option<String>,
    /// True when `latest` is newer than `current`.
    pub newer: bool,
    /// The page to download from: the release, or the releases list.
    pub url: String,
}

/// (major, minor, patch, is a pre-release) from "v1.2.3", "1.2.3-beta.1"
/// and the like; None when it is not a version.
fn parse(version: &str) -> Option<(u64, u64, u64, bool)> {
    let v = version.trim().trim_start_matches(['v', 'V']);
    // "-beta" marks a pre-release; "+build" is metadata and does not.
    let (core, pre) = match v.find(['-', '+']) {
        Some(i) => (&v[..i], v[i..].starts_with('-')),
        None => (v, false),
    };
    let mut parts = core.split('.').map(|p| p.parse::<u64>().ok());
    let major = parts.next()??;
    let minor = parts.next().unwrap_or(Some(0))?;
    let patch = parts.next().unwrap_or(Some(0))?;
    if parts.next().is_some() {
        return None;
    }
    Some((major, minor, patch, pre))
}

/// Is `latest` a newer version than `current`? A release equals a
/// pre-release of the same number plus one step: 1.2.0 is newer than 1.2.0-beta.
pub fn is_newer(latest: &str, current: &str) -> bool {
    match (parse(latest), parse(current)) {
        (Some((a1, b1, c1, pre1)), Some((a2, b2, c2, pre2))) => {
            (a1, b1, c1) > (a2, b2, c2) || ((a1, b1, c1) == (a2, b2, c2) && pre2 && !pre1)
        }
        _ => false,
    }
}

/// The result for a release tag, or for no release at all.
pub fn compare(current: &str, release: Option<(&str, &str)>) -> UpdateCheck {
    match release {
        Some((tag, url)) => {
            let latest = tag.trim().trim_start_matches(['v', 'V']).to_string();
            UpdateCheck {
                current: current.to_string(),
                newer: is_newer(&latest, current),
                latest: Some(latest),
                url: url.to_string(),
            }
        }
        None => UpdateCheck {
            current: current.to_string(),
            latest: None,
            newer: false,
            url: RELEASES_PAGE.to_string(),
        },
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn compares_versions() {
        assert!(is_newer("v0.2.0", "0.1.0"));
        assert!(is_newer("0.1.1", "0.1.0"));
        assert!(is_newer("1.0.0", "0.9.9"));
        assert!(is_newer("0.10.0", "0.9.0")); // numbers, not text
        assert!(!is_newer("v0.1.0", "0.1.0"));
        assert!(!is_newer("0.1.0", "0.2.0"));
        assert!(is_newer("0.2.0", "0.2.0-beta.1"));
        assert!(!is_newer("0.2.0-beta.1", "0.2.0"));
        assert!(!is_newer("nightly", "0.1.0"));
        assert!(!is_newer("0.2.0", "not-a-version"));
        assert!(is_newer("v1.2", "1.1.9"));
    }

    #[test]
    fn reports_a_release() {
        let check = compare("0.1.0", Some(("v0.2.0", "https://example.org/r/v0.2.0")));
        assert_eq!(check.latest.as_deref(), Some("0.2.0"));
        assert!(check.newer);
        assert_eq!(check.url, "https://example.org/r/v0.2.0");

        let same = compare("0.2.0", Some(("v0.2.0", "https://example.org/r/v0.2.0")));
        assert!(!same.newer);
    }

    #[test]
    fn nothing_published_yet() {
        let check = compare("0.1.0", None);
        assert_eq!(check.latest, None);
        assert!(!check.newer);
        assert_eq!(check.url, RELEASES_PAGE);
    }
}
