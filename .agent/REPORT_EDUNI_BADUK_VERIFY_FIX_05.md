# EDUNI Baduk Phase 1 Verification Report

- START HEAD: `5af3999`
- FINAL HEAD: recorded in the implementation commit
- Reviewed: `portal_app/baduk.py`, `portal_app/static_games/eduni_baduk.html`, `tests/test_baduk_game.py`, `portal_app/__init__.py`, `portal_app/routes.py`

## Automated verification

- `scripts/validate_content.py`: PASS
- `python -m unittest discover -s tests`: PASS (88 tests)
- `python -m py_compile app.py portal_app/baduk.py`: PASS
- `git diff --check`: PASS
- Existing Baduk test suite covers route registration, compatibility routes, 9x9 engine markers, ko/pass/scoring/AI controls, and no external runtime dependency.

## Docker and HTTP

- Rebuilt/recreated the existing single `eduni-game` service; Nextcloud/MariaDB were not changed.
- Container: running and `healthy`; restart policy `unless-stopped`; Tailscale bind unchanged.
- `/healthz`, `/portal`, `/baduk`, `/baduk/`, `/games/eduni-baduk`, `/hanja`, `/blockpuzzle`, `/omok`, `/bubble`, `/bubble-shooter`, `/link`, `/jungle`, `/space`, `/portal/world/math`, and `/portal/parent` returned expected 200/redirect responses.

## Browser verification

- Portal accessibility tree contains exactly one Baduk card with same-origin `/baduk` target.
- The in-app headed browser could not reach the Tailscale-only bind from its isolated browser network (`ERR_CONNECTION_REFUSED`), so full headed move-by-move interaction and 360px viewport evidence are recorded as pending rather than claimed PASS.
- Rule behavior remains source/test-verified: capture, suicide rejection, capture-suicide exception, simple ko, consecutive pass termination, area score, AI legal-move filtering, and two-player mode.

## Findings / limits

- No Phase 1 rule bug was reproduced in the available automated checks; no game engine rewrite was made.
- Remaining limitation is environment-level headed-browser access to the Tailscale-only host binding. Area scoring remains the documented Chinese-area approximation; seki/real-eye nuances are out of scope.

## Follow-up runtime fix

The first fresh Docker rebuild exposed a real portal regression: the Facto and Baduk portal-card wrappers composed with incompatible positional arguments, producing HTTP 500 on `/portal`. The minimal fix passes `icon` and `accent` by keyword from the Baduk wrapper. After rebuild/recreate, `/portal`, `/baduk`, `/hanja`, `/blockpuzzle`, and `/healthz` all returned successfully; the full test suite remained green (88 tests).
