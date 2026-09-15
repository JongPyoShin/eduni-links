# EDUNI Baduk PR #60 — MiMo Runtime / Browser Verification

## Role

You are the final runtime and browser QA agent for Baduk PR #60.

This is a **verification-only** task. Do not modify, refactor, reformat, commit, merge, or push application code unless the user explicitly gives a separate fix instruction after you report a defect.

Nemotron has already completed the independent code/test review. Your job is to verify what remains: **real application startup, real routes, real browser interaction, responsive/mobile behavior, and user-visible Baduk flows.**

If an item cannot be executed in your environment, mark it `NOT VERIFIED`; never infer PASS from source code alone.

---

## Repository / PR

Repository: `https://github.com/JongPyoShin/eduni-links.git`

Verification branch: `fix/baduk-v2-coach-runtime`

Base branch: `feature/eduni-space-mvp`

Pull Request: `#60 — Fix: unify Baduk v2 coach runtime and local move explanations`

Expected starting HEAD before this instruction file: `d561a334f7a1e3984bfe4faf91d845e958fcd59f`

At the start, run `git fetch` and record the **actual remote HEAD** you verify. If it differs, verify the latest remote branch HEAD and report the exact SHA.

Do not merge PR #60.

---

## Read first

Read only the minimum relevant files first:

```text
AGENTS.md
nice-gui-1-1-7/AGENTS.md
.agent/PROMPT_EDUNI_BADUK_NEMOTRON_VERIFY_07.md
BADUK_PR60_VERIFICATION_REPORT.md   # only if present

nice-gui-1-1-7/portal_app/baduk.py
nice-gui-1-1-7/portal_app/baduk_v2_integration.py
nice-gui-1-1-7/portal_app/static_games/eduni_baduk_v2.html
nice-gui-1-1-7/portal_app/static_games/eduni_baduk_coach_logic.js
```

Do not scan or refactor unrelated repository areas.

---

# Verification goal

PR #60 should be considered final-merge-ready only if the actual running application proves all of the following:

1. `/baduk` loads successfully in a real browser.
2. AI mode works from human move through AI reply.
3. Coach preview works before human placement.
4. AI explanation appears after an AI move.
5. Local two-player mode works and shows factual `이 수로 바뀐 점` post-move explanations.
6. 9×9 / 13×13 / 19×19 level switching works and resets board state.
7. Desktop and `360×800` mobile viewport are usable.
8. `/baduk`, `/baduk/`, `/games/eduni-baduk`, and `/portal` work in the actual running app.
9. The portal contains the Baduk card and navigation to/from Baduk works.
10. No browser console/runtime errors block the game.

---

# Phase 1 — Environment and app startup

Use the repository's existing documented startup/deployment method. Do not introduce a new server or dependency just for this test.

Before startup record:

```text
OS:
Python version:
Node version:
Browser / browser automation available:
Verified git SHA:
Working tree clean/dirty:
```

Start the actual application that serves the dynamic learning portal and `/baduk` route.

Record:

- exact startup command
- bind host/port
- process/container status
- startup errors/warnings relevant to Baduk

If Docker is the repository's intended runtime and is available, prefer validating that runtime. If Docker is unavailable, use the documented local app startup and clearly report the difference.

Do not change Tailscale, Nextcloud, public link, firewall, deployment, or host configuration.

---

# Phase 2 — Real HTTP route smoke

Test the **running application**, not only source definitions.

Verify:

```text
/baduk
/baduk/
/games/eduni-baduk
/portal
```

For each route report:

```text
URL/path:
HTTP result:
Final rendered destination:
PASS / FAIL:
```

Expected behavior:

- `/baduk` → game renders successfully
- `/baduk/` → game renders successfully
- `/games/eduni-baduk` → intended redirect/redirect HTML to `/baduk`
- `/portal` → portal renders successfully

A source-code route declaration is not sufficient evidence.

---

# Phase 3 — Portal navigation smoke

In a real browser:

1. Open `/portal`.
2. Confirm exactly one visible Baduk card is present in the expected game section.
3. Confirm it is placed after Omok as intended.
4. Activate the Baduk card.
5. Confirm navigation reaches `/baduk` and the board renders.
6. Use the `← 포털` link in Baduk.
7. Confirm return to `/portal` works.

Report any duplicate card, wrong URL, broken navigation, blank page, or HTTP 500 as FAIL.

