//! "Report a problem": the link to a new GitHub issue, on the bug-report
//! form, with the fields that help filled in (app version, Windows version,
//! where the log file is). Nothing is sent from the app: the browser opens the
//! form, and the user reads, edits and submits it, or not.

use std::path::Path;

/// New issues on the project's repository.
pub const NEW_ISSUE_URL: &str = concat!("https://github.com/", github_repo!(), "/issues/new");

/// The log file's name, without `.log` (the log plugin adds it).
pub const LOG_FILE_NAME: &str = "EnvForIO";

/// "Windows 11 (build 10.0.26200, x86_64)". Windows 11 still reports itself
/// as 10.0; build 22000 and later is 11.
pub fn system_text(platform: &str, version: &str, arch: &str) -> String {
    if platform == "windows" {
        let build = version
            .split('.')
            .nth(2)
            .and_then(|b| b.parse::<u32>().ok());
        let name = match build {
            Some(b) if b >= 22000 => "Windows 11",
            Some(_) => "Windows 10",
            None => "Windows",
        };
        format!("{name} (build {version}, {arch})")
    } else {
        format!("{platform} {version} ({arch})")
    }
}

/// The log file's path as the reader can use it, without the user's name in
/// it: `%LOCALAPPDATA%\…` on Windows, `~/…` elsewhere.
pub fn shareable_path(path: &Path, local_app_data: Option<&Path>, home: Option<&Path>) -> String {
    if let Some(rest) = local_app_data.and_then(|base| path.strip_prefix(base).ok()) {
        return format!("%LOCALAPPDATA%\\{}", rest.display());
    }
    if let Some(rest) = home.and_then(|base| path.strip_prefix(base).ok()) {
        return format!("~{}{}", std::path::MAIN_SEPARATOR, rest.display());
    }
    path.display().to_string()
}

/// The prefilled issue link. The query keys are the bug form's field ids
/// (`.github/ISSUE_TEMPLATE/bug_report.yml`).
pub fn issue_url(app_version: &str, system: &str, log_file: &str) -> String {
    let extra = format!(
        "Log file: {log_file}\n\
         Attach it if it helps; look through it for anything private first."
    );
    url::Url::parse_with_params(
        NEW_ISSUE_URL,
        [
            ("template", "bug_report.yml"),
            ("version", app_version),
            ("windows", system),
            ("extra", extra.as_str()),
        ],
    )
    .map(String::from)
    .unwrap_or_else(|_| NEW_ISSUE_URL.to_string())
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn names_windows_by_build() {
        assert_eq!(
            system_text("windows", "10.0.26200", "x86_64"),
            "Windows 11 (build 10.0.26200, x86_64)"
        );
        assert_eq!(
            system_text("windows", "10.0.19045", "x86_64"),
            "Windows 10 (build 10.0.19045, x86_64)"
        );
        assert_eq!(
            system_text("windows", "10.0", "x86_64"),
            "Windows (build 10.0, x86_64)"
        );
        assert_eq!(
            system_text("linux", "24.04", "x86_64"),
            "linux 24.04 (x86_64)"
        );
    }

    #[test]
    fn hides_the_user_folder() {
        let log = Path::new("/users/someone/local/io.github.envforio/logs/EnvForIO.log");
        assert_eq!(
            shareable_path(log, Some(Path::new("/users/someone/local")), None),
            "%LOCALAPPDATA%\\io.github.envforio/logs/EnvForIO.log"
        );
        assert_eq!(
            shareable_path(log, None, Some(Path::new("/users/someone"))),
            "~/local/io.github.envforio/logs/EnvForIO.log"
        );
    }

    #[test]
    fn fills_the_bug_form() {
        let url = issue_url(
            "0.1.0",
            "Windows 11 (build 10.0.26200, x86_64)",
            "%LOCALAPPDATA%\\x.log",
        );
        assert!(url.starts_with(NEW_ISSUE_URL));
        let parsed = url::Url::parse(&url).unwrap();
        let get = |k: &str| {
            parsed
                .query_pairs()
                .find(|(key, _)| key == k)
                .map(|(_, v)| v.into_owned())
        };
        assert_eq!(get("template").as_deref(), Some("bug_report.yml"));
        assert_eq!(get("version").as_deref(), Some("0.1.0"));
        assert_eq!(
            get("windows").as_deref(),
            Some("Windows 11 (build 10.0.26200, x86_64)")
        );
        assert!(get("extra")
            .unwrap()
            .starts_with("Log file: %LOCALAPPDATA%\\x.log\n"));
    }
}
