//! The one error type returned by EnvIO commands.
//!
//! Tagged with `type` so the frontend can match on the kind of failure
//! (see the generated `AppError` in `src/lib/bindings.ts`).

use serde::Serialize;
use specta::Type;

#[derive(Debug, Clone, Serialize, Type)]
#[serde(tag = "type")]
pub enum AppError {
    /// The row asked for does not exist (deleted, or a stale id from the UI).
    NotFound { what: String, id: i64 },
    /// The input breaks a rule, e.g. an empty title.
    Invalid { message: String },
    /// SQLite failed. The message is for logs; the UI shows a generic error.
    Database { message: String },
}

impl AppError {
    pub fn invalid(message: impl Into<String>) -> Self {
        Self::Invalid {
            message: message.into(),
        }
    }

    pub fn not_found(what: &str, id: i64) -> Self {
        Self::NotFound {
            what: what.to_string(),
            id,
        }
    }
}

impl From<rusqlite::Error> for AppError {
    fn from(e: rusqlite::Error) -> Self {
        log::error!("database error: {e}");
        Self::Database {
            message: e.to_string(),
        }
    }
}

impl std::fmt::Display for AppError {
    fn fmt(&self, f: &mut std::fmt::Formatter<'_>) -> std::fmt::Result {
        match self {
            Self::NotFound { what, id } => write!(f, "{what} {id} not found"),
            Self::Invalid { message } => write!(f, "invalid input: {message}"),
            Self::Database { message } => write!(f, "database error: {message}"),
        }
    }
}

impl std::error::Error for AppError {}

pub type AppResult<T> = Result<T, AppError>;
