# Baduk AI resignation final verification

### VERDICT

`PASS — MERGE READY`

The remaining Prompt 27 item passed in a real headed Chrome session: after two
forced AI no-move decisions with a legal black continuation between them, the
AI resigned exactly once and the UI showed `AI 기권 — 흑 승!`.

### HEAD / ISOLATION

- branch: `feature/baduk-ai-danger-coach`
- verified SHA: `35bb34a288b79f4069c1d453b540b2d78c0da429`
- checkout: `D:\Codex\Worktrees\baduk-pr64-verify`
- isolated runtime: `http://127.0.0.1:8164/baduk`, PID `4540`, `python app.py`
- headed browser: Chrome with DevTools Protocol on port `9222`
- production `100.75.214.95:8081`: **untouched**; no production restart/deploy

### CHECKERBOARD FIXTURE

Seeded the real `eduni.baduk.v1` localStorage persistence key with the Prompt
27 9×9 checkerboard: 41 black stones, 40 isolated empty intersections,
`currentPlayer=WHITE`, `moveCount=60`, and no captures. Every white coordinate
move is suicide while black has a legal continuation at `[0,1]`.

1. After restore, the first AI delay produced exactly one forced pass:
   `moveCount=61`, `consecutivePasses=1`, `currentPlayer=BLACK`,
   `gameOver=false`, no result card, and the visible no-move warning.
2. A real headed-Chrome pointer click on board coordinate `[0,1]` committed a
   black stone: `moveCount=62`, `currentPlayer=WHITE`, `aiThinking=true`,
   `gameOver=false`. No direct board mutation was used.
3. After the second AI delay, the board still contained no white stone and the
   state was `moveCount=62`, `gameOver=true`, `aiThinking=false`.
   The visible result was exactly `AI 기권 — 흑 승!`; the accompanying message
   explained that the AI was about 75 points behind and could not recover.
4. An additional 900ms wait left the state, result, and move count unchanged:
   no third callback, extra pass, duplicate result, or stale coach card.

The browser page was `http://127.0.0.1:8164/baduk`, contained no old
`9×9 입문 바둑` text, and had no visible error card. The server returned HTTP
200 with the required endgame markers (`aiForcedPasses`, `assessAiNoMove`,
`finishAiResignation`, and `AI 기권 — 흑 승!`).

### NON-RESIGNATION REGRESSION

Prompt 26's unchanged 79-stone browser fixture remains the complementary
check: one forced AI pass, then a legal black continuation and an 80-stone
capture, with no resignation or duplicate AI callback. The endgame source was
unchanged after that evidence; Prompt 27 adds only the targeted fixture proof.

### TESTS

- `python -m unittest tests.test_baduk_endgame_safety`: 9/9 passed
- `PYTHONUTF8=1 python -m unittest discover -s tests`: 126/126 passed
- `node --test tests/baduk_coach_logic.test.mjs`: 21/21 passed
- `python scripts/validate_content.py`: passed
- `git diff --check`: passed

The first full-suite invocation under the Windows cp949 default hit three
test-harness UTF-8 decode errors while reading Node output; rerunning with
`PYTHONUTF8=1` passed all 126 tests. This was an environment encoding issue,
not a product/test assertion failure.

### REMAINING RISKS

No Prompt 27 blocker remains. This verification does not merge or deploy; the
production service was intentionally left unchanged.
