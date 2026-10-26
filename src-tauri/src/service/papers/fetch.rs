//! Paper metadata from the public Crossref and arXiv APIs. The parsers are
//! plain functions so they are tested without the network.

use std::sync::LazyLock;
use std::time::Duration;

use regex::Regex;
use serde_json::Value;

use crate::domain::paper_ref::{plain_text, PaperMeta, PaperRef};
use crate::errors::{AppError, AppResult};

// A generic client name: no user details leave the machine.
const USER_AGENT: &str = concat!(
    "EnvIO/",
    env!("CARGO_PKG_VERSION"),
    " (desktop research app)"
);

fn client() -> AppResult<reqwest::Client> {
    reqwest::Client::builder()
        .user_agent(USER_AGENT)
        .timeout(Duration::from_secs(40))
        .build()
        .map_err(network)
}

fn network(e: reqwest::Error) -> AppError {
    log::warn!("network error: {e}");
    AppError::network(e.to_string())
}

pub async fn lookup(paper: &PaperRef) -> AppResult<PaperMeta> {
    match paper {
        PaperRef::Doi(doi) => crossref(doi).await,
        PaperRef::Arxiv(id) => arxiv(id).await,
    }
}

async fn crossref(doi: &str) -> AppResult<PaperMeta> {
    let url = format!("https://api.crossref.org/works/{}", encode_doi(doi));
    let response = client()?.get(url).send().await.map_err(network)?;
    if response.status() == reqwest::StatusCode::NOT_FOUND {
        return Err(AppError::invalid(format!(
            "Crossref has no paper with DOI {doi}"
        )));
    }
    let json: Value = response
        .error_for_status()
        .map_err(network)?
        .json()
        .await
        .map_err(network)?;
    Ok(from_crossref(&json["message"], doi))
}

async fn arxiv(id: &str) -> AppResult<PaperMeta> {
    let url = format!("https://export.arxiv.org/api/query?id_list={id}");
    let response = client()?.get(url).send().await.map_err(network)?;
    let atom = response
        .error_for_status()
        .map_err(network)?
        .text()
        .await
        .map_err(network)?;
    from_arxiv(&atom, id).ok_or_else(|| AppError::invalid(format!("arXiv has no paper {id}")))
}

/// Percent-encode a DOI for a URL path, keeping its slashes.
fn encode_doi(doi: &str) -> String {
    doi.bytes()
        .map(|b| match b {
            b'A'..=b'Z' | b'a'..=b'z' | b'0'..=b'9' | b'-' | b'.' | b'_' | b'~' | b'/' => {
                (b as char).to_string()
            }
            _ => format!("%{b:02X}"),
        })
        .collect()
}

fn first_str(value: &Value) -> &str {
    value[0].as_str().unwrap_or_default()
}

/// The `message` of a Crossref `/works/{doi}` answer.
pub fn from_crossref(msg: &Value, doi: &str) -> PaperMeta {
    let authors = msg["author"]
        .as_array()
        .map(|list| {
            list.iter()
                .filter_map(|a| {
                    let given = a["given"].as_str().unwrap_or_default();
                    let family = a["family"].as_str().unwrap_or_default();
                    let name = format!("{given} {family}");
                    let name = name.trim();
                    match name {
                        "" => a["name"].as_str().map(str::to_string),
                        _ => Some(name.to_string()),
                    }
                })
                .collect()
        })
        .unwrap_or_default();
    let year = [
        "issued",
        "published",
        "published-print",
        "published-online",
        "created",
    ]
    .iter()
    .find_map(|key| msg[key]["date-parts"][0][0].as_i64());
    let kind = match msg["type"].as_str() {
        Some("journal-article") => "article",
        Some("proceedings-article") => "inproceedings",
        _ => "misc",
    };
    let summary = plain_text(msg["abstract"].as_str().unwrap_or_default());
    let summary = summary.strip_prefix("Abstract ").unwrap_or(&summary);
    PaperMeta {
        title: plain_text(first_str(&msg["title"])),
        authors,
        year,
        venue: plain_text(first_str(&msg["container-title"])),
        kind: kind.into(),
        doi: Some(doi.to_string()),
        arxiv_id: None,
        url: msg["URL"]
            .as_str()
            .map_or_else(|| format!("https://doi.org/{doi}"), str::to_string),
        summary: summary.to_string(),
    }
}