Capture screenshots if your environment supports screenshots.

---

# Phase 4 — Desktop Baduk smoke

Use a desktop viewport around `1280×800` or larger.

On `/baduk`, confirm:

- title and board visible
- level selector visible
- mode selector visible
- coach toggle visible and ON by default
- New Game / Pass / Resign / Hint visible
- board accepts pointer input
- no blocking horizontal/vertical layout issue
- no blank canvas
- no uncaught console/runtime error

Capture one baseline desktop screenshot if possible.

---

# Phase 5 — AI mode end-to-end

Set:

```text
Mode: AI와 두기
Level: 초급 · 9×9
Coach: ON
```

Perform this exact flow:

1. Click/tap an empty legal intersection.
2. Verify the stone is **not immediately committed**.
3. Verify coach preview appears.
4. Verify ghost/candidate indication is visible.
5. Verify `여기에 두기` is available for a legal move.
6. Confirm the move.
7. Verify the human black stone is committed.
8. Wait for AI white response.
9. Verify the AI white stone is committed.
10. Verify coach card changes to `AI는 왜 여기에 뒀을까?`.
11. Verify an explanation is actually visible.

Also test one invalid preview if practical, such as selecting an occupied intersection after stones exist:

- board state must not change
- invalid reason must be shown
- confirm must not permit the illegal move

Report actual move coordinates used where possible.

---

# Phase 6 — Local two-player end-to-end

Set:

```text
Mode: 둘이 두기
Level: 초급 · 9×9
Coach: ON
```

Verify black and white can alternate turns.

For each committed human move, confirm the post-move coach title appears as:

```text
이 수로 바뀐 점
```

The explanation must describe an observable result, not inferred human intent.

Explicitly inspect text for prohibited intent language such as:

```text
하려고
의도
노린
전략적으로
생각해서
것 같아요
```

unless the sentence is clearly describing a deterministic board fact rather than guessing intent.

At minimum verify an ordinary non-capture move. If practical, construct and verify one tactical case:

- capture, or
- atari, or
- connection

For a capture case, compare the rendered board/capture counter with the explanation count. A mismatch is FAIL.

### Perspective check

Pay special attention to `내 돌` / `상대 돌` wording.

Verify the explanation is not semantically reversed for black vs white. Do not PASS this from string presence alone; compare the actual before/after board state.

If wording is ambiguous or objectively from the wrong player's perspective, record it as a defect with screenshot and move sequence.

---

# Phase 7 — Board level switching

Test all three levels in the real browser:

```text
초급 · 9×9
중급 · 13×13
정규 · 19×19
```

For each level:

- board visibly changes to correct grid size
- aria/visible level text is consistent
- legal move can be placed
- coach preview still works
- AI mode can reply at least once where practical
- board is reset when changing level
- prior stones do not leak into the new board
- previous capture/move state is reset appropriately

For 13×13, verify the coach explanation can show the intended additional liberty detail.

For 19×19, verify the coach explanation can show the intended additional connection / opponent-atari-group detail when available in the tested move context. If the exact tactical context is impractical to construct, verify the level works and mark the specific detailed-copy scenario `NOT VERIFIED`, not PASS.

Do not evaluate AI playing strength as part of PR #60; only confirm it responds and does not break the UI/runtime.

---

# Phase 8 — Mobile 360×800 QA

Set browser viewport exactly or approximately:

```text
360 × 800
```

Test `/baduk` again.

Verify:

- page loads without horizontal overflow that blocks use
- board fits the viewport width
- board intersections remain tappable
- 9×9 works
- 13×13 works
- 19×19 renders and can receive a tap
- level selector is usable
- mode selector is usable
- coach toggle is usable
- coach card is readable
- mini-board does not overflow unusably
- `여기에 두기` and cancel/acknowledge buttons can be reached and tapped
- portal link can be reached
- controls are not hidden behind the board

Perform at least one complete legal coach-preview → confirm flow at 360×800.

If browser tooling supports screenshots, capture at least:

1. 360×800 9×9 coach preview
2. 360×800 19×19 board
3. local mode `이 수로 바뀐 점` if possible

A cosmetic issue is LOW unless it blocks tapping/reading/navigation. A control that cannot be reached or used is HIGH/BLOCKER depending on impact.

---

# Phase 9 — Console/runtime health

During browser verification, inspect console/runtime errors if tooling supports it.

