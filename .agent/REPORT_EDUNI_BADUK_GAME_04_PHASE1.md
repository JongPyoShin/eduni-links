# EDUNI Baduk Game 04 — Phase 1 Report

- START HEAD: `2f21d9d35ad9cf8be475b119560b3a0058fcbfa4`
- Phase 1 HEAD: `66f5e7ce8e609804596fc6f8f344b2ed8fa544b8`
- Scope: first implementation pass by ChatGPT; runtime/Docker/browser acceptance is intentionally deferred.

## Changed files

- `nice-gui-1-1-7/portal_app/baduk.py`
  - registers `/baduk`, `/baduk/`, `/games/eduni-baduk`, `/games/eduni-baduk/`
  - injects a `바둑` quick-start card immediately after the existing AI 오목 card without changing the large portal route module in Phase 1
- `nice-gui-1-1-7/portal_app/__init__.py`
  - loads the Baduk route/card extension with the family-server app
- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk.html`
  - responsive 9×9 Baduk UI and browser-only engine
- `nice-gui-1-1-7/tests/test_baduk_game.py`
  - static wiring/regression checks for route registration, portal-card extension, engine markers, and no external runtime dependencies

## Implemented gameplay

- 9×9 board, Black first
- AI game (human Black / AI White) and local two-player mode
- connected-group and liberty detection
- captures
- suicide prevention including capture-before-suicide evaluation
- simple ko using the immediately previous board position
- pass; two consecutive passes end the game
- resignation
- Chinese-style area-score approximation with White komi 6.5
- captured-stone counters, move count, last-move marker, star points
- responsive pointer/touch canvas UI and return-to-portal link

## AI

The Phase 1 AI enumerates legal White moves and applies a lightweight heuristic favoring captures, liberties, nearby stones, and central play with slight randomness. It is intentionally an introductory opponent, not a strong Go engine.

## Validation status

- GitHub diff review: PASS; Phase 1 is four files ahead of the prompt HEAD plus this report.
- Automated Python suite: NOT RUN from this chat environment.
- Docker rebuild/recreate: NOT RUN from this chat environment.
- Headed browser acceptance: NOT RUN from this chat environment.

These runtime checks remain required before PROMPT 04 can be declared final PASS.

## Remaining risks

- Portal-card insertion is implemented as a small Phase 1 extension wrapper around the existing `_portal_card` helper so the large `routes.py` file did not need a broad edit. A later cleanup may fold the `/baduk` constant/route/card directly into `routes.py` once runtime acceptance is complete.
- The area scoring is intentionally approximate and does not provide dead-stone/seki adjudication UI.
- AI strength is intentionally basic.
