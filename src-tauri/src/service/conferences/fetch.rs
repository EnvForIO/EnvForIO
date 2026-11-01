//! Downloads ccfddl's combined list (about 700 KB). Only when the user
//! presses refresh (user decision 2026-11-20); nothing runs on a schedule.

use crate::errors::AppResult;
use crate::service::net::{client, network};

const URL: &str = "https://ccfddl.github.io/conference/allconf.yml";

pub async fn download() -> AppResult<String> {
    client()?
        .get(URL)
        .send()
        .await
        .map_err(network)?
        .error_for_status()
        .map_err(network)?
        .text()
        .await
        .map_err(network)
}