Look specifically for:

- `ReferenceError`
- `TypeError`
- duplicate declaration/syntax errors
- missing `EDUNIBadukCoachLogic`
- missing `EDUNIBadukEngine`
- errors from `sharedCoachLogic()`
- canvas rendering exceptions

Warnings unrelated to Baduk may be noted but should not automatically fail PR #60.

Any Baduk error that prevents preview, placement, AI reply, local explanation, level switching, or navigation is at least HIGH.

---

# Phase 10 — Optional quick automated recheck

Nemotron already ran the deeper automated suite, so do not spend most of this task repeating it. However, before final verdict, run these focused tests if the environment allows:

```powershell
cd nice-gui-1-1-7
python -m unittest tests.test_baduk_v2_integration
node --test tests/baduk_coach_logic.test.mjs
node --test tests/baduk_board_levels.test.mjs
cd ..
git diff --check
```

If Windows cp949-related pre-existing failures appear, distinguish them from PR regressions. Do not modify encoding-related files in this verification task.

---

# Defect handling

Do not fix defects automatically.

For every defect report:

```text
Severity: BLOCKER / HIGH / MEDIUM / LOW
Area:
Viewport/mode/level:
Exact reproduction steps:
Expected:
Actual:
Console error (if any):
Screenshot/evidence:
Likely file/function:
Regression caused by PR #60?: YES / NO / UNKNOWN
```

Do not commit screenshots, logs, or reports into the repository unless explicitly instructed. They may remain as QA artifacts or be referenced in your final report.

---

# Verdict rules

## PASS / MERGE READY

Use only if all merge-blocking runtime checks are actually executed and pass:

- actual app starts
- actual `/baduk` renders
- actual route smoke passes
- desktop browser flow passes
- AI move + AI explanation passes
- local two-player + factual explanation passes
- 9/13/19 switching passes
- 360×800 core flow passes
- no blocking Baduk console/runtime errors

Minor cosmetic findings may still result in `PASS WITH LOW FINDINGS` if they do not block use.

## CONDITIONAL PASS

Use only if core runtime/browser behavior passes but one non-critical test is genuinely unavailable or a non-blocking MEDIUM issue remains.

## FAIL / DO NOT MERGE

Use if any of these occur:

- `/baduk` fails to run/render
- route returns server error
- coach preview cannot confirm legal moves
- AI cannot make/respond to a move due to this PR
- AI explanation crashes or is missing
- local post-move explanation is missing or factually wrong
- `내 돌`/`상대 돌` perspective is materially reversed
- level switch corrupts state
- mobile controls are unusable
- shared-coach integration causes JS runtime error
- portal navigation is broken by this PR

---

# Final report format

Use exactly this structure:

```text
BADUK PR #60 MIMO RUNTIME / BROWSER VERIFICATION

Verified branch:
Verified commit:
Environment:
App startup command:
Browser/tool:

Overall:
PASS / PASS WITH LOW FINDINGS / CONDITIONAL PASS / FAIL

1. Real app startup
- Result:
- Evidence:

2. HTTP route smoke
- /baduk:
- /baduk/:
- /games/eduni-baduk:
- /portal:

3. Portal navigation
- Result:
- Evidence:

4. Desktop QA
- Result:
- Evidence:

5. AI mode
- Preview before commit:
- Human move:
- AI reply:
- AI explanation:
- Invalid move handling:

6. Local two-player
- Alternating turns:
- “이 수로 바뀐 점”:
- Factual/not intent-based:
- Perspective correctness:
- Tactical scenario tested:

7. Board levels
- 9×9:
- 13×13:
- 19×19:
- State reset:

8. Mobile 360×800
- Layout:
- Board interaction:
- Coach interaction:
- 19×19 usability:
- Screenshots:

9. Browser console/runtime
- Result:
- Errors:

10. Focused regression tests
- test_baduk_v2_integration:
- baduk_coach_logic.test.mjs:
- baduk_board_levels.test.mjs:
- git diff --check:

11. Findings
[BLOCKER]
None or findings

[HIGH]
None or findings

[MEDIUM]
None or findings

[LOW]
None or findings

12. Not verified
- Explicitly list anything not executed.

13. Recommendation
MERGE READY
or
DO NOT MERGE

Reason:
```

Do not call the PR merge-ready if browser/runtime checks were inferred from code rather than actually executed.
