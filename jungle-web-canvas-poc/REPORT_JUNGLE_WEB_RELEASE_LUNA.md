# Jungle Web Canvas Luna release report

## Scope

- Base: `843ebed58b1f54dbaa341c15f54cfe1d562e8435` (detached WIP preserved)
- Branch: `feature/jungle-web-canvas-luna`
- Initial WIP status: `jungle-hub.html`, `src/game.js`, `src/sky_ridge_game.js` modified; bird codex/manifest/quiz source and three tests untracked; `node_modules/`, `pnpm-lock.yaml`, `tmp/` generated and excluded.
- Production/8081, host 8080, Android, and unrelated Docker were not touched.

## Implementation

The existing Canvas/Three play loop now keeps the bird quiz session in localStorage while a quiz is active. Reloading or re-entering the same bird resumes the unanswered question; completing or failing a quiz clears the active session. Existing codex capture and stage reward writes remain idempotent, so re-capture does not duplicate badges.

The WIP bird codex, 65-question bank, three bird manifest entries, hub link/count, and Camp/Waterfall/Sky Ridge quiz bridges are included. Cave and Giant Tree retain their authored sequential learning/reward loops.

## Verification

- `npm test`: **232 passed, 0 failed**.
- `git diff --check`: passed (only normal LF/CRLF warnings).
- Headed Chrome extension QA opened and exercised real keyboard input on all five entry points at `?qa=1`: Camp, Waterfall, Cave, Giant Tree, Sky Ridge. Each page loaded its expected title/HUD and input controls; Cave reported `GLB 4/4 · fallback 0`, Giant Tree `GLB 6/6 · fallback 0`, and no console warning/error entries were captured.
- Hub DOM showed the codex link `(0/3)`, all five stage cards, and the expected locked progression text.
- Explicit viewport QA used Browser Control/CUA's viewport capability on an isolated local tab. The emulated device scale was `dpr=0.5`, so CSS sizes were doubled while the requested physical sizes were applied.
  - `360x800`: hub and Camp screenshots rendered; successful capture reported CSS `720x1600` at `dpr=0.5`; console warnings/errors `[]`.
  - `390x844`: Camp, Waterfall, Cave, Giant Tree, and Sky Ridge each captured once with `getAXStateAndScreenshot()`; measured CSS `780x1688`, `overflow=false`; Cave `GLB 4/4 · fallback 0`, Giant Tree `GLB 6/6 · fallback 0`, and Sky Ridge `단계 1/9 · skyGate`.
  - `412x915`: measured CSS `824x1830`, `overflow=false`, but the one permitted screenshot attempt timed out at `Page.captureScreenshot` after the viewport was applied. This remains unverified visual evidence, not PASS.
  - `1024x768` tablet/landscape: fresh-tab capture returned `Cannot take screenshot with 0 width`; measured `w=0,h=0`, `overflow=true`. This is an environment/tab-sizing blocker, not a product-code change.

## Limitations / verdict

390×844 visual capture now covers all five regions, and 360×800 covers hub/Camp. 412×915 and tablet/landscape remain blocked by the specific screenshot/zero-width errors above; no screenshot call was retried after each failure.

**PARTIAL — not ready to claim full visual release acceptance.** Source/test scope is ready for review; rerun headed Chrome with a non-zero viewport and attach screenshots before merge/deploy.
