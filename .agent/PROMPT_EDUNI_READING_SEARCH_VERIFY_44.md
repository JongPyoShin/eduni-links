# EDUNI Reading Journal — Server Search Verify 44

## Mission

Verification-only for Draft PR #69 after adding server-side reading-journal search,
filters, pagination, and search-response race protection.

Repository: JongPyoShin/eduni-links
Head branch: feature/child-reading-journal
Base: feature/eduni-space-mvp

Do not implement new features.
Do not fix failures in this run.
Do not merge.
Do not deploy.
Do not touch live eduni-game or production port 8081.

## Scope

Verify only the new search layer plus regression of the already-verified reading
journal CRUD/PostgreSQL behavior.

Expected search contract:

- search fields:
  - title
  - author / publisher text
  - child_comment
  - favorite_part
  - parent_note
- filters:
  - date_from
  - date_to
  - reading_mode
  - rating
- pagination:
  - limit
  - offset
  - deterministic order: read_date DESC, id DESC
- response:
  - records
  - total
  - limit
  - offset
  - summary
- summary remains global for the child profile and must not shrink to the current
  search result set
- UI page size: 24
- search input debounce: about 250 ms
- stale search responses must never overwrite newer results

## 1. Git gate

Confirm:

- PR #69 is Draft
- base is feature/eduni-space-mvp
- behind_by = 0
- record exact current HEAD
- no unrelated game logic changes
- previous PostgreSQL verification report 43 exists
- new changes since Verify 43 are bounded to reading search/filter/pagination/tests/docs

Do not merge even if all checks pass.

## 2. Static and unit validation

From repository root:

~~~powershell
cd nice-gui-1-1-7
python scripts/validate_content.py
python -m unittest tests.test_reading_journal
python -m unittest tests.test_routes
python -m unittest discover -s tests
cd ..
git diff --check
~~~

Record exact totals and skips.

Required unit coverage:

- query matches title
- query matches author/publisher field
- query matches child_comment
- query matches favorite_part
- query matches parent_note
- date_from/date_to filtering
- reading_mode filtering
- rating filtering
- combined filters
- offset pagination
- returned total remains full match count
- invalid reversed date range is rejected
- summary total/month/favorite is global, not current-page count
- explicit SQLite test path still works even when PostgreSQL env variables exist

Any regression = FAIL.

## 3. JS/static contract

Inspect the current reading HTML and confirm:

- search input exists
- filter toggle exists
- date-from/date-to controls exist
- reading-mode filter exists
- rating filter exists
- clear filters exists
- load-more button exists
- PAGE_SIZE = 24
- URLSearchParams is used
- searchRequestGeneration exists
- stale response guard compares request generation
- invalid date range increments/invalidates request generation before returning
- search input uses a short debounce rather than firing uncontrolled requests
- create/edit/delete success refreshes from the server instead of mutating a
  possibly stale filtered client list

Run JS syntax validation. Any syntax error = FAIL.

## 4. Isolated PostgreSQL environment

Do not use or modify live eduni-game.

Use isolated verification resources only, with names prefixed:

eduni-reading-search-verify-

Use postgres:16 and an ephemeral password.

Suggested resources:

- eduni-reading-search-verify-net
- eduni-reading-search-verify-pg
- eduni-reading-search-verify-game
- eduni-reading-search-verify-pgdata
- eduni-reading-search-verify-data

Do not publish PostgreSQL 5432 to host.

Build candidate image only with a verification tag, for example:

~~~powershell
docker build -f nice-gui-1-1-7/Dockerfile -t eduni-reading-search-verify:local .
~~~

Start isolated PostgreSQL and app on an unused loopback-only high port.
Do not use 8081.

Confirm:

- /healthz = 200
- /reading = 200
- /portal = 200
- /reading/api/health = 200
- reading storage reports postgresql

## 5. PostgreSQL search integration

Inside the isolated candidate environment run:

~~~powershell
docker exec -e EDUNI_ALLOW_POSTGRES_TESTS=1 eduni-reading-search-verify-game python -m unittest tests.test_reading_journal_postgres
~~~

Must PASS.

Confirm the integration test exercises a PostgreSQL-backed search with text and
filters.

## 6. API search dataset

Create at least 30 reading records for the active child in the isolated app.

The dataset must deliberately include:

- several September records
- at least one August record
- all three reading modes
- ratings 3, 4, 5
- unique keywords placed separately in:
  - title
  - author/publisher
  - child_comment
  - favorite_part
  - parent_note
- multiple records sharing the same read_date to test id DESC tie-breaking

Do not use production data.

## 7. API search checks

Against isolated /reading/api/records, verify:

### Text search

Each keyword must return the expected record when the keyword exists only in:

1. title
2. author/publisher
3. child_comment
4. favorite_part
5. parent_note

