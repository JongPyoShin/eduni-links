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

Production preservation, resulting image and live acceptance are appended after rollout. Host 8080 and unrelated services remain prohibited.
