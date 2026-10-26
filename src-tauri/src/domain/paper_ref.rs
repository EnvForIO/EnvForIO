//! Papers without the network: what a pasted DOI or arXiv link points to,
//! the metadata a lookup returns, and its BibTeX entry.

use std::sync::LazyLock;

use regex::Regex;

/// What the user pasted.
#[derive(Debug, Clone, PartialEq, Eq)]
pub enum PaperRef {
    Doi(String),
    /// Without the version suffix: `1706.03762`, or old style `hep-th/9901001`.
    Arxiv(String),
}

static ARXIV_URL: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)arxiv\.org/(?:abs|pdf|html)/([a-z.-]+/\d{7}|\d{4}\.\d{4,5})").unwrap()
});
static ARXIV_BARE: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)^(?:arxiv:\s*)?(\d{4}\.\d{4,5}|[a-z.-]+/\d{7})(?:v\d+)?$").unwrap()
});
static DOI: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(10\.\d{4,9}/[^\s]+)").unwrap());
/// arXiv's own DOIs: 10.48550/arXiv.1706.03762
static ARXIV_DOI: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?i)^10\.48550/arxiv\.(.+)$").unwrap());

/// Read a DOI (bare, `doi:`, or a doi.org link) or an arXiv id or link.
/// Anything else is `None`: the caller treats it as a title.
pub fn parse_ref(input: &str) -> Option<PaperRef> {
    let input = input.trim();
    if let Some(m) = ARXIV_URL.captures(input) {
        return Some(PaperRef::Arxiv(m[1].to_string()));
    }
    if let Some(m) = ARXIV_BARE.captures(input) {
        return Some(PaperRef::Arxiv(m[1].to_string()));
    }
    let doi = DOI.captures(input)?[1]
        .trim_end_matches(['.', ',', ';', ')', ']'])
        .to_string();
    if let Some(m) = ARXIV_DOI.captures(&doi) {
        return Some(PaperRef::Arxiv(m[1].to_string()));
    }
    Some(PaperRef::Doi(doi.to_lowercase()))
}

/// What a lookup found; also what a hand-typed paper starts as.
#[derive(Debug, Clone, Default, PartialEq)]
pub struct PaperMeta {
    pub title: String,
    pub authors: Vec<String>, // "Given Family"
    pub year: Option<i64>,
    pub venue: String,
    pub kind: String, // BibTeX entry type
    pub doi: Option<String>,
    pub arxiv_id: Option<String>,
    pub url: String,
    pub summary: String,
}

static TAG: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"<[^>]+>").unwrap());
static SPACE: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"\s+").unwrap());

/// Strip markup (JATS abstracts, `<i>` in titles), decode the common
/// entities and collapse whitespace.
pub fn plain_text(text: &str) -> String {
    let text = TAG.replace_all(text, " ");
    let text = text
        .replace("&lt;", "<")
        .replace("&gt;", ">")
        .replace("&quot;", "\"")
        .replace("&apos;", "'")
        .replace("&#39;", "'")
        .replace("&amp;", "&");
    SPACE.replace_all(text.trim(), " ").into_owned()
}

const SMALL_WORDS: [&str; 8] = ["a", "an", "the", "on", "of", "in", "for", "to"];

/// `vaswani2017attention`: first author's family name, year, first real title word.
pub fn bibtex_key(meta: &PaperMeta) -> String {
    let ascii = |s: &str| -> String {
        s.chars()
            .filter(char::is_ascii_alphanumeric)
            .collect::<String>()
            .to_lowercase()
    };
    let family = meta
        .authors
        .first()
        .and_then(|a| a.split_whitespace().last())
        .map(ascii)
        .unwrap_or_default();
    let word = meta
        .title
        .split_whitespace()
        .map(ascii)
        .find(|w| !w.is_empty() && !SMALL_WORDS.contains(&w.as_str()))
        .unwrap_or_default();
    let year = meta.year.map(|y| y.to_string()).unwrap_or_default();
    let key = format!("{family}{year}{word}");
    if key.is_empty() {
        "paper".into()
    } else {
        key
    }
}

fn escape(value: &str) -> String {
    value
        .replace('\\', "\\textbackslash{}")
        .replace('&', "\\&")
        .replace('%', "\\%")
        .replace('#', "\\#")
        .replace('_', "\\_")
}

