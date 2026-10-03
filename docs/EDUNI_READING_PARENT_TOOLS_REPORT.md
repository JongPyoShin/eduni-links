# Reading parent tools: first-release verification

Date: 2026-10-03. Branch: `feature/eduni-ai-companion`.
Starting product/report HEAD: `03e5f5cf33ee4e1727050136b5342c1871756bf4`.
Plan and Luna instructions committed/pushed first: `313bdcd`.

## Result

FIRST IMPLEMENTATION PASS — NOT DEPLOYED.

Main researched/designed, Luna implemented, Main independently executed verification, and a read-only independent agent reviewed privacy/races. No PR, merge, production restart or deployment occurred. Host 8080 was never queried, connected, bound, stopped or killed. Production 8081, bridge, databases/volumes and other projects were not changed.

## Missing behavior / implementation

Previously the journal accepted manual camera/gallery covers and exposed basic counts, but lacked bibliographic cover lookup and parent-oriented pattern summaries.

Changed product/test files:

- `portal_app/reading_covers.py`: stdlib Open Library provider; title/publisher only, maximum five candidates, fixed HTTPS hosts, no redirects/arbitrary URLs, five-second socket timeout, bounded JSON/image reads, magic validation, 32-entry/8-MiB TTL cache and serialized request spacing. Queueing means five seconds is not a whole-operation deadline. Missing cover is 404; provider failure is 503.
- `portal_app/reading_journal.py`: allowlisted search payload, same-origin cover response, read-only profile-scoped SQL aggregates with future-date cutoff and inclusive recent/previous 30-day periods. No full record fetch or 200-record truncation, schema migration or new dependency.
- `static_games/eduni_reading_journal.html`: explicit search disclosure/action, candidate confirmation/import to existing compression/preview/save lifecycle, lookup-only publisher field (not persisted), collapsed parent panel, recorded modes/repeated-title counts and gentle next-activity suggestions. Shared image generations and insight generations discard stale work. Saving locks form controls and guards outside-form reset/edit/delete actions.
- `tests/test_reading_parent_tools.py`: provider/privacy/size/redirect/cache/spacing, missing image, full dataset/date/profile/empty-data coverage.
- `tests/test_reading_parent_tools.js`: actual inline script executed with deferred requests; explicit import, stale search/manual-photo protection, failed PUT draft/photo preservation, stale insights and failed refresh clearing.

No child name, profile ID, private note, child comment, favorite scene or photo is sent to search/AI by these new features. Only the explicitly entered bibliographic title/publisher query leaves EDUNI. Images return through the EDUNI server. Existing ordinary parent record search remains unchanged. The parent panel is parent-oriented UI, not a new PIN/authorization boundary.

## Research implementation and limits

The three source cards show source links, verified publication date/year and checked date 2026-10-03. They are curated material, not continuous background research or LLM-generated diagnosis:

