# Reading parent tools: first implementation

Date: 2026-10-03. Base: 03e5f5cf33ee4e1727050136b5342c1871756bf4.
Owner: Main design/review; Luna sole product implementer. No merge or deployment.

## Goals and boundaries

1. Explicit `표지 찾기` after title and optional publisher entry; parent confirms a candidate before importing it into the existing photo preview/save flow. Never replace a photo merely because a search finishes.
2. Parent-only, descriptive reading-pattern panel using local full-dataset aggregates, not the currently displayed 24/200 records. It is not a developmental assessment, diagnosis, genre classifier, or reading-time measurement.
3. Dated, sourced education cards with practical shared-reading activities. This first release is curated research, not automatic continuous web research or LLM analysis. External AI receives no records.

The existing `author` field combines author/publisher. Add a lookup-only publisher input, labelled as search-only; no database migration and no silent reinterpretation of saved author values. Only explicit book title/publisher bibliographic queries leave the server. Child name, profile ID, notes, comments, favorite scenes and images never go to search/AI. Explain this before search. No new dependencies.

## Cover lookup

First provider: Open Library search API (no API key). Korean coverage is uncertain; empty results keep camera/gallery available. NAVER book API is the Korean-provider follow-up, requiring a separately provisioned client ID/secret; it is NOT implemented or claimed live in this release.

Use a small stdlib module with fixed HTTPS hosts: `openlibrary.org/search.json`, `covers.openlibrary.org/b/id/<integer>-M.jpg?default=false`. No arbitrary URL input, no redirects, credentials, or private hosts. Bound JSON size, image size (4 MiB), timeouts, candidate count (5), query lengths (160/120), cache size and request rate (at most 1/s; concurrent callers must be serialized). User-Agent identifies EDUNI without invented contact information. Provider errors return clear unavailable/empty states without mutating the form.

Search returns only safe bibliographic fields and opaque cover IDs, never raw provider HTML. Open Library work-level publishers/covers can represent different editions: display that limitation and require confirmation. Image download remains server-side; validate JPEG/PNG/WebP magic and reuse browser compression and existing `cover_data_url` persistence. Reject unsupported images. Selection alone does not create a reading record.

Reuse `imageJobGeneration` for search/import, manual camera/gallery, remove, edit/reset and title/publisher changes. Invalidate stale responses; they cannot resurrect old candidates or overwrite a newer photo. Disable conflicting actions while saving/importing, or explicitly invalidate them; inspect current save-reset race. Preserve existing replace/remove/cancel behavior.

## Local insights

New read-only insights endpoint chooses the default profile server-side. All SQL contains `child_profile_id` predicates; SQLite and PostgreSQL use existing adapter. No client-selected profile. Aggregate all eligible records up to today: totals, distinct normalized titles, repeated readings, mode counts and recent 30 days versus preceding 30 days. Future records excluded, dates inclusive and deterministic in tests. Never expose private free text or names. No average rating interpreted as ability.

Show the actual period, recorded count and limitations: unrecorded days are unknown, not failure. Empty/sparse records get a clear insufficient-data message (any UI heuristic is not a scientifically validated threshold). Suggest rereading a favorite, asking one open question, choosing together or drawing a scene; no deficit claims, comparisons, leaderboard, streak or pressure.

Refresh after create/edit/delete independently of current search filters. Guard stale insight responses. Mobile collapsed parent panel avoids obstructing the child's book/photo flow.

## Research and attribution

Cards include source URL, source publication date where verified, checked date 2026-10-03 and applicability limitations. Do not fabricate publication dates. Keep summaries short and paraphrased.

- [AAP 2024 shared reading](https://www.healthychildren.org/English/news/Pages/beyond-literacy-shared-reading-starting-in-infancy-offers-lifelong-benefits.aspx): prioritize enjoyable conversation and relationship, rather than volume competition; early-childhood guidance is not a diagnosis for a seven-year-old.
- [National Literacy Trust reading in 2026, published 2026-06-09](https://literacytrust.org.uk/research-services/research-reports/children-and-young-peoples-reading-in-2026/): UK survey shows varied enjoyment/frequency and a small overall recovery; foreign population statistics are not this child's score or Korean norms. Practical emphasis: let children choose enjoyable formats.
- [National Year of Reading 2026](https://literacytrust.org.uk/about-us/national-year-of-reading-2026/schools/): family/community participation and varied reading formats; campaign guidance, not an experimental treatment claim.
- [Open Library search](https://openlibrary.org/dev/docs/api/search), [covers](https://openlibrary.org/dev/docs/api/covers), [usage/rate limits](https://openlibrary.org/developers/api).
- [NAVER official book API](https://developers.naver.com/docs/serviceapi/search/book/book.md): registered client credentials required; metadata includes publisher and image.

## Acceptance and verification

- Existing reading baseline: 16 unit tests PASS before edits.
- Focused new tests: external request contains bibliographic fields only; malformed/oversize response, missing cover, redirect rejection, provider failure, rate/cache bounds, invalid IDs and image magic; no secret logging.
- Insights: zero/sparse, >200 records, two profiles, future/date boundary, deterministic SQLite; PostgreSQL contract/isolated runtime if available, otherwise explicitly mark unverified.
- Browser/JS: candidate confirmation, stale search/import vs new camera/photo/edit/reset/remove, save blocking, mobile layout, refresh after create/edit/delete. Actual fresh isolated local server and headed desktop/mobile screenshots; production and host 8080 untouched.
- Independent privacy/race review, focused then repository full validation once. Record failures honestly, document unavailable provider/PG/device acceptance separately.
- Commit/push detailed instructions first, then scoped implementation + final report. No PR/merge/deploy without a new approval.
