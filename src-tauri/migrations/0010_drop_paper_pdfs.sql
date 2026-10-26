-- 2026-11-19, user decision: PDFs stay in Zotero; the library keeps links only.
ALTER TABLE papers DROP COLUMN pdf_url;
ALTER TABLE papers DROP COLUMN has_pdf;
