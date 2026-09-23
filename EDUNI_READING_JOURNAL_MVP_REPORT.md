# EDUNI Child Reading Journal MVP

## Product direction

The reading journal is intentionally a **memory journal**, not a performance dashboard.

Patterns reviewed before implementation:

- Bookmory: cover-based library, notes, calendar/statistics
- Beanstack: fast book logging, family/child profiles, ISBN scanning
- honn / PicoBook / MiloMint: camera-first book-cover registration
- Journae Kids: preserve the child's own words and reading memories without pressure

For the EDUNI MVP, the highest-value flow is:

`take/choose photo -> title/date -> child reaction -> parent note -> save -> visual bookshelf`

OCR / ISBN lookup is intentionally deferred to Phase 2.

## Implemented

Route:

`/reading`

Mobile-first form:

- book photo capture / gallery select
- client-side resize to max 1600px JPEG before upload
- title
- author/publisher
- read date
- reading mode:
  - alone
  - together
  - read aloud
- child-friendly reaction
- child's own words
- memorable scene/story
- parent note

Bookshelf:

- newest-first cards
- photo/cover
- reading mode/reaction
- child quote
- memorable scene
- parent memo
- title/author search
- record deletion with confirmation

Summary:

- total records
- this-month records
- “read again” favorites

## Persistence

Metadata is stored in SQLite and images are stored as generated local files.

Production Docker wiring now points:

- `EDUNI_PORTAL_DB=/data/eduni_portal.sqlite3`
- `EDUNI_READING_DATA_DIR=/data/reading-journal`

The existing named volume `eduni_data:/data` therefore preserves both metadata and photos across container recreation.

**Deployment must copy any existing live `/app/data/eduni_portal.sqlite3` into the persistent volume before switching the environment variable if preserving current Portal history matters.**

## Security / validation

Server-side:

- title required
- text length limits
- ISO read date
- reading mode allow-list
- rating range 1–5
- JPEG/PNG/WEBP only
- image magic-byte validation
- max decoded image size 4 MiB
- random UUID image filename
- child-profile scoped records
- image removed when its record is deleted

Client-side:

- max source photo 15 MiB
- image resized before upload
- user text escaped when rendering record cards
- no external analytics/social/leaderboard features

## Changed product files

- `docker-compose.yml`
- `nice-gui-1-1-7/portal_app/__init__.py`
- `nice-gui-1-1-7/portal_app/reading_journal.py`
- `nice-gui-1-1-7/portal_app/routes.py`
- `nice-gui-1-1-7/portal_app/static_games/eduni_reading_journal.html`

Tests:

- `nice-gui-1-1-7/tests/test_reading_journal.py`

## Static validation completed

- browser inline JavaScript syntax: PASS
- base comparison: behind_by=0 at implementation review
- diff scope: reading journal + required portal/docker wiring only

## Pending before merge

Run Prompt 41:

`.agent/PROMPT_EDUNI_READING_JOURNAL_VERIFY_41.md`

No production deployment is included in this MVP implementation PR.
