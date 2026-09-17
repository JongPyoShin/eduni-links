# EDUNI Baduk — AI Move Danger Coach (Prompt 17)

## Branch / base

Create and work only on a dedicated feature branch:

`feature/baduk-ai-danger-coach`

Base branch:

`feature/eduni-space-mvp`

Expected base at task start is `e13fd246a26e21d8dfed3aaee481b07513a3e3e8` or a later fast-forward of the same branch. Fetch first and report the actual base SHA before editing.

Do **not** merge automatically. Do **not** deploy/rebuild the live Docker service during feature development.

## 0. Read first

Read and obey:

- `/AGENTS.md`
- `/nice-gui-1-1-7/AGENTS.md`

Inspect the current Baduk v2 runtime and tests before editing:

- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk_v2.html`
- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk_coach_logic.js`
- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk_coach.js`
- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk_ai_strategy.js`
- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk_persistence.js`
- `nice-gui-1-1-7/portal_app/baduk_v2_integration.py`
- `nice-gui-1-1-7/portal_app/baduk.py`
- existing Baduk Node/Python tests

Current baseline that must remain intact:

- 9x9 / 13x13 / 19x19 levels
- AI / local two-player modes
- beginner coach move preview
- AI move explanation
- local-player factual explanation
- 19x19 global-opening strategy
- simple ko / capture / suicide rules
- localStorage save/resume
- exactly-once restored AI response

## 1. Goal

Improve the beginner coach so that **immediately after the AI plays a move**, the child can understand two things:

1. **Why did the AI play there?**
2. **Did that AI move make my black stones dangerous? If so, why?**

The explanation must be substantially easier than traditional Baduk commentary. The primary audience is a young beginner.

This is not a stronger-AI project. Do not change move selection weights unless a concrete correctness issue is discovered.

## 2. Child-friendly language contract

Primary explanations should use short, concrete Korean sentences.

Prefer:

- `숨 쉴 곳` and introduce the term once as `숨 쉴 곳(활로)` when useful
- `내 돌`
- `AI 돌`
- `잡힐 수 있어요`
- `이어져요`
- `길이 좁아졌어요`

Avoid using unexplained terms as the main explanation:

- 단수
- 자충
- 축
- 장문
- 세력
- 두터움
- 수상전
- 맥

Technical terms may appear only as a small optional badge/secondary hint after the easy explanation, for example `단수(숨 쉴 곳 1개)`.

Never make an inevitable claim when it is only a risk. Say `잡힐 수 있어요`, not `잡혀요`, unless stones were actually captured by the AI move.

Keep the main danger explanation to about 1-2 short sentences.

## 3. AI-move card UX

When coach is ON and the AI completes a legal move, show one non-blocking coach card with two clearly separated parts:

### A. `AI는 왜 여기 뒀을까?`

Explain the strongest real reason for the AI move using simpler copy than the current `strongestAiReason` strings.

Examples:

- capture: `내 돌 2개를 바로 잡을 수 있는 자리였어요.`
- atari/threat: `내 돌의 숨 쉴 곳을 줄여서 잡기 쉽게 만드는 자리였어요.`
- connection: `AI 돌과 이어지기 좋은 자리였어요.`
- opening/spread: `초반이라 넓은 곳을 먼저 차지하려고 했어요.`
- liberties: `AI 돌이 답답하지 않게 숨 쉴 곳을 만들 수 있는 자리였어요.`
- center/fallback: `여러 방향으로 움직이기 쉬운 자리였어요.`

Do not use random jitter as an explanation.

### B. `내 돌은 지금 괜찮을까?`

Analyze the board transition caused by that exact AI move and show one status:

- critical / captured
- danger / 1 liberty
- caution / reduced to 2 liberties
- safe / no material new danger

The danger status must be based on actual board state, not on AI-score labels.

The card must not block the next move and must not require a confirmation click.

Coach OFF must continue to suppress coach explanations; respect the existing toggle.

## 4. Danger analysis — deterministic shared logic

Implement the analysis in the existing shared coach logic (`eduni_baduk_coach_logic.js`) or a very small adjacent shared helper used by both runtime and tests.

Prefer adding a deterministic function such as:

`analyzeAiDanger(beforeBoard, afterBoard, aiMove)`

Return a structured result, for example:

```js
{
  level: 'critical' | 'danger' | 'caution' | 'safe',
  title: '...',
  summary: '...',
  affectedStones: [[r,c], ...],
  libertyPoints: [[r,c], ...],
  capturedCount: 0,
  beforeLiberties: null,
  afterLiberties: null,
  reasonCode: 'captured' | 'new_atari' | 'liberties_reduced' | 'safe'
}
```

Exact shape may differ, but it must be structured and unit-testable.

### 4.1 Critical: AI captured black stones

Detect black stones present in `beforeBoard` and removed in `afterBoard` because of the AI move.

Example copy:

- title: `🚨 내 돌이 잡혔어요`
- summary: `AI가 이곳에 두면서 내 돌 2개가 숨 쉴 곳이 없어져 잡혔어요.`

Show the exact count.

### 4.2 Danger: a black group was newly reduced to 1 liberty

This is the main danger alert.

Only attribute the danger to the AI move when the affected surviving black group materially worsened because of that board transition. Do not blame an unrelated AI move for a group that was already equally endangered elsewhere.

Example copy:

- title: `🚨 이 돌이 위험해요`
- summary: `이 돌들은 숨 쉴 곳이 1개만 남았어요. AI가 그곳까지 막으면 잡힐 수 있어요.`

If appropriate, secondary badge:

`단수 · 숨 쉴 곳 1개`

### 4.3 Caution: liberties reduced to 2

Use a softer alert when an affected group had more breathing room before the AI move and now has exactly two liberties.

Example:

- title: `⚠️ 이쪽을 조심해요`
- summary: `AI가 가까이 와서 이 돌들의 숨 쉴 곳이 2개로 줄었어요.`

Do not emit caution for every naturally two-liberty group on the board. It should be tied to the just-played AI move / worsened transition.

### 4.4 Safe

If the AI move did not materially worsen the user's stones:

- title: `🙂 지금은 크게 위험하지 않아요`
- summary: `이번 AI 수로 바로 잡힐 위험은 커지지 않았어요.`

Keep this compact so the card does not feel noisy.

## 5. Group matching across before/after boards

Be careful when comparing groups because an AI move may capture stones or change group shape.

Use stable board facts rather than object identity. A reasonable approach is to compare surviving black groups by overlapping stone coordinates from before/after.

Requirements:

- captured stones counted exactly once
- surviving group liberties are measured from `afterBoard`
- previous liberty count comes from the corresponding group in `beforeBoard`
- merged/split edge cases must not throw
- analysis must not mutate either board
- same input must produce same danger result

Do not introduce Monte Carlo search or multi-ply tactical reading for this feature.

## 6. Visual danger markers

Reuse the existing coach overlay where possible.

When the AI danger result is `critical`, `danger`, or `caution`:

- visually mark affected black stones
- critical/danger: red ring or similarly obvious marker
- caution: orange marker
- if a dangerous group has one or two liberty points, show those breathing points with the existing green-dot vocabulary or another consistent marker

Do not cover stones with large labels.

The board must remain playable immediately.

On 19x19, markers must remain readable and not overwhelm the board.

## 7. Simplify existing AI-reason text

Update `strongestAiReason` copy to be easier while preserving its factual basis.

Rules:

- capture reason uses actual captured count
- atari reason describes `숨 쉴 곳` rather than relying on the word `단수`
- spread/opening can be combined into very simple opening language if that is clearer
- neighbors = connection/pressure in simple wording
- liberties = AI's breathing room
- jitter remains excluded

Do not change scoring merely to fit copy.

## 8. Runtime/test alignment — mandatory

The exact shared danger-analysis logic tested by Node tests must be the logic used by the served `/baduk` runtime.

Do not repeat the Bubble Shooter mistake of creating a test-only helper while the page executes separate inline logic.

Verify that `baduk.py` + `baduk_v2_integration.py` serve/inject the same coach logic asset containing the new analysis.

If integration markers drift, fail safe: serve the working Baduk game without a half-applied danger UI rather than partially patching runtime state.

## 9. State / race safety

Danger explanation is post-AI informational UI only.

It must not:

- schedule another AI move
- mutate currentPlayer
- mutate board
- change captures or moveCount
- alter ko state
- save a different game state
- interfere with persistence restore
- generate duplicate cards from one AI move

If an old delayed AI callback is invalidated by reset/new game, no stale danger card should appear afterward.

If a saved game is restored on the human turn, do **not** invent/reconstruct an old danger explanation unless the exact before/after transition is available. Normal play after the next AI move must work.

## 10. Local two-player mode

Do not show an `AI danger` card in local mode.

Preserve the existing local factual move explanation.

No AI should run in local mode.

## 11. Pass / game-over behavior

If AI passes instead of playing a coordinate move:

- do not run coordinate danger analysis
- no fake danger alert
- existing pass flow remains correct

If the AI move captures the final relevant stones or the game ends, the danger/explanation UI must not break final scoring/game-over UI.

## 12. Automated tests — required

Extend the shared coach logic tests and integration tests.

### Node tests

At minimum add deterministic cases for:

1. AI captures one black stone => `critical`, count 1
2. AI captures a multi-stone group => correct exact count
3. black group changes from 2+ liberties to 1 => `danger`
4. already-dangerous unrelated group is not falsely attributed to a remote AI move
5. black group changes from 3+ liberties to 2 => `caution`
6. unaffected board area => `safe`
7. affected stone coordinates are correct
8. danger liberty points are correct
9. input boards remain unchanged
10. simplified capture reason uses real count
11. simplified atari reason uses child-friendly `숨 쉴 곳` wording
12. jitter never becomes explanation reason
13. 9x9 case
14. 13x13 case
15. 19x19 case

### Python/integration tests

Verify at minimum:

- served v2 contains the same updated shared coach logic
- AI post-move runtime calls the danger path exactly once per AI coordinate move
- local mode does not call AI danger flow
- pass path does not fabricate coordinate danger analysis
- existing persistence injection remains present
- 19x19 strategy remains present
- no fallback to legacy `eduni_baduk.html`

Avoid tests that only assert a helper file exists.

## 13. Regression suite

Run focused tests first, then the existing Baduk regression suite.

Expected commands include:

```bash
cd nice-gui-1-1-7
node --test tests/baduk_coach_logic.test.mjs
node --test tests/baduk_19x19_ai.test.mjs
node --test tests/baduk_board_levels.test.mjs
node --test tests/baduk_persistence.test.mjs
python -m unittest tests.test_baduk_v2_integration
python -m unittest tests.test_baduk_19x19_ai
python -m unittest tests.test_baduk_persistence_integration
python -m unittest tests.test_baduk_game
python scripts/validate_content.py
cd ..
git diff --check
```

Also run the relevant full test discovery once before final commit. Report any pre-existing Windows `cp949` or stale assertion separately; do not hide failures.

## 14. Browser QA — required

Use the actual served `/baduk` page.

### AI mode 9x9

- make a human move
- wait for exactly one AI move
- card appears once
- card has `AI는 왜 여기 뒀을까?`
- card has `내 돌은 지금 괜찮을까?`
- explanation is understandable without knowing the word `단수`
- next human move remains immediately playable

### Danger fixture / reproducible state

Use legal play or a controlled test fixture to produce:

- capture by AI
- newly one-liberty black group
- caution two-liberty reduction
- safe AI move

Verify copy and overlay for each. Do not mark these PASS by source inspection alone.

### Other levels

- 13x13 AI move => no error, explanation works
- 19x19 AI move => no error, explanation works and existing global strategy still behaves

### Local mode

- no AI danger card
- zero AI moves
- local explanation still works

### Persistence

- play until human turn after an AI move
- reload
- state restores
- no duplicate/stale old danger card is fabricated
- make another human move and confirm the next real AI move produces exactly one fresh explanation

### Reset race

- trigger/schedule AI if possible
- reset/new game before old callback completes
- no stale AI move or stale danger card appears in the new game

### Mobile

At 360x800:

- board remains usable
- danger card is readable
- no horizontal overflow
- danger markers align with correct intersections

## 15. Recommended UI wording

Use this spirit, not necessarily byte-for-byte text:

Normal safe move:

- `🤖 AI는 왜 여기 뒀을까?`
- `초반이라 넓은 곳을 먼저 차지하려고 했어요.`
- `🙂 내 돌은 지금 괜찮을까?`
- `이번 AI 수로 바로 잡힐 위험은 커지지 않았어요.`

New one-liberty danger:

- `🤖 AI는 왜 여기 뒀을까?`
- `내 돌의 숨 쉴 곳을 줄이려고 이곳에 뒀어요.`
- `🚨 이 돌이 위험해요`
- `숨 쉴 곳이 1개만 남았어요. AI가 그곳까지 막으면 잡힐 수 있어요.`

Capture:

- `🚨 내 돌이 잡혔어요`
- `AI가 이곳에 두면서 내 돌 2개가 숨 쉴 곳이 없어져 잡혔어요.`

Avoid scary or punitive language. This is an educational warning, not an error alarm.

## 16. Files / scope

Prefer changes limited to:

- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk_coach_logic.js`
- `nice-gui-1-1-7/portal_app/static_games/eduni_baduk_coach.js`
- `nice-gui-1-1-7/portal_app/baduk_v2_integration.py` only if runtime hook changes are needed
- focused Baduk tests

