//! Downloads one ICS feed. The link is the user's private subscription
//! address; it is only ever sent to the calendar's own server.

use crate::errors::AppResult;
use crate::service::net::{client, network};

pub async fn download(url: &str) -> AppResult<String> {
    client()?
        .get(url)
        .send()
        .await
        .map_err(network)?
        .error_for_status()
        .map_err(network)?
        .text()
        .await
        .map_err(network)
}
