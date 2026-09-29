# Jungle Web Canvas Luna release report

## Scope

- Base: `843ebed58b1f54dbaa341c15f54cfe1d562e8435` (detached WIP preserved)
- Branch: `feature/jungle-web-canvas-luna`
- Initial WIP status: `jungle-hub.html`, `src/game.js`, `src/sky_ridge_game.js` modified; bird codex/manifest/quiz source and three tests untracked; `node_modules/`, `pnpm-lock.yaml`, `tmp/` generated and excluded.
- Production/8081, host 8080, Android, and unrelated Docker were not touched.

## Implementation

The existing Canvas/Three play loop now keeps the bird quiz session in localStorage while a quiz is active. Reloading or re-entering the same bird resumes the unanswered question; completing or failing a quiz clears the active session. Existing codex capture and stage reward writes remain idempotent, so re-capture does not duplicate badges.

The WIP bird codex, 65-question bank, three bird manifest entries, hub link/count, and Camp/Waterfall/Sky Ridge quiz bridges are included. Cave and Giant Tree retain their authored sequential learning/reward loops.

The visual follow-up adds a numbered five-stage route rail, explicit `진행 가능` / `잠김` / `완료 · 다시 보기` card states, and a persisted progress meter to the hub. The phone breakpoint is `900px` CSS width to account for the headed Chrome device scale used in QA; this keeps the stage cards one-column and touch-sized at phone widths without changing gameplay or storage logic.

The HUD follow-up adds a visible `지도` return link to Camp/Waterfall, Cave, Giant Tree, and Sky Ridge, plus a `숲속 탐험 캠프 · 탐험 중` / `안개 폭포 · 탐험 중` chip for the shared Camp/Waterfall entry screen.

## Verification

- `npm test`: **232 passed, 0 failed**.
- `git diff --check`: passed (only normal LF/CRLF warnings).
- Headed Chrome extension QA opened and exercised real keyboard input on all five entry points at `?qa=1`: Camp, Waterfall, Cave, Giant Tree, Sky Ridge. Each page loaded its expected title/HUD and input controls; Cave reported `GLB 4/4 · fallback 0`, Giant Tree `GLB 6/6 · fallback 0`, and no console warning/error entries were captured.
- Hub DOM showed the codex link `(0/3)`, all five stage cards, and the expected locked progression text.
- Follow-up hub QA showed the new route heading, all five numbered card states, and progress meter. At the emulated phone viewport, computed grid columns changed to a single `684px` column with `overflow=false`.
- Follow-up browser DOM QA at emulated `390x844` (`CSS 780x1688`, `dpr=0.5`) confirmed the Waterfall stage chip, Cave `지도` link, and `overflow=false` on both pages.
- Explicit viewport QA used Browser Control/CUA's viewport capability on an isolated local tab. The emulated device scale was `dpr=0.5`, so CSS sizes were doubled while the requested physical sizes were applied.
  - `360x800`: hub and Camp screenshots rendered; successful capture reported CSS `720x1600` at `dpr=0.5`; console warnings/errors `[]`.
  - `390x844`: Camp, Waterfall, Cave, Giant Tree, and Sky Ridge each captured once with `getAXStateAndScreenshot()`; measured CSS `780x1688`, `overflow=false`; Cave `GLB 4/4 · fallback 0`, Giant Tree `GLB 6/6 · fallback 0`, and Sky Ridge `단계 1/9 · skyGate`.
  - `412x915`: measured CSS `824x1830`, `overflow=false`, but the one permitted screenshot attempt timed out at `Page.captureScreenshot` after the viewport was applied. This remains unverified visual evidence, not PASS.
  - `1024x768` tablet/landscape: fresh-tab capture returned `Cannot take screenshot with 0 width`; measured `w=0,h=0`, `overflow=true`. This is an environment/tab-sizing blocker, not a product-code change.

## Limitations / verdict

390×844 visual capture previously covered all five regions, and 360×800 covered hub/Camp. The updated hub's 390px screenshot call timed out after the CSS breakpoint fix (`Page.captureScreenshot`, one attempt); DOM/computed-style evidence confirms the one-column fix. 412×915 and tablet/landscape remain blocked by the specific screenshot/zero-width errors above; no failed screenshot call was retried.

**PARTIAL — not ready to claim full visual release acceptance.** Source/test scope is ready for review; rerun headed Chrome with a non-zero viewport and attach screenshots before merge/deploy.
