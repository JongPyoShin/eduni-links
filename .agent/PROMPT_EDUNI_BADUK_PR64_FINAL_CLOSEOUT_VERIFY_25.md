# EDUNI Baduk PR #64 — Final Closeout Verification (Prompt 25)

This is the final merge-readiness verification after Prompt 24 returned `CONDITIONAL PASS`.

## Target

- repo: `JongPyoShin/eduni-links`
- branch: `feature/baduk-ai-danger-coach`
- PR: #64
- expected HEAD when this prompt was created: `5e60cdf466762cedf7147b65f4cb75bc02230d37` or later fast-forward commit on the same branch
- base: `feature/eduni-space-mvp`

Read first:

- `/AGENTS.md`
- `/nice-gui-1-1-7/AGENTS.md`
- `.agent/PROMPT_EDUNI_BADUK_PR64_EXEC_VERIFY_23.md`
- `.agent/PROMPT_EDUNI_BADUK_PR64_FIX_VERIFY_24.md`
- `BADUK_AI_DANGER_UNDO_VERIFY_REPORT_FIX24.md`

Do not merge automatically. Do not deploy/rebuild production 8081.

## 1. Confirm current HEAD

Run:

```powershell
git fetch --all --prune
git checkout feature/baduk-ai-danger-coach
git status --short
git rev-parse HEAD
git log -1 --oneline
```

Verify the current HEAD includes these stale-wrapper cleanup commits:

- `797075ebf6075b24ccd1bcb928625c2f8b882513`
- `5e60cdf466762cedf7147b65f4cb75bc02230d37`

Do not reset to the Prompt 24 verification HEAD.

## 2. Automated tests — stale wrapper closure

Run from `nice-gui-1-1-7`:

```powershell
node --test tests/baduk_coach_logic.test.mjs
node --test tests/baduk_19x19_ai.test.mjs
node --test tests/baduk_board_levels.test.mjs
node --test tests/baduk_persistence.test.mjs
python -m unittest tests.test_baduk_v2_integration
python -m unittest tests.test_baduk_19x19_ai
python -m unittest tests.test_baduk_persistence_integration
python -m unittest tests.test_baduk_game
python scripts/validate_content.py
python -m unittest discover -s tests
```

Then from repo root:

```powershell
git diff --check
```

Expected closure from Prompt 24:

- `tests.test_baduk_19x19_ai`: old Node TAP text assertion (`# fail 0`) must no longer fail.
- `tests.test_baduk_game`: the two Node wrapper output-format failures must be gone.
- `tests.test_baduk_game`: the old legacy-only coach runtime expectation must be replaced by the current v2 shared-runtime contract.

If any of these four failures remain, report the exact assertion and return `FAIL`.

Do not weaken product behavior assertions. Only portable wrapper formatting / stale architecture expectations were intentionally updated.

## 3. Start isolated current-HEAD runtime

Use the same isolated approach as Prompt 24.

Recommended:

- port `8164` if free, otherwise another free port
- bind localhost only
- run current PR HEAD directly or in a temporary test container

Must report:

- exact HEAD
- exact URL
- PID/container
- served `/baduk` HTTP status
- served marker evidence for `analyzeAiDanger`, `무르기`, generation guard, `힌트`, `규칙 보기`, persistence, 19x19 strategy

Production `100.75.214.95:8081` must remain untouched.

## 4. Two-liberty caution browser fixture — required blocker

Prompt 24 verified the shared deterministic logic but did not independently close the browser caution case.

Create a deterministic browser fixture in the isolated current-HEAD page context where an AI move worsens a surviving black group from at least 3 liberties to exactly 2 liberties.

The final visible/UI path must be verified, not only the Node helper.

Required evidence:

- resulting danger level is `caution`
- the group survives; it is not reported captured
- copy indicates `숨 쉴 곳 2개`
- UI uses warning/caution treatment rather than critical/danger treatment
- no false `잡힌 돌` badge
- exactly one AI explanation/danger card is rendered for that committed AI move

Preferred approach:

1. Use a legal game position reachable in the real isolated page.
2. If deterministic setup by normal play is impractical, use browser automation to seed the same persisted game-state format already used by the product, reload the page, and then exercise the normal runtime AI path.
3. Do not modify product source solely to expose a debug fixture.
4. Do not count a raw `analyzeAiDanger()` console call alone as browser UI verification.

If a deterministic caution UI fixture cannot be produced, verdict cannot be `PASS — MERGE READY`.

## 5. Mobile 360x800 browser QA — required blocker

Prompt 24 did not verify a mobile viewport because the prior browser control lacked viewport override.

For this run, use any available real browser automation that can set viewport, including Playwright, Chrome DevTools Protocol, or a dedicated Chrome launch with device metrics/emulation.

Use exactly:

- viewport: `360x800`
- device scale factor: default or explicitly reported

Verify on isolated `/baduk`:

### Layout

- no horizontal page overflow (`scrollWidth <= clientWidth`, allowing at most 1px rounding tolerance)
- board fully visible within viewport width
- side controls stack/read correctly
- danger/coach text remains readable
- rule guide does not overflow horizontally

### Touch/click targets

Verify these are visible and usable:

- `무르기`
- `힌트`
- `규칙 보기`
- `새 게임`
- `한 수 쉬기`

### Board input

At 360x800:

- tap/click an empty legal intersection near center and confirm the intended coordinate is previewed/played
- also test an edge-near legal intersection
- no invisible overlay blocks the board
- after AI response, human can interact again

### Feature smoke

- open/close `규칙 보기`
- request `힌트`
- complete one human + AI cycle
- press `무르기`
- verify exact return to pre-human state

Capture evidence such as viewport metrics, element bounding boxes, state values, and/or screenshots in the report.

## 6. Quick regression smoke after mobile/caution

Do not repeat all Prompt 24 work unless a regression appears, but confirm:

- one normal safe AI response
- AI-thinking undo race: no delayed AI stone
- persistence after undo + reload
- 9x9/13x13/19x19 selector still works
- zero new JS console errors
- routes `/baduk`, `/baduk/`, `/games/eduni-baduk`, `/portal` remain successful on isolated server

## 7. PR/base state

Before final verdict report:

```text
base HEAD:
feature HEAD:
merge-base:
ahead_by:
behind_by:
mergeable:
```

If the base advanced during verification, sync current base into the feature branch using the repository's established clean merge/fast-forward policy, re-run affected focused tests, and report the new HEAD. Do not discard PR work.

## 8. Final report

Create:

`BADUK_AI_DANGER_UNDO_VERIFY_REPORT_FINAL25.md`

Report at minimum:

- exact verified HEAD
- stale wrapper test closure counts
- full unittest discovery count/result
- Node suite counts
- validate_content / diff-check
- isolated URL/PID
- production 8081 untouched: yes/no
- two-liberty caution UI evidence
- 360x800 viewport evidence
- quick regression evidence
- console/routes
- PR/base state
- remaining risks

Return exactly one verdict:

- `PASS — MERGE READY`
- `CONDITIONAL PASS`
- `FAIL`

`PASS — MERGE READY` requires all of the following:

1. the four stale Python wrapper failures are gone,
2. no new product test regression exists,
3. the two-liberty caution is verified through the actual browser UI/runtime path,
4. 360x800 mobile layout + controls + board input pass,
5. undo race/persistence quick smoke still passes,
6. zero new Baduk console errors,
7. the PR is current with its base or any base drift is explicitly resolved,
8. production 8081 was not modified during verification.

Do not merge automatically and do not deploy production as part of this prompt.
