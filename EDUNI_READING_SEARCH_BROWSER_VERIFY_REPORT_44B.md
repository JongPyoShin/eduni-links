# EDUNI Reading Search Browser Verify 44B

## Verdict

**READING SEARCH BROWSER VERIFY PASS — MERGE READY**

Recommendation: **MERGE** (no merge or deployment was performed).

This was the browser-only supplement to Verify 44. No broad Verify 44 test suite was rerun and no product or test code was changed.

## Git gate

- Branch: `feature/child-reading-journal`.
- PR #69: OPEN, Draft, mergeable; base `feature/eduni-space-mvp`.
- Product-code baseline remains `5ea90089bf7d17816843b72b000f4cb4478c5164`.
- Pre-report branch HEAD: `d05bd2927a602cc322e6a9eb311520f9f2c5762b`.
- Changes after the product baseline before this report were documentation-only (the 44B prompt). This report is also documentation-only.
- Original Verify 44 report remains in its separate prior worktree; this report does not copy or restate its contents.
- Product code/test diff after Verify 44: none. `git diff --check`: PASS.

## Browser and isolated target

- Browser: Google Chrome `153.0.8010.50`, Playwright Chromium driver, `headless=False`.
- Display: native Windows desktop session; no Xvfb.
- App: isolated candidate from the verified product baseline, loopback-only `127.0.0.1:18081`, backed by a dedicated PostgreSQL 16 container. `/reading` loaded successfully and `/reading/api/health` reported PostgreSQL; `/reading/api/records` returned HTTP 200.
- All checks used a **top-level page**. No iframe viewport simulation was used.

## Desktop — top-level 1280×800

- `window.innerWidth/innerHeight`: `1280 × 800`.
- `documentElement.clientWidth/clientHeight`: `1265 × 800`; the 15px difference is the native vertical scrollbar. `scrollWidth=1265`, equal to client width: no horizontal overflow.
- Screenshot succeeded: `C:\Users\GMK\AppData\Local\Temp\eduni-reading-search-44b\reading-desktop-1280x800.png` (PNG `1265 × 6534`, full-page capture of the 1280×800 top-level viewport).
- Initial bookshelf: 24 cards, global summary 30, and load-more visible.
- Search input and filter button visible. Filter panel opened and closed. Date range, reading mode, and rating filters produced the expected matching set; search combined with filters returned 30 matches.
- Load-more appended the remaining six records: 30 cards, 30 unique IDs; load-more then hid.
- Clear filters restored the unfiltered first page (24 cards; global summary 30).
- Edit opened the edit form and Cancel returned safely; edit and delete controls were visible.

## Mobile — top-level 360×800

- Set the actual top-level page viewport to `360 × 800` with Playwright `page.set_viewport_size`.
- `window.innerWidth/innerHeight`: `360 × 800`.
- `documentElement.clientWidth/clientHeight`: `345 × 800`; the 15px difference is the native vertical scrollbar. `scrollWidth=345`, equal to client width: no horizontal overflow.
- Screenshot succeeded: `C:\Users\GMK\AppData\Local\Temp\eduni-reading-search-44b\reading-mobile-360x800.png` (PNG `360 × 800`).
- Filter panel rendered as one column. All four date/mode/rating controls fit at x=15.5–329.5px and 314×42px, within the viewport. Search field and filter button fit; result count was visible.
- Mobile preview toggle computed to `display:none`.
- Load-more was visible and clickable; edit opened and Cancel worked; delete opened its confirmation, which was dismissed without mutating the fixture.

## Errors, cleanup, and scope

- Uncaught page errors: none. Serious console errors: none.
- Removed only this run's isolated app/PostgreSQL containers, two named volumes, network, and image. No screenshot binaries were added to Git; screenshots remain at the paths above for inspection.
- Production `eduni-game` / 8081 and volumes, Nextcloud, `codex-uv-lock-pg`, and `flopi-pr87-pg-20260911` were untouched. No merge or deployment occurred.
- The only intended Git change from this run is this report; it is committed and pushed separately from product code.
