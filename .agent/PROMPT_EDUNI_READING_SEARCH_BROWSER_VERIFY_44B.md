# EDUNI Reading Search — Browser Supplemental Verify 44B

## Mission

Supplement only the browser QA that was BLOCKED in Verify 44.

Repository: JongPyoShin/eduni-links
Branch: feature/child-reading-journal
Verified product-code baseline:
`5ea90089bf7d17816843b72b000f4cb4478c5164`

The branch may have later documentation-only commits for this supplemental
verification prompt/report. Those are allowed only if they do not modify product
or test code.

This is NOT a product implementation run.

Do not modify product code.
Do not fix product code.
Do not merge.
Do not deploy.
Do not touch production eduni-game or port 8081.

## Why this supplemental verification exists

Verify 44 already passed:

- PostgreSQL integration
- focused reading tests
- route tests
- full suite
- text search fields
- filters
- 36-record pagination
- stale-response race behavior
- CRUD regression
- PostgreSQL restart persistence
- isolated-resource cleanup

Verify 44 was BLOCKED only because the headed Chrome environment reported a
top-level viewport of `0x0` and screenshots failed, so the requested real
1280x800 and 360x800 top-level browser QA could not be completed.

Do not rerun the entire Verify 44 unless necessary to establish the isolated
browser target.

## 1. Git gate

Confirm:

- branch = feature/child-reading-journal
- PR #69 remains Draft
- `5ea90089bf7d17816843b72b000f4cb4478c5164` is still the latest commit that
  changes product/test code
- commits after that baseline, if any, are documentation-only
- no product/test files changed after that baseline
- original Verify 44 report exists only in the prior worktree unless separately
  supplied; do not invent its contents

If any product/test code changed after the baseline, stop and report BLOCKED.
A later docs-only prompt/report commit is expected and is not a blocker.

## 2. Isolated application target

Use an isolated app only.

Never touch:

- production eduni-game
- production port 8081
- production volumes
- Nextcloud
- codex-uv-lock-pg
- flopi-pr87-pg-20260911
- unrelated PostgreSQL resources

It is acceptable to recreate only the minimal isolated verification app and
PostgreSQL needed for browser QA.

Bind the isolated app to loopback on an unused high port such as 18081.

## 3. Browser requirement

The QA must use a TOP-LEVEL browser page.

Forbidden substitutes:

- iframe-only viewport simulation
- DOM-only static inspection
- CSS-only reasoning
- browser dimensions reported as 0x0
- screenshots from an iframe while top-level viewport is invalid

The browser must render a real top-level page and produce screenshots.

## 4. Preferred browser setup

Use a real Chrome/Chromium headed process.

If the existing browser harness again reports 0x0, diagnose the harness rather
than changing EDUNI product code.

Preferred fallback:

- Playwright or Selenium
- Chrome/Chromium
- headed mode
- a valid display (native desktop session or Xvfb when necessary)
- explicit top-level viewport/window dimensions
- screenshots saved successfully

For Playwright, a valid approach is:

- launch with `headless=False`
- set context/page viewport explicitly
- use `page.set_viewport_size(...)` if needed
- navigate directly to the isolated `/reading` URL
- verify JavaScript-reported dimensions
- take a screenshot

If using Xvfb, record that fact clearly in the report.
Do not call an iframe emulation a headed-browser substitute.

## 5. Required desktop evidence

Target: 1280x800 top-level viewport.

Navigate directly to:

`http://127.0.0.1:<isolated-port>/reading`

Capture and record:

- `window.innerWidth`
- `window.innerHeight`
- `document.documentElement.clientWidth`
- `document.documentElement.clientHeight`
- screenshot path
- browser engine/version

PASS dimensions:

- must be nonzero
- top-level page must be approximately the requested 1280x800 viewport
- small browser-framework differences are acceptable if explicitly explained
- 0x0 is FAIL/BLOCKED

Desktop QA checklist:

- page loads without top-level rendering failure
- bookshelf visible
- search input visible
- filter button visible
- filter panel opens/closes
- start/end date controls usable
- reading-mode filter usable
- rating filter usable
- result count visible
- no horizontal overflow
- first page displays correctly
- `더 보기` appears when more than 24 results exist
- `더 보기` appends additional cards without duplicate visible ids
- clear filters restores unfiltered state
- edit/delete controls remain usable
- no uncaught page errors
- no serious console errors

Take at least one screenshot showing the top-level desktop reading page.

## 6. Required mobile evidence

Target: 360x800 top-level viewport.

This must be a top-level page, not an iframe.

Capture and record:

- `window.innerWidth`
- `window.innerHeight`
- `document.documentElement.clientWidth`
- `document.documentElement.clientHeight`
- screenshot path

Mobile QA checklist:

- viewport is nonzero and approximately 360x800
- no horizontal overflow
- search input usable
- filter button usable
- filter panel is one-column
- date inputs fit without clipping
- mode/rating selects fit without clipping
- result count visible
- `더 보기` tappable when present
- edit/delete controls usable
- desktop-only mobile-preview toggle hidden on actual mobile viewport
- no uncaught page errors
- no serious console errors

Take at least one screenshot showing the top-level mobile reading page.

## 7. Screenshot requirement

A PASS is not allowed unless BOTH screenshots succeed:

1. desktop top-level screenshot
2. mobile top-level screenshot

Do not merely state that screenshots were attempted.

The report may reference local artifact paths, but the report itself MUST be
committed and pushed to the branch.

Do not commit screenshot binaries unless repository policy explicitly allows it.
Textual evidence with dimensions and screenshot paths is sufficient.

## 8. Product-regression sanity

Because product code must not change in this run, only do a minimal sanity check:

- /reading returns 200
- /reading/api/records returns 200 against isolated PG
- no product diff appears after browser QA
- `git diff --check` passes

Do not rerun broad test suites unless browser setup requires rebuilding the
candidate.

## 9. Cleanup

Remove only resources created by this 44B run.

Confirm production resources are untouched.

## 10. Report and push

Create:

`EDUNI_READING_SEARCH_BROWSER_VERIFY_REPORT_44B.md`

The report must contain:

- verified product HEAD
- browser/version
- whether native display or Xvfb was used
- desktop top-level viewport measurements
- desktop screenshot success/path
- desktop checklist result
- mobile top-level viewport measurements
- mobile screenshot success/path
- mobile checklist result
- console/page-error result
- product code unchanged confirmation
- production resources untouched confirmation
- cleanup confirmation

COMMIT AND PUSH THE REPORT to:

`feature/child-reading-journal`

Do not leave the report only in an isolated worktree.

Final verdict exactly one:

`READING SEARCH BROWSER VERIFY PASS — MERGE READY`

`READING SEARCH BROWSER VERIFY FAIL`

`BLOCKED`

PASS is allowed only if both top-level viewports are nonzero and both
screenshots succeed.

If PASS, recommendation exactly:

`MERGE`

Do not merge.
Do not deploy.
