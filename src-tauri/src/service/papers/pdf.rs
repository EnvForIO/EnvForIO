//! Paper PDFs live in `<app data>/papers/<id>.pdf`, so they survive the
//! original file being moved and are removed with the paper.

use std::fs;
use std::path::{Path, PathBuf};

use crate::errors::{AppError, AppResult};

pub fn path(dir: &Path, id: i64) -> PathBuf {
    dir.join(format!("{id}.pdf"))
}

fn io(action: &str, path: &Path, e: std::io::Error) -> AppError {
    AppError::invalid(format!("cannot {action} {}: {e}", path.display()))
}

pub fn save(dir: &Path, id: i64, bytes: &[u8]) -> AppResult<()> {
    fs::create_dir_all(dir).map_err(|e| io("create", dir, e))?;
    let target = path(dir, id);
    fs::write(&target, bytes).map_err(|e| io("write", &target, e))
}

/// Copy a PDF the user picked into the library.
pub fn import(dir: &Path, id: i64, source: &Path) -> AppResult<()> {
    let bytes = fs::read(source).map_err(|e| io("read", source, e))?;
    if !bytes.starts_with(b"%PDF") {
        return Err(AppError::invalid(format!(
            "{} is not a PDF",
            source.display()
        )));
    }
    save(dir, id, &bytes)
}

/// Remove a paper's copy; a missing file is fine.
pub fn remove(dir: &Path, id: i64) {
    let target = path(dir, id);
    if let Err(e) = fs::remove_file(&target) {
        if e.kind() != std::io::ErrorKind::NotFound {
            log::warn!("cannot remove {}: {e}", target.display());
        }
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn imports_only_pdfs_and_removes_quietly() {
        let dir = std::env::temp_dir().join(format!("envio-pdf-test-{}", std::process::id()));
        let src = dir.join("source");
        fs::create_dir_all(&src).unwrap();
        fs::write(src.join("a.pdf"), b"%PDF-1.7 body").unwrap();
        fs::write(src.join("b.pdf"), b"<html>paywall</html>").unwrap();

        let library = dir.join("papers");
        import(&library, 7, &src.join("a.pdf")).unwrap();
        assert!(path(&library, 7).exists());
        assert!(import(&library, 8, &src.join("b.pdf")).is_err());

        remove(&library, 7);
        remove(&library, 7);
        assert!(!path(&library, 7).exists());
        fs::remove_dir_all(&dir).unwrap();
    }
}
