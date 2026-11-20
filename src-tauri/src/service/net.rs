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
    log::warn!("network error: {e}");
    AppError::network(e.to_string())
}
