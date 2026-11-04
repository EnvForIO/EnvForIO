//! Downloads a feed. For a pasted web page (a site's front page) the
//! feeds it advertises and the usual feed addresses are tried in turn.

use crate::domain::feed::{feed_candidates, parse, ParsedFeed};
use crate::errors::{AppError, AppResult};
use crate::service::net::{client, network};

async fn bytes(url: &str) -> AppResult<Vec<u8>> {
    Ok(client()?
        .get(url)
        .send()
        .await
        .map_err(network)?
        .error_for_status()
        .map_err(network)?
        .bytes()
        .await
        .map_err(network)?
        .to_vec())
}

/// The feed at `url`, or at the feed a page at `url` names. Returns the
/// feed's own address with it.
pub async fn download(url: &str) -> AppResult<(String, ParsedFeed)> {
    let body = bytes(url).await?;
    if let Some(feed) = parse(&body) {
        return Ok((url.to_string(), feed));
    }
    let page = String::from_utf8_lossy(&body);
    for candidate in feed_candidates(&page, url) {
        if let Ok(body) = bytes(&candidate).await {
            if let Some(feed) = parse(&body) {
                return Ok((candidate, feed));
            }
        }
    }
    Err(AppError::invalid(
        "no RSS or Atom feed found at this address",
    ))
}
