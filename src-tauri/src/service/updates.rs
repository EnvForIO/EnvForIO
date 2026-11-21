//! Ask GitHub for the latest published release. One anonymous request for a
//! public JSON document: nothing about the user or their data is sent.

use serde::Deserialize;

use crate::domain::updates::{compare, UpdateCheck, LATEST_RELEASE_API};
use crate::errors::AppResult;
use crate::service::net::{client, network};

#[derive(Deserialize)]
struct Release {
    tag_name: String,
    html_url: String,
}

pub async fn check(current: &str) -> AppResult<UpdateCheck> {
    let response = client()?
        .get(LATEST_RELEASE_API)
        .header("Accept", "application/vnd.github+json")
        .send()
        .await
        .map_err(network)?;
    // 404: the repository has no published release yet.
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Ok(compare(current, None));
    }
    let release: Release = response
        .error_for_status()
        .map_err(network)?
        .json()
        .await
        .map_err(network)?;
    log::info!("latest release is {}", release.tag_name);
    Ok(compare(
        current,
        Some((&release.tag_name, &release.html_url)),
    ))
}