- [AAP shared-reading guidance, 2024-09-29](https://www.healthychildren.org/English/news/Pages/beyond-literacy-shared-reading-starting-in-infancy-offers-lifelong-benefits.aspx): enjoyable conversation/relationship; early-childhood guidance is not an assessment of a seven-year-old.
- [National Literacy Trust UK reading survey, 2026-06-09](https://literacytrust.org.uk/research-services/research-reports/children-and-young-peoples-reading-in-2026/): varied experiences; foreign survey findings are not this child's score or Korean norms.
- [National Year of Reading 2026](https://literacytrust.org.uk/about-us/national-year-of-reading-2026/schools/): family/community and varied reading opportunities; exact publication day not asserted.

Open Library coverage of Korean books is unverified/limited. [NAVER official book API](https://developers.naver.com/docs/serviceapi/search/book/book.md) requires separately provisioned client credentials; no NAVER integration/secret was created. Camera/gallery fallback stays available. Provider work-level publisher/cover data may represent different editions; the parent must confirm the image before saving.

Counts describe recorded behavior, not actual total reading or developmental ability. Distinct titles use SQL LOWER/TRIM, not ISBN/edition identity; internal spaces and non-ASCII case handling can differ. Fewer than three records suppresses pattern suggestions: this is a conservative UI heuristic, not a validated educational threshold. Missing days, reading time, genre balance and ability are not inferred. Live research/LLM parent analysis is deferred, not silently substituted or claimed complete.

## Executed verification

1. Before edits: existing reading unit tests, 16 PASS.
2. Focused: `python -m unittest tests.test_reading_parent_tools tests.test_reading_journal`, 24 PASS.
3. `python -m py_compile portal_app/reading_covers.py portal_app/reading_journal.py`, PASS.
4. `python scripts/validate_content.py`, VALID (one enabled canonical activity).
5. Full suite once: `python -m unittest discover -s tests`, 233 run, 232 PASS, one PostgreSQL environment-gated skip, no failures.
6. Three executable Node checks: reading parent tools, companion UX and companion screen context, all PASS.
7. Independent negative mutation checks (in-memory source only, no product edits): removing the save guard caused failed-PUT draft assertion to fail; removing suggestion clearing caused stale-suggestion assertion to fail. Both expected failures prove those tests detect the reviewed defects.
8. Actual PostgreSQL 16 in a newly created isolated container/network: 205 recent records + one previous-period record, another profile and a future record. Complete counts, title repeats, profile isolation, date boundary and private-marker exclusion PASS. Repeated against final SQL aggregates in a fresh test database. Existing PostgreSQL CRUD/cover lifecycle integration test separately run with its opt-in flag: one PASS. Test PostgreSQL host port bindings `{}`.
9. Actual fresh SQLite app HTTP: `/healthz`, `/portal`, `/reading`, `/reading/api/health`, `/reading/api/insights`, `/ai/health`, `/bubble`, `/bubble-shooter` all 200. Extra `parent_note` in cover lookup rejected 400. Public book lookup yielded five candidates; image download succeeded. Synthetic record save/media byte equality, update/remove, delete and refreshed aggregate count PASS. No synthetic production record created.
10. Actual top-level headed Chrome, CSS viewports 1280×800 and 360×800 (verified `innerWidth/innerHeight`, not inferred from screenshot pixels; Chrome zoom affects capture pixel size): no horizontal overflow. Both public-title search → candidate selection → real cover preview PASS. Parent panel opens/closes, empty-data limitations and dated links visible. Physical camera/device acceptance not repeated in this release.
11. `git diff --check`, PASS. No dependency/deployment/companion files changed.

Local screenshot evidence (not committed as binary assets):

- Desktop parent panel: `C:/Users/GMK/.browser-control/artifacts/screenshot/2026-10-03/screenshot-1791031836759-78dc594dd2e3.png`
- Mobile parent panel: `C:/Users/GMK/.browser-control/artifacts/screenshot/2026-10-03/screenshot-1791031920231-492c739d745f.png`
- Mobile selected-cover preview: `C:/Users/GMK/.browser-control/artifacts/screenshot/2026-10-03/screenshot-1791031982629-c06a99f6ad9b.png`

Reproduction helpers retained locally under `D:/Codex/qa-temp/reading-parent-*20261003*`; fresh loopback apps and new disposable PostgreSQL resources only. Test container/network and temporary preview were stopped/removed after verification; production resources untouched.

## Independent review and remaining risks

Fixed during review: full-record memory aggregation replaced by SQL aggregates; provider missing-cover classification; outside-form new-record action during pending save; stale pattern suggestion after insight refresh failure. Latest independent read-only review reports no remaining confirmed defect in the changed scope.

Inherited multi-client record cover replacement can still race across separate browsers; this work guards frontend asynchronous operations, not database-level edit conflict resolution. Local browser automation and synthetic E2E do not establish real-device camera acceptance, Korean catalogue accuracy or production availability. A rollout approval and separate production checks are still required.

Final delivery commit includes only these product/tests and this report; use branch HEAD for the exact commit SHA (reported to the user after commit/push).