static ENTRY: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?s)<entry>(.*?)</entry>").unwrap());
static NAME: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?s)<name>(.*?)</name>").unwrap());

fn tag(xml: &str, name: &str) -> Option<String> {
    let re = Regex::new(&format!(r"(?s)<{name}[^>]*>(.*?)</{name}>")).ok()?;
    re.captures(xml).map(|m| plain_text(&m[1]))
}

/// The Atom feed of an arXiv `query?id_list=` answer; `None` if the id is unknown.
pub fn from_arxiv(atom: &str, id: &str) -> Option<PaperMeta> {
    let entry = &ENTRY.captures(atom)?[1];
    let title = tag(entry, "title")?;
    if tag(entry, "id").is_some_and(|i| i.contains("/api/errors")) || title.is_empty() {
        return None;
    }
    Some(PaperMeta {
        title,
        authors: NAME
            .captures_iter(entry)
            .map(|m| plain_text(&m[1]))
            .collect(),
        year: tag(entry, "published").and_then(|d| d.get(..4)?.parse().ok()),
        venue: tag(entry, "arxiv:journal_ref").unwrap_or_else(|| "arXiv".into()),
        kind: "misc".into(),
        doi: tag(entry, "arxiv:doi").map(|d| d.to_lowercase()),
        arxiv_id: Some(id.to_string()),
        url: format!("https://arxiv.org/abs/{id}"),
        summary: tag(entry, "summary").unwrap_or_default(),
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_a_crossref_record() {
        let msg = serde_json::json!({
            "title": ["Highly accurate protein structure prediction with <i>AlphaFold</i>"],
            "author": [
                {"given": "John", "family": "Jumper"},
                {"name": "The AlphaFold Team"}
            ],
            "issued": {"date-parts": [[2021, 7, 15]]},
            "container-title": ["Nature"],
            "type": "journal-article",
            "abstract": "<jats:title>Abstract</jats:title><jats:p>Proteins are essential.</jats:p>",
            "URL": "https://doi.org/10.1038/s41586-021-03819-2"
        });
        let meta = from_crossref(&msg, "10.1038/s41586-021-03819-2");
        assert_eq!(
            meta.title,
            "Highly accurate protein structure prediction with AlphaFold"
        );
        assert_eq!(meta.authors, vec!["John Jumper", "The AlphaFold Team"]);
        assert_eq!(
            (meta.year, meta.venue.as_str(), meta.kind.as_str()),
            (Some(2021), "Nature", "article")
        );
        assert_eq!(meta.summary, "Proteins are essential.");
    }

    #[test]
    fn reads_an_arxiv_feed_and_spots_unknown_ids() {
        let atom = r#"<feed><title>ArXiv Query: id_list=1706.03762</title>
          <entry>
            <id>http://arxiv.org/abs/1706.03762v7</id>
            <published>2017-06-12T17:57:34Z</published>
            <title>Attention Is All
              You Need</title>
            <summary>  The dominant sequence transduction models &amp; more. </summary>
            <author><name>Ashish Vaswani</name></author>
            <author><name>Noam Shazeer</name></author>
          </entry></feed>"#;
        let meta = from_arxiv(atom, "1706.03762").unwrap();
        assert_eq!(meta.title, "Attention Is All You Need");
        assert_eq!(meta.authors, vec!["Ashish Vaswani", "Noam Shazeer"]);
        assert_eq!((meta.year, meta.venue.as_str()), (Some(2017), "arXiv"));
        assert_eq!(
            meta.summary,
            "The dominant sequence transduction models & more."
        );

        let error = r#"<feed><entry><id>http://arxiv.org/api/errors#incorrect_id</id>
            <title>Error</title></entry></feed>"#;
        assert_eq!(from_arxiv(error, "9999.99999"), None);
        assert_eq!(from_arxiv("<feed></feed>", "9999.99999"), None);
    }

    #[test]
    fn dois_are_encoded_for_the_url_path() {
        assert_eq!(
            encode_doi("10.1002/(sici)1097#x"),
            "10.1002/%28sici%291097%23x"
        );
    }
}