Case-insensitive Latin search should also work.

Unmatched query must return:

- records = []
- total = 0

### Filters

Verify independently and combined:

- date_from only
- date_to only
- date_from + date_to
- reading_mode=alone
- reading_mode=together
- reading_mode=read_aloud
- rating=3
- rating=4
- rating=5
- query + date range + mode + rating

Reversed date range must return HTTP 400 from the application contract.

### Pagination

With more than 24 matching records:

- request limit=24 offset=0
- request limit=24 offset=24
- no duplicate ids between pages
- first page has 24 when at least 24 exist
- total is identical on both pages
- order is read_date DESC, then id DESC
- concatenated pages match the expected first 48 or full result set as applicable

Verify limit and offset values are reflected correctly in response.

### Summary

While a restrictive search/filter is active:

- summary.total = all records for the child
- summary.month = all records in requested/current month for the child
- summary.favorite = all rating >= 5 records for the child

Summary must not equal only the filtered page unless that happens coincidentally.

## 8. Headed Chrome desktop QA

Viewport: 1280x800.

Verify:

- initial bookshelf loads first page only
- overall stats show global summary
- typing a query updates server-backed results
- result count shows total matches
- filter button opens/closes filter panel
- date/mode/rating filters work
- clear filters restores unfiltered first page
- if more than 24 results exist, 더 보기 appears
- 더 보기 appends the next page without duplicates
- once all results are loaded, 더 보기 disappears
- search + filter + 더 보기 work together
- editing a matched record and changing it so it no longer matches causes it to
  disappear after save
- deleting a matched record refreshes total/result list correctly
- creating a record while a restrictive search is active does not incorrectly
  inject it into results unless it matches
- no page/console errors

## 9. Headed Chrome mobile QA

Viewport: 360x800.

Verify:

- no horizontal overflow
- search input and filter button are usable
- filter panel becomes one column
- date fields/selects fit without clipping
- result count is visible
- load-more button is tappable
- record edit/delete remains usable
- desktop mobile-preview button remains hidden on actual mobile
- no page/console errors

## 10. Adversarial search races

Explicitly test stale response ordering.

Use browser interception or another deterministic delay technique if necessary.

### Rapid typing

Make request A for an older query intentionally slower than request B for the
newer query.

Example:

- type "고"
- immediately type "고양이"
- delay the "고" response
- allow "고양이" response to finish first

PASS only if late response A cannot overwrite B.

### Filter change during in-flight search

Start a text search request, then change reading_mode before it returns.

PASS only if the old text-only response cannot overwrite the newer combined
filter result.

### Invalid date range during in-flight search

Start a valid request, then set date_from later than date_to before the valid
request returns.

PASS only if:

- the previous valid response is invalidated
- the page shows the date-range validation message
- stale data does not reappear
- load-more is not left visible from an old total

### Load-more concurrency

Repeatedly click 더 보기 quickly.

PASS only if:

- there are no duplicate cards
- there is no skipped offset
- only one effective load-more request proceeds while already loading

Any stale overwrite or duplicate pagination result = FAIL.

## 11. PostgreSQL failure regression

Stop only the isolated verification PostgreSQL.

Confirm:

- candidate app remains running
- /portal remains reachable
- /reading/api/health returns 503
- search endpoint does not silently fall back to SQLite

Restart isolated PostgreSQL and confirm search recovers without rebuilding app.

## 12. Existing reading regression

Quickly re-check:

- create
- edit
- delete
- image keep
- image replace
- image remove
- photo stale-callback protection
- PostgreSQL persistence after app restart

Do not rerun unnecessary broad manual scenarios if automated evidence already
covers them, but any regression discovered here = FAIL.

## 13. Cleanup

Always remove only verification resources created by this run.

Never remove:

- live eduni-game
- live eduni_data
- Nextcloud resources
- codex-uv-lock-pg
- flopi-pr87-pg-20260911
- any unrelated PostgreSQL container/volume/image

Clear the ephemeral password environment variable afterward.

## 14. Report

Create:

EDUNI_READING_SEARCH_VERIFY_REPORT_44.md

Include:

- exact verified HEAD
- base SHA
- ahead/behind
- changed files
- focused/full test totals
- PostgreSQL integration result
- text-field search matrix
- filter matrix
- pagination evidence
- global summary evidence
- desktop QA
- mobile QA
- stale-response race evidence
- invalid-date race evidence
- PostgreSQL-down behavior
- existing CRUD regression result
- production resources untouched confirmation
- cleanup confirmation
- remaining risks

Final verdict exactly one:

READING SEARCH VERIFY PASS — MERGE READY
READING SEARCH VERIFY FAIL
BLOCKED

If PASS, recommendation exactly:

MERGE

Do not merge.
Do not deploy.
