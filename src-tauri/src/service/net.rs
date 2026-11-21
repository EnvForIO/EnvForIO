//! The one HTTP client setup for EnvForIO's few web lookups (Crossref, arXiv,
//! ccfddl). A generic client name: no user details leave the machine.

use std::time::Duration;

use crate::errors::{AppError, AppResult};

const USER_AGENT: &str = concat!(
    "EnvForIO/",
    env!("CARGO_PKG_VERSION"),
    " (desktop research app)"
);

pub fn client() -> AppResult<reqwest::Client> {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(Duration::from_secs(40))
        .build()
        .map_err(network)
}

pub fn network(e: reqwest::Error) -> AppError {
    // Without the URL, here and in the error (which background refreshes log):
    // a calendar link can carry a private token, and the log may be attached
    // to a public bug report.
    let message = e.without_url().to_string();
    log::warn!("network error: {message}");
    AppError::network(message)
}