Do not modify Bubble Shooter, Facto, Jungle, Space, Hanja, Omok, deployment scripts, Android app, or unrelated portal pages.

## 17. Deliverables

Create:

`BADUK_AI_DANGER_COACH_REPORT.md`

Report:

- branch / base SHA / implementation SHA
- changed files
- danger categories and exact detection contract
- simplified AI explanation examples
- Node test counts
- Python test counts
- browser QA by 9/13/19/local/mobile/persistence/reset
- console errors
- known limitations
- remaining risks
- recommendation: `MERGE READY` or `DO NOT MERGE`

Open a **Draft PR**:

- head: `feature/baduk-ai-danger-coach`
- base: `feature/eduni-space-mvp`
- suggested title: `WIP: add beginner AI danger explanations to Baduk`

Do not merge automatically.

## Acceptance criteria

PASS only if:

- every coordinate AI move gets at most one explanation
- AI reason is simpler and factual
- newly captured black stones produce exact captured-count alert
- newly endangered one-liberty group produces clear danger alert
- two-liberty worsening produces caution, not false critical alarm
- unrelated existing danger is not falsely blamed on the AI move
- safe moves do not produce scary warnings
- overlay points to the actual affected stones/liberties
- runtime uses the same shared logic as tests
- local mode remains AI-free
- 9x9 / 13x13 / 19x19 remain functional
- save/resume and reset races remain safe
- no new console/runtime errors
- no unrelated code changes

If a required item was not executed, report `NOT VERIFIED`, not PASS.