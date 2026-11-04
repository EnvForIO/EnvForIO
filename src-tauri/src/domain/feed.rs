//! RSS and Atom feeds (phase 4 step 8; magazines and blogs, user decision
//! 2026-11-20): a feed's items with title, link, author, date, a cover
//! image and the summary as plain text. The summary is never shown as
//! HTML (a feed must not run anything in the app): tags are dropped,
//! paragraphs kept, entities decoded. Also finds the feed of a web page
//! from its `<link rel="alternate">`, so a site's address can be pasted.

use std::sync::LazyLock;

use regex::Regex;

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct FeedItem {
    pub guid: String,
    pub title: String,
    pub link: String,
    pub author: String,
    pub summary: String, // plain text, paragraphs separated by blank lines
    pub image: Option<String>,
    pub published_ms: Option<i64>,
}

#[derive(Debug, Clone, PartialEq, Eq)]
pub struct ParsedFeed {
    pub title: String,
    pub site: String,
    pub items: Vec<FeedItem>,
}

static TAG: LazyLock<Regex> = LazyLock::new(|| Regex::new(r"(?s)<[^>]*>").expect("regex"));
static BLOCK: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?i)<\s*(br\s*/?|/p|/div|/li|/h[1-6]|/blockquote|/figure)\s*>").expect("regex")
});
static DROP: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r"(?is)<\s*(script|style|figcaption)[^>]*>.*?<\s*/\s*(script|style|figcaption)\s*>")
        .expect("regex")
});
static IMG: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r#"(?i)<img[^>]+src\s*=\s*["']([^"']+)["']"#).expect("regex"));
static ALTERNATE: LazyLock<Regex> =
    LazyLock::new(|| Regex::new(r"(?is)<link\b[^>]*>").expect("regex"));