/// A BibTeX entry. Titles are double-braced so BibTeX keeps their capitals.
pub fn bibtex(meta: &PaperMeta) -> String {
    let kind = match meta.kind.as_str() {
        "article" | "inproceedings" => meta.kind.as_str(),
        _ => "misc",
    };
    let mut fields: Vec<(&str, String)> = vec![("title", format!("{{{}}}", escape(&meta.title)))];
    if !meta.authors.is_empty() {
        fields.push(("author", escape(&meta.authors.join(" and "))));
    }
    if !meta.venue.is_empty() && kind != "misc" {
        let name = if kind == "article" {
            "journal"
        } else {
            "booktitle"
        };
        fields.push((name, escape(&meta.venue)));
    }
    if let Some(year) = meta.year {
        fields.push(("year", year.to_string()));
    }
    if let Some(doi) = &meta.doi {
        fields.push(("doi", doi.clone()));
    }
    if let Some(id) = &meta.arxiv_id {
        fields.push(("eprint", id.clone()));
        fields.push(("archivePrefix", "arXiv".into()));
    }
    if !meta.url.is_empty() {
        fields.push(("url", meta.url.clone()));
    }
    let body: Vec<String> = fields
        .iter()
        .map(|(name, value)| format!("  {name} = {{{value}}}"))
        .collect();
    format!("@{kind}{{{},\n{}\n}}", bibtex_key(meta), body.join(",\n"))
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn reads_dois_and_arxiv_ids_in_their_usual_shapes() {
        let doi = Some(PaperRef::Doi("10.1038/s41586-021-03819-2".into()));
        assert_eq!(parse_ref("10.1038/s41586-021-03819-2"), doi);
        assert_eq!(parse_ref("https://doi.org/10.1038/S41586-021-03819-2"), doi);
        assert_eq!(parse_ref("doi: 10.1038/s41586-021-03819-2."), doi);

        let arxiv = Some(PaperRef::Arxiv("1706.03762".into()));
        assert_eq!(parse_ref("https://arxiv.org/abs/1706.03762v7"), arxiv);
        assert_eq!(parse_ref("arxiv.org/pdf/1706.03762"), arxiv);
        assert_eq!(parse_ref("arXiv:1706.03762v2"), arxiv);
        assert_eq!(parse_ref("1706.03762"), arxiv);
        assert_eq!(parse_ref("10.48550/arXiv.1706.03762"), arxiv);
        assert_eq!(
            parse_ref("hep-th/9901001"),
            Some(PaperRef::Arxiv("hep-th/9901001".into()))
        );

        assert_eq!(parse_ref("Attention is all you need"), None);
    }

    #[test]
    fn plain_text_strips_jats_and_entities() {
        assert_eq!(
            plain_text(
                "<jats:title>Abstract</jats:title>\n <jats:p>Heat &amp; <i>drought</i></jats:p>"
            ),
            "Abstract Heat & drought"
        );
    }

    #[test]
    fn bibtex_uses_the_entry_type_and_a_readable_key() {
        let meta = PaperMeta {
            title: "Attention Is All You Need".into(),
            authors: vec!["Ashish Vaswani".into(), "Noam Shazeer".into()],
            year: Some(2017),
            venue: "Advances in Neural Information Processing Systems".into(),
            kind: "inproceedings".into(),
            arxiv_id: Some("1706.03762".into()),
            ..PaperMeta::default()
        };
        let entry = bibtex(&meta);
        assert!(entry.starts_with("@inproceedings{vaswani2017attention,\n"));
        assert!(entry.contains("  title = {{Attention Is All You Need}},\n"));
        assert!(entry.contains("  author = {Ashish Vaswani and Noam Shazeer},\n"));
        assert!(entry.contains("  booktitle = {Advances in Neural"));
        assert!(entry.contains("  archivePrefix = {arXiv}"));
        assert!(entry.ends_with("\n}"));

        let bare = PaperMeta {
            title: "R&D at 50%".into(),
            kind: "posted-content".into(),
            ..PaperMeta::default()
        };
        assert!(bibtex(&bare).starts_with("@misc{rd,\n  title = {{R\\&D at 50\\%}}"));
    }
}
