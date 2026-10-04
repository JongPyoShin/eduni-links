# Companion launcher scroll/resize fix

Date: 2026-10-04. Branch `feature/eduni-ai-companion`.

## Cause / minimal fix

The shared bottom-dock detector treated visible full-screen fixed containers as bottom action bars. NiceGUI creates empty full-height center notification lists on the portal. On scrollbar-free/mobile geometry, a resize (including browser-chrome height changes) could set the offset greater than viewport height, moving the fixed AI launcher above the screen. The launcher CSS and direct body insertion were correct.

Only `portal_app/static_games/eduni_companion.js` product code changed: exclude hidden/offscreen/full-height elements and accept only fixed lower-half, limited-height, horizontally overlapping bottom controls. Bound the offset to keep the launcher in the viewport. No scroll listeners, new dependencies, route, privacy, AI prompt/model or backend changes.

## Evidence / verification

- Clean starting branch `375ede943f0972a4d34173e0164b5bb4f0c7bb5c`; existing companion UX/context tests passed before changes.
- New executable `tests/test_companion_dock.js` fails against historical `375ede9` with offset `812 !== 0`, passes current code. Cases: full-height notifications, valid dock, hidden/offscreen/non-overlap controls, repeat resize and landscape visibility.
- Main independently reproduced in actual top-level headed Chrome with an isolated real NiceGUI portal, fresh temporary data and QA-only hidden-scrollbar CSS. Historical JS served unchanged from Git: viewport 361x801, offset 813px, launcher top -89.88 / bottom -25.89 (fully offscreen).
- Same isolated real portal/hidden-scrollbar CSS with current JS: viewport 361x801, scrollY 1428.89 after End and resize, offset 0px, launcher top 723.13 / bottom 787.12. Hit-test returned launcher; clicking opened AI panel. QA-only CSS/bootstrap are outside Git and not deployed.
- Default production-like Chrome with ordinary scrollbars did not initially reproduce; the scrollbar-free comparison isolated the cause. This is desktop browser proof, not a physical phone test.
- Shared JS verified on isolated Sudoku and Link routes; full-screen Link app wrapper also correctly excluded. Synthetic bottom dock geometry remains supported.
- Content validation PASS; full Python suite 237 tests, zero failures/one existing PostgreSQL-environment-gated skip (UTF-8 runtime). Dock, UX and context Node checks PASS; `git diff --check` PASS.
- Independent read-only reviewer: no new blocker; privacy/backend unchanged, full-screen exclusion and offset bound confirmed.

## Scope / remaining risks

Two implementation files (shared JS and new Node test), plus this report. No unrelated edits, merge or PR. Real phone browser-chrome changes still require user acceptance. Lower-half dock geometry intentionally excludes large full-screen overlays, which should retain their own modal behavior instead of moving the launcher offscreen.

## Production rollout / acceptance

Product `7549f66` deployed through existing Compose project `eduni-space-mvp`, `up -d --no-deps --build eduni-game` only. Same existing ignored env files/secrets reused, compared without emitting values. Existing bridge process was not restarted because bridge code did not change.

- Backup outside Git `D:/Codex/Backups/eduni-companion-scroll-20261004`: full app data, online SQLite 20,480 bytes, PG custom dump 3,675 bytes (list verified). Previous image retained as `eduni-rollback:pre-companion-scroll-20261004` (`sha256:92d58c435b0b47676221459ca4535d43073164cd1ce9065115cb4b37dc5f1fc9`).
- New app image `sha256:e37c9d50d6542f42c7b173c21bc4db70162a0acaf20bdb666f6df92d7f0a4925`, container `ccdc15a20b1798d3e0e4a437f94814cb2b90a0447ab64ead4e788909e711930c`, healthy. Deployed shared JS hash matches checkout.
- App/PG volumes unchanged. PG container ID/start time unchanged, healthy, host port unpublished. SQLite integrity/counts, reading record count and media inventory identical before/after. No production test records created.
- HTTPS portal/reading/reading health/insights/AI health/bubble/bubble-shooter/baduk/omok/sudoku and app health all 200; PostgreSQL reading health healthy; existing canonical redirect retained. No new inference was required for a geometry-only change.
- Actual top-level headed production Chrome: home bottom after scrolling and resize, CSS 360x801, scrollY 1436, offset 0px, launcher top 708/bottom 772; center hit-test is launcher. Screenshot `C:/Users/GMK/.browser-control/artifacts/screenshot/2026-10-04/screenshot-1791082540718-69d1f92c7fdc.png`. Temporary viewport reset and test apps stopped afterward.
- Runtime error marker scan zero. No host 8080 query/connection/bind/stop/kill; no unrelated Docker services, PostgreSQL restart, TLS changes, prune/down/volume removal. No merge or PR.

Verdict: **COMPANION SCROLL FIX DEPLOY PASS — PHYSICAL PHONE ACCEPTANCE PENDING**. Refresh the canonical portal on the phone to load the changed, version-hashed widget. Rollback, if needed, uses retained app image and same Compose project/env/volumes with app-only `--no-deps --no-build`; no rollback was required.