static ATTR: LazyLock<Regex> = LazyLock::new(|| {
    Regex::new(r#"(?i)\b(rel|type|href|title)\s*=\s*["']([^"']*)["']"#).expect("regex")
});

/// Feed HTML as plain text: paragraphs kept, everything else dropped.
pub fn html_to_text(html: &str) -> String {
    let html = DROP.replace_all(html, "");
    // A closed paragraph (or a line break) ends a paragraph of the text.
    let html = BLOCK.replace_all(&html, "\n\n");
    let text = TAG.replace_all(&html, "");
    let text = html_escape::decode_html_entities(&text);
    text.lines()
        .map(|l| l.split_whitespace().collect::<Vec<_>>().join(" "))
        .collect::<Vec<_>>()
        .split(|l| l.is_empty())
        .map(|para| para.join(" "))
        .filter(|p| !p.is_empty())
        .collect::<Vec<_>>()
        .join("\n\n")
}

fn first_image(html: &str) -> Option<String> {
    IMG.captures(html).map(|c| c[1].to_string())
}

fn absolute(href: &str, base: &str) -> String {
    match url::Url::parse(base).and_then(|b| b.join(href)) {
        Ok(u) => u.to_string(),
        Err(_) => href.to_string(),
    }
}

/// Where a page's feed may be, best first: the feeds it advertises
/// (`<link rel="alternate">`), then the usual addresses (WordPress's
/// /feed/, /rss, /atom.xml, …), and comment feeds last — some sites, such
/// as Quanta, advertise only their comments feed on the front page.
pub fn feed_candidates(html: &str, page_url: &str) -> Vec<String> {
    let mut found = Vec::new();
    let mut comments = Vec::new();
    for tag in ALTERNATE.find_iter(html) {
        let (mut rel, mut kind, mut href, mut title) =
            (String::new(), String::new(), String::new(), String::new());
        for c in ATTR.captures_iter(tag.as_str()) {
            let value = c[2].to_string();
            match c[1].to_ascii_lowercase().as_str() {
                "rel" => rel = value.to_ascii_lowercase(),
                "type" => kind = value.to_ascii_lowercase(),
                "title" => title = value.to_ascii_lowercase(),
                _ => href = value,
            }
        }
        let feed = kind.contains("rss") || kind.contains("atom");
        if rel.split_whitespace().any(|r| r == "alternate") && feed && !href.is_empty() {
            let url = absolute(&href, page_url);
            if title.contains("comment") || url.contains("comment") {
                comments.push(url);
            } else {
                found.push(url);
            }
        }
    }
    for path in [
        "/feed/",
        "/rss",
        "/rss.xml",
        "/atom.xml",
        "/feed.xml",
        "/index.xml",
    ] {
        found.push(absolute(path, page_url));
    }
    found.extend(comments);
    let mut seen = std::collections::HashSet::new();
    found.retain(|u| seen.insert(u.clone()));
    found
}

fn image_of(entry: &feed_rs::model::Entry, html: &str) -> Option<String> {
    let media = entry.media.iter().find_map(|m| {
        m.thumbnails
            .first()
            .map(|t| t.image.uri.clone())
            .or_else(|| {
                m.content.iter().find_map(|c| {
                    let is_image = c
                        .content_type
                        .as_ref()
                        .is_none_or(|t| t.to_string().starts_with("image"));
                    c.url.as_ref().filter(|_| is_image).map(|u| u.to_string())
                })
            })
    });
    media.or_else(|| first_image(html))
}

/// A downloaded feed, or None when the bytes are not RSS or Atom.
pub fn parse(bytes: &[u8]) -> Option<ParsedFeed> {
    let feed = feed_rs::parser::parse(bytes).ok()?;
    let site = feed
        .links
        .iter()
        .find(|l| l.rel.as_deref().is_none_or(|r| r == "alternate"))
        .map(|l| l.href.clone())
        .unwrap_or_default();
    let items = feed
        .entries
        .iter()
        .map(|e| {
            let html = e
                .content
                .as_ref()
                .and_then(|c| c.body.clone())
                .or_else(|| e.summary.as_ref().map(|s| s.content.clone()))
                .unwrap_or_default();
            // The short description is the summary; full content only if there is none.
            let summary_html = e
                .summary
                .as_ref()
                .map(|s| s.content.clone())
                .unwrap_or_else(|| html.clone());
            let link = e
                .links
                .iter()
                .find(|l| l.rel.as_deref().is_none_or(|r| r == "alternate"))
                .or(e.links.first())
                .map(|l| l.href.clone())
                .unwrap_or_default();
            FeedItem {
                guid: if e.id.is_empty() {
                    link.clone()
                } else {
                    e.id.clone()
                },
                title: e
                    .title
                    .as_ref()
                    .map(|t| html_to_text(&t.content))
                    .filter(|t| !t.is_empty())
                    .unwrap_or_else(|| "(untitled)".into()),
                author: e
                    .authors
                    .first()
                    .and_then(|a| a.name.as_deref())
                    .map(|n| n.trim().to_string())
                    .unwrap_or_default(),
                summary: html_to_text(&summary_html),
                image: image_of(e, &html).map(|src| absolute(&src, &link)),
                published_ms: e.published.or(e.updated).map(|d| d.timestamp_millis()),
                link,
            }
        })
        .collect();
    Some(ParsedFeed {
        title: feed
            .title
            .map(|t| html_to_text(&t.content))
            .unwrap_or_default(),
        site,
        items,
    })
}

#[cfg(test)]
mod tests {
    use super::*;

    const RSS: &str = r#"<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:media="http://search.yahoo.com/mrss/" xmlns:dc="http://purl.org/dc/elements/1.1/">
<channel>
  <title>Quanta Magazine</title>
  <link>https://www.quantamagazine.org</link>
  <item>
    <title>How Escher&#8217;s Art Creates Worlds</title>
    <link>https://www.quantamagazine.org/escher/</link>
    <pubDate>Wed, 18 Nov 2026 15:51:40 +0000</pubDate>
    <dc:creator><![CDATA[Shalma Wegsman]]></dc:creator>
    <guid isPermaLink="false">https://www.quantamagazine.org/?p=168911</guid>
    <description><![CDATA[<p>The artist had no <b>formal</b> training.</p><p>Second &amp; last.</p><script>alert(1)</script>]]></description>
    <media:content url="https://www.quantamagazine.org/escher.webp" type="image/jpg"/>
  </item>
</channel>
</rss>"#;

    const ATOM: &str = r#"<?xml version="1.0" encoding="utf-8"?>
<feed xmlns="http://www.w3.org/2005/Atom">
  <title>A lab blog</title>
  <link href="https://lab.example.org/"/>
  <entry>
    <id>tag:lab,2026:1</id>
    <title>New preprint</title>
    <link rel="alternate" href="https://lab.example.org/posts/1"/>
    <updated>2026-11-19T10:00:00Z</updated>
    <content type="html">&lt;img src="/img/fig1.png"&gt;&lt;p&gt;We show that…&lt;/p&gt;</content>
  </entry>
</feed>"#;

    #[test]
    fn rss_items_read_as_plain_text_with_a_cover() {
        let feed = parse(RSS.as_bytes()).unwrap();
        assert_eq!(
            (feed.title.as_str(), feed.site.as_str()),
            ("Quanta Magazine", "https://www.quantamagazine.org/")
        );
        let item = &feed.items[0];
        assert_eq!(item.title, "How Escher\u{2019}s Art Creates Worlds");
        assert_eq!(item.author, "Shalma Wegsman");
        assert_eq!(
            item.summary,
            "The artist had no formal training.\n\nSecond & last."
        );
        assert_eq!(
            item.image.as_deref(),
            Some("https://www.quantamagazine.org/escher.webp")
        );
        assert_eq!(item.guid, "https://www.quantamagazine.org/?p=168911");
        assert!(item.published_ms.is_some());
    }

    #[test]
    fn atom_entries_find_their_image_in_the_content() {
        let feed = parse(ATOM.as_bytes()).unwrap();
        let item = &feed.items[0];
        assert_eq!(item.link, "https://lab.example.org/posts/1");
        assert_eq!(
            item.image.as_deref(),
            Some("https://lab.example.org/img/fig1.png")
        );
        assert_eq!(item.summary, "We show that…");
        assert!(parse(b"<html><body>not a feed</body></html>").is_none());
    }

    #[test]
    fn a_page_names_its_feed_comments_last() {
        let page = r#"<head><link rel="stylesheet" href="/a.css">
            <link rel="alternate" type="application/rss+xml" title="Quanta &raquo; Comments Feed" href="https://www.quantamagazine.org/quanta/feed/">
            <link rel="alternate" type="application/atom+xml" title="Blog" href="/blog.atom"></head>"#;
        let list = feed_candidates(page, "https://www.quantamagazine.org/");
        assert_eq!(list[0], "https://www.quantamagazine.org/blog.atom");
        assert_eq!(list[1], "https://www.quantamagazine.org/feed/");
        assert_eq!(
            list.last().map(String::as_str),
            Some("https://www.quantamagazine.org/quanta/feed/")
        );
        assert_eq!(
            feed_candidates("<head></head>", "https://x.org")[0],
            "https://x.org/feed/"
        );
    }
}

#[cfg(test)]
mod real_feed {
    /// Parses a downloaded feed named by FEED_FILE. Ignored: needs the file.
    #[test]
    #[ignore]
    fn a_real_feed_parses() {
        let path = std::env::var("FEED_FILE").expect("FEED_FILE");
        let feed = super::parse(&std::fs::read(path).unwrap()).expect("a feed");
        println!("{} ({}): {} items", feed.title, feed.site, feed.items.len());
        let first = &feed.items[0];
        println!(
            "{}\n{:?}\n{}\n{}",
            first.title, first.image, first.author, first.summary
        );
        assert!(!feed.items.is_empty());
    }
}
