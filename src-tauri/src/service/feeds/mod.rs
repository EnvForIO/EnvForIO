//! The RSS reader's feeds and items (phase 4 step 8). Each download adds
//! new items and updates known ones without touching whether they were
//! read; a feed keeps its newest `KEEP` items. Parsing is in
//! `domain::feed`, downloading in `fetch`.

pub mod fetch;

use rusqlite::{params, Connection, OptionalExtension};

use crate::domain::day::now_timestamp;
use crate::domain::feed::ParsedFeed;
use crate::entity::feed::{Feed, FeedItem};
use crate::errors::{AppError, AppResult};
use crate::service::tasks::{mutation as tasks, query::TaskView};

/// Items kept per feed (low-volume feeds: months of history).
const KEEP: i64 = 200;

const FEED_COLUMNS: &str = "f.id, f.title, f.url, f.site, f.fetched_at, f.error, \
     (SELECT count(*) FROM feed_items i WHERE i.feed_id = f.id AND i.is_read = 0)";

fn feed_row(r: &rusqlite::Row) -> rusqlite::Result<Feed> {
    Ok(Feed {
        id: r.get(0)?,
        title: r.get(1)?,
        url: r.get(2)?,
        site: r.get(3)?,
        fetched_at: r.get(4)?,
        error: r.get(5)?,
        unread: r.get(6)?,
    })
}

pub fn list(conn: &Connection) -> AppResult<Vec<Feed>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {FEED_COLUMNS} FROM feeds f ORDER BY f.sort_order, f.id"
    ))?;
    let rows = stmt.query_map([], feed_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

pub fn get(conn: &Connection, id: i64) -> AppResult<Feed> {
    conn.query_row(
        &format!("SELECT {FEED_COLUMNS} FROM feeds f WHERE f.id = ?1"),
        [id],
        feed_row,
    )
    .optional()?
    .ok_or_else(|| AppError::not_found("feed", id))
}

/// Subscribes to a feed already downloaded and parsed, with its items.
pub fn add(conn: &mut Connection, url: &str, parsed: &ParsedFeed, now_ms: i64) -> AppResult<Feed> {
    let taken: bool = conn.query_row(
        "SELECT count(*) > 0 FROM feeds WHERE url = ?1",
        [url],
        |r| r.get(0),
    )?;
    if taken {
        return Err(AppError::invalid("this feed is already added"));
    }
    let title = if parsed.title.is_empty() {
        url
    } else {
        &parsed.title
    };
    conn.execute(
        "INSERT INTO feeds (title, url, site, sort_order)
         VALUES (?1, ?2, ?3, (SELECT coalesce(max(sort_order), 0) + 1 FROM feeds))",
        params![title, url, parsed.site],
    )?;
    let id = conn.last_insert_rowid();
    store(conn, id, parsed, now_ms)?;
    get(conn, id)
}

pub fn remove(conn: &Connection, id: i64) -> AppResult<()> {
    if conn.execute("DELETE FROM feeds WHERE id = ?1", [id])? == 0 {
        return Err(AppError::not_found("feed", id));
    }
    Ok(())
}

/// A successful download: new items in, known ones updated (read state
/// kept), the oldest beyond `KEEP` out.
pub fn store(conn: &mut Connection, id: i64, parsed: &ParsedFeed, now_ms: i64) -> AppResult<()> {
    let tx = conn.transaction()?;
    {
        let mut upsert = tx.prepare(
            "INSERT INTO feed_items (feed_id, guid, title, link, author, summary, image, published_ms, seen_ms)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)
             ON CONFLICT (feed_id, guid) DO UPDATE SET
                 title = excluded.title, link = excluded.link, author = excluded.author,
                 summary = excluded.summary, image = excluded.image,
                 published_ms = excluded.published_ms",
        )?;
        for item in &parsed.items {
            upsert.execute(params![
                id,
                item.guid,
                item.title,
                item.link,
                item.author,
                item.summary,
                item.image,
                item.published_ms,
                now_ms
            ])?;
        }
    }
    tx.execute(
        "DELETE FROM feed_items WHERE feed_id = ?1 AND id NOT IN (
             SELECT id FROM feed_items WHERE feed_id = ?1
             ORDER BY coalesce(published_ms, seen_ms) DESC LIMIT ?2)",
        params![id, KEEP],
    )?;
    tx.execute(
        "UPDATE feeds SET fetched_at = ?2, error = NULL,
             site = CASE WHEN ?3 = '' THEN site ELSE ?3 END
         WHERE id = ?1",
        params![id, now_timestamp(), parsed.site],
    )?;
    tx.commit()?;
    Ok(())
}

pub fn set_error(conn: &Connection, id: i64, error: &str) -> AppResult<()> {
    conn.execute(
        "UPDATE feeds SET error = ?2 WHERE id = ?1",
        params![id, error],
    )?;
    Ok(())
}

const ITEM_COLUMNS: &str = "i.id, i.feed_id, f.title, i.title, i.link, i.author, i.summary, \
     i.image, coalesce(i.published_ms, i.seen_ms), i.is_read, i.task_id";

fn item_row(r: &rusqlite::Row) -> rusqlite::Result<FeedItem> {
    Ok(FeedItem {
        id: r.get(0)?,
        feed_id: r.get(1)?,
        feed_title: r.get(2)?,
        title: r.get(3)?,
        link: r.get(4)?,
        author: r.get(5)?,
        summary: r.get(6)?,
        image: r.get(7)?,
        date_ms: r.get(8)?,
        is_read: r.get(9)?,
        task_id: r.get(10)?,
    })
}

