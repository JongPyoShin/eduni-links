# Naver Premium market archive operations

The feature stores the 935 saved channel records in the independent PostgreSQL schema `market_archive`. It does not use child reading records. Startup never creates or alters this schema. Article JSON/Markdown source files stay outside the repository. The authenticated detail API returns the full saved `text`, and each record retains its validated Naver source URL.

## Prerequisites

- The operator has a reviewed backup and direct access to the same PostgreSQL database configured by `EDUNI_READING_DB_*` (or `EDUNI_READING_DATABASE_URL`).
- Runtime configuration contains `EDUNI_MARKET_SESSION_SECRET` with at least 32 random bytes, `EDUNI_MARKET_PIN_HASH` in the existing PBKDF2 format, and the existing AI bridge settings. No plaintext PIN or market source text belongs in environment templates or Git.
- The Windows host bridge source is managed separately from this repository. Its request validator/prompt must accept `activity=market_research`, preserve the bounded `context.question` JSON (`query` plus up to four `{id,date,title,excerpt}` records), treat excerpts as untrusted citations, and return a bounded answer citing IDs. Validate the host-side bridge before enabling this feature.

## Migration and import

From `nice-gui-1-1-7`, using the app's Python environment and configured external DB credentials:

```powershell
python scripts/market_archive_migrate.py migrate
python scripts/market_archive_migrate.py import "C:\Users\GMK\OneDrive\Desktop\세상의 모든 시장 이야기\articles"
```

Both operations are explicit and idempotent: migration creates only the dedicated schema/table/indexes, and import upserts by the JSON filename stem. The source set contains 934 nonempty `text` bodies and one media-only record (`240414192007897hr`, status `media_only_not_transcribed`, `hasContent=false`). That row is retained with its id/date/title/status/media metadata and an empty `content_text`; it appears with a visible notice but is excluded from AI search/selection. For nonempty saved `text`, import preserves the text as-is; only when it is absent does it parse HTML. The publish date regex was verified against all 935 source files. Confirm 935 rows, 934 `has_content=true` rows, and the media-only metadata row before enabling the application route.

## Rollback

Application rollback means restoring the previous app image/source. It preserves the PostgreSQL `market_archive` schema and imported articles. Do not run schema rollback for an application-only rollback.

If an operator explicitly intends to destroy the archive schema and its imported data, preserve any required export first, then run:

```powershell
python scripts/market_archive_migrate.py rollback --confirm-drop-market-archive
```

This drops only `market_archive` with cascade and requires the explicit confirmation flag. It does not touch `reading_record`, child profiles, or other database objects. To restore after this destructive rollback, repeat migration and import from the original archive folder.
