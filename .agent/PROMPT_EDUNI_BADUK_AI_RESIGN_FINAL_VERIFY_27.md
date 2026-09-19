# EDUNI Baduk PR #64 — Final AI Resignation Browser Verification (Prompt 27)

This is the final targeted closeout verification after Prompt 26.

## Scope

Verify the one remaining browser item only:

- actual AI resignation after **two forced AI no-move decisions**, with a legal black continuation between them
- exact UI result: `AI 기권 — 흑 승!`

Prompt 26 already verified:

- all Python/Node suites passing
- 79→80 mass-capture warning and legal 80-stone capture
- 2-liberty caution browser fixture
- mobile 360×800
- routes / console / production isolation

Do not repeat broad QA unless this targeted fixture exposes a regression.

Do not merge automatically. Do not deploy production.

## Target

- repo: `JongPyoShin/eduni-links`
- branch: `feature/baduk-ai-danger-coach`
- PR: #64
- expected HEAD: `74205cf` or later fast-forward commit on the same branch
- base: `feature/eduni-space-mvp`

Read first:

- `/AGENTS.md`
- `/nice-gui-1-1-7/AGENTS.md`
- `BADUK_ENDGAME_MASS_CAPTURE_VERIFY_REPORT_26.md`
- `nice-gui-1-1-7/portal_app/baduk_endgame_safety.py`

Use an isolated runtime such as `127.0.0.1:8164`.

Production `100.75.214.95:8081` must remain untouched.

---

## 1. Confirm exact HEAD and clean runtime

Run:

```powershell
git fetch --all --prune
git branch --show-current
git rev-parse HEAD
git status --short
```

Must be current remote `feature/baduk-ai-danger-coach` HEAD.

Start an isolated current-HEAD runtime only.

Report URL, PID/container, and exact verified SHA.

---

## 2. Why this fixture works

Use a 9×9 checkerboard-like black position:

```js
const board = Array.from({length: 9}, (_, r) =>
  Array.from({length: 9}, (_, c) => ((r + c) % 2 === 0 ? 1 : 0))
);
```

This creates:

- 41 black stones
- 40 isolated empty intersections
- every empty point is surrounded orthogonally by black stones
- white has **zero legal coordinate moves** because entering any isolated empty point is suicide and captures nothing
- black is far ahead by territory/stone score
- black groups are small, so the conservative comeback-swing guard does not falsely preserve a huge capture comeback
- black can legally fill one of the empty intersections, after which white still has zero legal coordinate moves

This gives exactly the required sequence:

1. restore with WHITE/AI to move
2. AI finds no legal move → forced pass #1
3. BLACK/human makes one legal move
4. AI again finds no legal move → forced no-move #2
5. conservative endgame assessment should resign
6. UI must show `AI 기권 — 흑 승!`

---

## 3. Seed the browser using the real persistence path

Use the real localStorage key:

`eduni.baduk.v1`

Before loading/reloading `/baduk`, write a valid schema-v1 save payload equivalent to:

```js
const board = Array.from({length: 9}, (_, r) =>
  Array.from({length: 9}, (_, c) => ((r + c) % 2 === 0 ? 1 : 0))
);

localStorage.setItem('eduni.baduk.v1', JSON.stringify({
  version: 1,
  savedAt: Date.now(),
  levelId: 'beginner',
  boardSize: 9,
  mode: 'ai',
  board,
  currentPlayer: 2,
  previousPosition: null,
  captures: {'1': 0, '2': 0},
  moveCount: 60,
  consecutivePasses: 0,
  lastMove: null,
  gameOver: false,
  coachEnabled: false
}));
```

Then reload the isolated `/baduk` page so the normal persistence restore path is exercised.

Do not call private lexical functions directly and do not patch runtime variables manually after load.

The fixture must go through the same restore → `scheduleAi()` → no-move logic as a real saved game.

---

## 4. First forced AI no-move

After reload, wait longer than the beginner AI delay.

Required:

- AI has no legal coordinate move
- exactly one forced AI pass occurs
- game is **not** over yet
- no resignation yet
- turn returns to BLACK
- message explains AI had no legal place to play / passed
- `moveCount` increments by exactly one from the restored value
- no duplicate AI callback
- no console errors

Capture state evidence using the public engine state where available:

```js
window.EDUNIBadukEngine.getState()
```

Record at minimum:

- currentPlayer
- moveCount
- gameOver
- boardSize
- mode

---

## 5. Human legal continuation

With BLACK to move and coach OFF, click one known empty intersection, preferably `[0,1]`.

The click must be performed through the actual board UI, not by directly editing the board array.

Required:

- black stone is committed at `[0,1]`
- move count increments by one
- game remains active immediately after the black move
- AI turn is scheduled exactly once

If `[0,1]` is unexpectedly illegal, stop and report the exact engine reason; do not silently substitute a materially different fixture.

---

## 6. Second forced AI no-move → actual resignation

Wait longer than the AI delay again.

Required blocker assertions:

- AI still has zero legal coordinate moves
- this is the second forced no-move decision
- `assessAiNoMove()` path decides resignation is appropriate
- no white stone is placed
- `finishAiResignation()` path runs
- `gameOver === true`
- visible result text contains exactly:

`AI 기권 — 흑 승!`

- message explains AI is sufficiently behind and cannot reasonably overturn the game
- no extra pass is recorded after resignation
- no third AI timer/callback occurs after waiting another full AI delay
- board remains unchanged after resignation
- no danger card or stale coach card appears
- zero new console errors

Also verify that the resignation is **not** produced by two consecutive normal passes / `finishByScore()`.

Evidence must distinguish:

- `finishAiResignation()` result
from
- normal two-pass score finish.

---

## 7. Conservative non-resignation sanity check

Do one quick confirmation using the already-established Prompt 26 79-stone comeback fixture or equivalent evidence:

- when a massive capture comeback remains possible, the AI must **not** resign just because it had a forced no-move

You may cite/reuse Prompt 26 browser evidence if the code SHA for endgame logic is unchanged since that verification. If endgame product code changed after Prompt 26, rerun the non-resignation fixture.

---

## 8. Minimal automated regression

Run only the relevant suites plus a strict full Python discovery once:

```powershell
cd nice-gui-1-1-7
python -m unittest tests.test_baduk_endgame_safety
python -m unittest discover -s tests
node --test tests/baduk_coach_logic.test.mjs
python scripts/validate_content.py
cd ..
git diff --check
```

All product tests must pass.

---

## 9. Final report

Create:

`BADUK_AI_RESIGN_FINAL_VERIFY_REPORT_27.md`

Report:

- exact verified HEAD
- isolated URL and PID/container
- production 8081 untouched: yes/no
- seeded checkerboard fixture summary
- first no-move/pass evidence
- black `[0,1]` continuation evidence
- second no-move resignation evidence
- visible `AI 기권 — 흑 승!` evidence
- proof this was resignation, not ordinary two-pass scoring
- no stale timer evidence
- non-resignation sanity check for comeback case
- test counts
- console errors
- final verdict

Return exactly one verdict:

- `PASS — MERGE READY`
- `FAIL`

`PASS — MERGE READY` requires the actual browser resignation fixture above to succeed on the isolated current-HEAD runtime and all relevant automated tests to pass.

Do not merge and do not deploy production as part of this verification.