/// Items of one feed (or all), newest first; only unread ones if asked.
pub fn items(
    conn: &Connection,
    feed_id: Option<i64>,
    unread_only: bool,
) -> AppResult<Vec<FeedItem>> {
    let mut stmt = conn.prepare(&format!(
        "SELECT {ITEM_COLUMNS} FROM feed_items i JOIN feeds f ON f.id = i.feed_id
         WHERE (?1 IS NULL OR i.feed_id = ?1) AND (?2 = 0 OR i.is_read = 0)
         ORDER BY coalesce(i.published_ms, i.seen_ms) DESC, i.id DESC"
    ))?;
    let rows = stmt.query_map(params![feed_id, unread_only], item_row)?;
    Ok(rows.collect::<Result<_, _>>()?)
}

fn item(conn: &Connection, id: i64) -> AppResult<FeedItem> {
    conn.query_row(
        &format!("SELECT {ITEM_COLUMNS} FROM feed_items i JOIN feeds f ON f.id = i.feed_id WHERE i.id = ?1"),
        [id],
        item_row,
    )
    .optional()?
    .ok_or_else(|| AppError::not_found("feed item", id))
}

pub fn set_read(conn: &Connection, id: i64, read: bool) -> AppResult<FeedItem> {
    conn.execute(
        "UPDATE feed_items SET is_read = ?2 WHERE id = ?1",
        params![id, read],
    )?;
    item(conn, id)
}

/// Marks every item of a feed (or of all feeds) read.
pub fn mark_all_read(conn: &Connection, feed_id: Option<i64>) -> AppResult<()> {
    conn.execute(
        "UPDATE feed_items SET is_read = 1 WHERE ?1 IS NULL OR feed_id = ?1",
        params![feed_id],
    )?;
    Ok(())
}

/// "Add to todos": a task in the task pool titled like the article, with
/// its link in the note. Adding the same item again returns that task.
pub fn add_to_todos(conn: &Connection, id: i64, today: &str) -> AppResult<FeedItem> {
    let it = item(conn, id)?;
    let existing: Option<i64> = conn
        .query_row(
            "SELECT t.id FROM tasks t WHERE t.id = (SELECT task_id FROM feed_items WHERE id = ?1)",
            [id],
            |r| r.get(0),
        )
        .optional()?;
    if existing.is_some() {
        return Ok(it);
    }
    let task = tasks::create(conn, &format!("Read: {}", it.title), TaskView::Tasks, today)?;
    conn.execute(
        "UPDATE tasks SET note = ?2 WHERE id = ?1",
        params![task.id, format!("{}\n{}", it.feed_title, it.link)],
    )?;
    conn.execute(
        "UPDATE feed_items SET task_id = ?2 WHERE id = ?1",
        params![id, task.id],
    )?;
    item(conn, id)
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db::open_in_memory;
    use crate::domain::feed::FeedItem as Parsed;

    fn parsed(guids: &[&str]) -> ParsedFeed {
        ParsedFeed {
            title: "Quanta".into(),
            site: "https://www.quantamagazine.org/".into(),
            items: guids
                .iter()
                .enumerate()
                .map(|(i, g)| Parsed {
                    guid: (*g).into(),
                    title: format!("Story {g}"),
                    link: format!("https://q.org/{g}"),
                    author: String::new(),
                    summary: "text".into(),
                    image: None,
                    published_ms: Some(1000 * i as i64),
                })
                .collect(),
        }
    }

    #[test]
    fn downloads_add_new_items_and_keep_read_state() {
        let mut conn = open_in_memory();
        let feed = add(&mut conn, "https://q.org/feed", &parsed(&["a", "b"]), 5).unwrap();
        assert_eq!((feed.title.as_str(), feed.unread), ("Quanta", 2));
        assert!(add(&mut conn, "https://q.org/feed", &parsed(&[]), 5).is_err());

        let b = &items(&conn, Some(feed.id), false).unwrap()[0];
        assert_eq!(b.title, "Story b"); // newest first
        set_read(&conn, b.id, true).unwrap();
        store(&mut conn, feed.id, &parsed(&["a", "b", "c"]), 9).unwrap();
        assert_eq!(get(&conn, feed.id).unwrap().unread, 2); // b stays read
        assert_eq!(items(&conn, None, true).unwrap().len(), 2);

        mark_all_read(&conn, Some(feed.id)).unwrap();
        assert_eq!(get(&conn, feed.id).unwrap().unread, 0);
    }

    #[test]
    fn an_item_becomes_one_todo_with_its_link() {
        let mut conn = open_in_memory();
        let feed = add(&mut conn, "https://q.org/feed", &parsed(&["a"]), 5).unwrap();
        let a = items(&conn, Some(feed.id), false).unwrap()[0].clone();
        let added = add_to_todos(&conn, a.id, "2026-11-20").unwrap();
        let task_id = added.task_id.unwrap();
        assert_eq!(
            add_to_todos(&conn, a.id, "2026-11-20").unwrap().task_id,
            Some(task_id)
        );
        let task = crate::service::tasks::query::get(&conn, task_id).unwrap();
        assert_eq!(task.title, "Read: Story a");
        assert!(task.note.contains("https://q.org/a"));

        // Removing the feed removes its items, not the todo.
        remove(&conn, feed.id).unwrap();
        assert!(crate::service::tasks::query::get(&conn, task_id).is_ok());
    }
}
