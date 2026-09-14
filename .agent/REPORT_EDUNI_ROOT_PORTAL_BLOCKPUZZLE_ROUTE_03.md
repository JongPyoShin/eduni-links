# EDUNI Root / Portal / Block Puzzle Route Report

- START HEAD: `c9354d9`
- Implementation HEAD: recorded in the final commit
- Container: `eduni-game`, `127.0.0.1:8081`, healthy

## Route change

- Before: `/` rendered the block puzzle; portal card linked to `/`.
- After: `/` returns `307 Location: /portal`; `/portal` remains the portal; the unchanged block-puzzle UI is served at `/blockpuzzle`; the portal card now links to `/blockpuzzle`.

## Verification

- Docker rebuild/recreate: PASS (`docker compose up -d --build --force-recreate`)
- Container: one `eduni-game` app service, healthy, `unless-stopped`, `127.0.0.1:8081 -> 8080`
- HTTP: `/` redirects to `/portal`; `/portal`, `/hanja`, `/blockpuzzle`, `/bubble`, `/bubble-shooter`, `/portal/world/math`, `/portal/parent`, `/link`, `/omok`, `/jungle`, `/space`, `/healthz` all returned expected 200/redirect responses.
- Browser: `/portal` visibly rendered EDUNI Portal; its block-puzzle card target was `/blockpuzzle`; `/blockpuzzle` visibly rendered the existing block puzzle board and controls; `/hanja` remained available.
- Tests: content validation, 84 unit tests, Python compile, and `git diff --check` passed.
- Console/page errors: no new server/runtime errors observed in route smoke.

## Remaining risk

The browser interaction was limited to rendering and navigation; no full gameplay session was required because the implementation only moved the route and preserved the existing game body.
