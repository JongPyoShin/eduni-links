# Baduk endgame / forced-pass / mass-capture verification

### VERDICT

`CONDITIONAL PASS`

All automated suites and the critical 79→80 browser reproduction passed. The remaining unverified item is the separate browser fixture proving conservative AI resignation after two forced no-move decisions.

### HEAD / SERVER

- verified branch: `feature/baduk-ai-danger-coach`
- verified SHA: `982abd2d825bbec9dad8f509f62217b1cd662d8c`
- checkout: `D:\Codex\Worktrees\baduk-pr64-verify`
- isolated runtime: `http://127.0.0.1:8164/baduk`, PID `3332`, `python app.py`, `PORT=8164`
- production `100.75.214.95:8081`: **untouched**; no production container/service restart.

### SERVED-RUNTIME

Isolated `/baduk` returned HTTP 200 with 63,742 bytes and contained all required current features:

- `aiForcedPasses`
- `assessAiNoMove`
- `finishAiResignation`
- `AI 기권 — 흑 승!`
- `largeSelfAtariRisk`
- `ownGroupSizeAfter`
- `내 집은 끝까지 메우지 않아도 돼요`
- `그래도 두려면 설명을 보고 '여기에 두기'`
- existing danger/undo/hint/rules/persistence/19x19 markers

### AUTOMATED-TESTS

- `test_baduk_endgame_safety`: 9/9 passed
- `test_baduk_v2_integration`: 14/14 passed
- `test_baduk_19x19_ai`: 4/4 passed
- `test_baduk_persistence_integration`: 7/7 passed
- `test_baduk_game`: 8/8 passed
- Node coach logic: 21/21 passed
- Node 19x19 AI: 6/6 passed
- Node board levels: 5/5 passed
- Node persistence: 14/14 passed
- full unittest discovery: 126/126 passed
- `validate_content.py`: passed
- `git diff --check`: passed

### 79→80 MASS-CAPTURE FIXTURE

Seeded a valid 9x9 persistence state with 79 black stones, two separated liberties (`[0,0]`, `[8,8]`), and `currentPlayer=WHITE`.

1. On restore, AI had no legal coordinate move and made exactly one forced pass.
2. The message warned that the 79-stone group had only two breathing spaces and that continuing to fill them could cause a mass capture.
3. AI returned to the black/human turn and did **not** resign.
4. With coach OFF, tapping `[0,0]` did not commit the move. It showed `🚨 큰 돌무리가 위험해요`, exact group size `80`, one remaining breathing space, and required `여기에 두기` confirmation.
5. Cancel restored the board to 79 black stones and unchanged move count.
6. After explicit confirmation, black became 80 stones; AI played the final legal corner and legally captured all 80 stones.
7. The UI reported `백이 80개를 잡았어요!`; no freeze or duplicate AI move occurred.

### 2-LIBERTY CAUTION

Used a deterministic browser fixture searched through the shared engine. The isolated headed browser showed:

- `⚠️ 이쪽을 조심해요`
- `AI가 가까이 와서 이 돌들의 숨 쉴 곳이 2개로 줄었어요.`
- `숨 쉴 곳 2개`
- affected stone/liberty overlay data

The source board and AI transition were unchanged outside the intended move.

### RULE GUIDE

`규칙 보기` showed the new lesson:

- `내 집은 끝까지 메우지 않아도 돼요`
- filling a safe area can reduce breathing spaces
- `둘 곳이 없으면 한 수 쉬기를 눌러도 돼요`

Opening the guide left move count unchanged.

### MOBILE 360x800

Using headed Chrome DevTools viewport emulation at exactly `360x800`:

- `scrollWidth=345`, `clientWidth=345` (no horizontal overflow)
- board rect fit inside viewport (`311x311`)
- `무르기`, `힌트`, `규칙 보기` visible
- normal human+AI cycle completed (`moveCount=2`)
- undo restored `moveCount=0`, black turn
- rules text remained readable in the viewport

### QUICK REGRESSION / ROUTES

- 9x9/13x13/19x19 switching, safe AI, undo race, and persistence remain covered by Prompt 24 evidence and current passing suites.
- `/baduk`, `/baduk/`, `/games/eduni-baduk`, `/portal`: HTTP 200 on isolated runtime.
- server stderr contained no runtime errors; no new browser console errors were observed during the isolated headed run.

### AI RESIGNATION CASE

`NOT VERIFIED`: a separate valid fixture satisfying no legal white move, large black score deficit, late board, no comeback swing, and a legal black continuation between two forced AI-pass decisions was not constructed. The 79→80 comeback fixture correctly demonstrated non-resignation.

### REMAINING-RISKS

- Complete the dedicated AI resignation browser fixture before claiming strict `PASS — MERGE READY`.
- Production 8081 remains on its existing deployment and was intentionally not updated by this verification.
