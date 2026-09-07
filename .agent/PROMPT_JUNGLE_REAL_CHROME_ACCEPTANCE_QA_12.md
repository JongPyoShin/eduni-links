# PROMPT_JUNGLE_REAL_CHROME_ACCEPTANCE_QA_12

## Mission
지금까지 구현한 정글 어드벤처가 **코드/단위테스트상 맞는 것**이 아니라, 실제 사용자가 Chrome에서 처음 실행해 끝까지 플레이했을 때 의도대로 동작하고 기대 결과가 나오는지 검증한다.

이번 작업의 목적은 새 기능 추가가 아니다.

**실제 Chrome/Chromium headed 브라우저를 띄운 상태에서 화면을 보며 Hub → Camp → Waterfall → Cave → Giant Tree → Sky Ridge → 배지 5/5 → 정글 탐험 완주까지 플레이하고, 기능/UX/화면/입력/오류/저장 상태를 Acceptance QA 한다.**

문제를 발견하면 최소 수정 후 동일 케이스를 다시 실제 브라우저에서 재검증한다.

---

## Branch
`prototype/jungle-web-canvas-poc`

작업 시작 전:

```bash
git fetch origin prototype/jungle-web-canvas-poc
git status
git log -1 --oneline origin/prototype/jungle-web-canvas-poc
```

현재 알려진 기준선은 `4badd96`이며, 작업 시점에 원격 HEAD가 더 최신이면 **최신 원격을 기준으로 한다.**

로컬의 다른 변경은 보존한다. `git reset --hard`, `git clean -fd`, force push 금지.

---

# 0. 가장 중요한 조건 — REAL CHROME / HEADED

이번 QA는 기존 headless E2E 반복이 아니다.

## 필수
- 실제 Chrome 또는 Chromium을 **headed mode (`headless: false`)** 로 실행한다.
- 가능하면 설치된 Google Chrome을 사용한다 (`channel: "chrome"`).
- Chrome이 없으면 Chromium headed mode 허용.
- 브라우저 창에서 실제 화면이 렌더링되는 상태로 테스트한다.
- 키보드/마우스/터치 입력을 실제 DOM/UI에 전달한다.

## 금지
- headed 실행이 불가능한데 headless 결과만으로 PASS 처리
- 기존 E2E REPORT를 재사용하여 실행한 것처럼 작성
- screenshot만 생성하고 실제 플레이를 생략

### headed 실행 자체가 불가능한 환경이면
`BLOCKED — headed Chrome display unavailable` 로 명확히 보고하고 PASS라고 쓰지 않는다.

---

# 1. REAL USER INPUT ONLY

허용:
- 실제 키보드: Arrow/WASD, A/Enter/Space, B/Escape
- 실제 mouse click
- 실제 touch/tap (Playwright touch emulation 포함)
- Hub의 실제 `<a>` 링크 click
- 실제 D-pad/A/B 버튼 tap/click
- 화면에 표시된 quiz choice click/키보드 선택
- DOM text/visibility 읽기
- 공개 read-only `getState()`/player 좌표 읽기 (보조 evidence 전용)
- localStorage 읽기 (persistence evidence 전용)

절대 금지:
- player 좌표 직접 대입 / teleport
- progression/state 값 write/injection
- reward/codex/stage flag 강제 변경
- localStorage/sessionStorage write/injection
- DOM style/display/visibility 강제 변경
- test-only progression helper 호출
- 내부 `complete*`, `advance*`, `unlock*`, `capture*`, `finish*` 직접 호출
- 정답 key/state를 읽어 자동 정답 주입
- 잠긴 stage URL 직접 입력하여 우회

`evaluate()`는 **읽기 전용 관찰**에만 사용한다.

---

# 2. 테스트 환경

## Run A — Desktop Chrome Acceptance (필수)
- headed Chrome/Chromium
- viewport: 1280×800
- fresh browser context / fresh storage
- Hub에서 시작
- keyboard + mouse 혼합 사용
- 5 stages 완주

## Run B — Tablet Touch Acceptance (필수)
- headed Chrome/Chromium
- viewport: 800×1280 또는 1024×768
- `hasTouch: true`
- D-pad + A/B + touch choice tap 중심
- 최소 Camp + Waterfall + Sky Ridge 실제 플레이
- portrait/landscape 중 한 번 resize/orientation 변경

## Run C — Negative/Recovery Acceptance (필수)
- fresh context
- 오답, modal close/reopen, 빠른 A 연타, reload, 이미 완료한 stage 재진입 등 회복 시나리오 검증

---

# 3. 공통 Acceptance 기준

모든 stage에서 다음을 눈으로 확인하고 evidence를 남긴다.

1. Canvas/scene가 빈 화면이 아니다.
2. 플레이어가 실제 입력에 반응한다.
3. 이동 가능 경로와 collision이 일치한다.
4. 목표/interaction cue가 적절한 거리에서 보인다.
5. A 입력 후 panel/modal이 자연스럽게 열린다.
6. 문제/선택지/설명이 잘리지 않고 읽힌다.
7. 선택지 4개가 정상 표시된다 (해당 quiz가 4-choice인 경우).
8. 정답/오답 feedback이 실제 선택에 맞게 나온다.
9. B/Escape로 닫을 수 있는 panel은 정상 닫힌다.
10. panel 종료 후 이동/입력이 다시 정상 작동한다.
11. reward는 조건 충족 전 미리 지급되지 않는다.
12. reward 완료 후 Hub badge가 정확히 1개 증가한다.
13. 동일 reward가 중복 지급되지 않는다.
14. pageerror / 신규 console.error가 없다.
15. 입력 먹통, modal stuck, route dead-end, blank canvas가 없다.
16. 주요 버튼/문구가 D-pad/A/B와 겹치지 않는다.
17. 사용자가 다음에 무엇을 해야 하는지 최소한의 cue로 이해 가능하다.

---

# 4. 상세 Test Cases + Expected Results

## A. Hub / Progression

### TC-HUB-001 — Fresh start
**Steps**
1. fresh context로 `jungle-hub.html` 진입.
2. Hub 화면을 눈으로 확인.
3. progress text와 각 stage card 상태 확인.

**Expected**
- Hub가 정상 렌더링된다.
- 배지 진행률은 `0 / 5` 상태다.
- Camp는 시작 가능하다.
- 이후 stage는 현재 progression 규칙에 따라 잠겨 있으며 직접 진행 우회가 없어야 한다.
- console/page error 0.

### TC-HUB-002 — Progressive unlock
각 stage 완료 후 Hub로 돌아와 reload한다.

**Expected**
- 완료한 stage badge가 정확히 1개 추가된다.
- 다음 stage가 정상 unlock된다.
- 이전 badge가 사라지지 않는다.
- 순서: Camp → Waterfall → Cave → Giant Tree → Sky Ridge.

### TC-HUB-003 — Final completion
Sky Ridge 완료 후 Hub 복귀 + reload.

**Expected**
- badge IDs:
  - `bluebird-feather`
  - `kingfisher-drop`
  - `firefly-crystal`
  - `ancient-seed`
  - `sky-star`
- UI: `배지 5 / 5 · 정글 탐험 완주!`
- 5개 badge 모두 earned 표시.

---

## B. Camp Acceptance

### TC-CAMP-001 — Quest start
**Steps**
1. Hub에서 Camp 클릭.
2. 실제 이동으로 hut 접근.
3. A/Enter로 상호작용.

**Expected**
- quest가 자연스럽게 시작된다.
- objective/cue가 다음 탐험 지점을 안내한다.
- 입력 후 플레이어가 stuck되지 않는다.

### TC-CAMP-002 — 3 clue/quiz flow
**Steps**
1. feather 접근 → 문제 풀이.
2. footprints 접근 → 문제 풀이.
3. birdcall 접근 → 문제 풀이.

**Expected**
- 순서가 깨지지 않는다.
- 각 문제 panel이 화면 안에 들어온다.
- 선택지/feedback이 읽힌다.
- quiz 완료 수/score가 정상 누적된다.
- 같은 interaction이 의도치 않게 두 번 완료되지 않는다.

### TC-CAMP-003 — Bluebird success
3문제 중 최소 PASS threshold를 만족한 뒤 Bluebird encounter 진행.

**Expected**
- Bluebird 발견/포획 flow가 나타난다.
- reward panel이 자연스럽게 나타난다.
- `bluebird-feather` 지급.
- Hub 복귀 후 badge 1/5.

### TC-CAMP-004 — Camp fail path
fresh context에서 의도적으로 3문제를 오답 처리한다.

**Expected**
- game crash 없음.
- Bluebird/reward가 성공한 것처럼 지급되지 않는다.
- 사용자에게 실패/재시도 의미가 이해 가능하다.
- 다시 플레이하거나 재관찰할 수 있다.

---

## C. Waterfall Acceptance

### TC-WF-001 — Exploration gates
**Steps**
streamGate → steppingStones 순서로 실제 이동/상호작용.

**Expected**
- 이전 단계 완료 전 다음 핵심 단계가 잘못 완료되지 않는다.
- stepping stones 주변 이동이 시각 경로와 collision상 자연스럽다.

### TC-WF-002 — 3 clue quizzes
**Steps**
`echo → mistTrail → waterDrops` 실제 이동 후 각각 문제 풀이.

**Expected**
- 각 clue가 1회 정상 완료.
- panel/feedback 정상.
- 문제 문구에 깨진 한글/중국어/영문 artifact 없음.
- quiz 완료 후 다음 cue로 자연스럽게 이어진다.

### TC-WF-003 — Kingfisher + reward reveal regression
**Steps**
1. lookout 완료.
2. Kingfisher encounter.
3. reward reveal을 기다린다.
4. confirm이 자연스럽게 보인 뒤 실제 A/Enter 입력.

**Expected**
- reveal을 DOM 강제 없이 자연스럽게 기다려야 한다.
- `rewardComplete:true`.
- `kingfisher-drop` 지급.
- panel 닫힌 뒤 입력 정상.

### TC-WF-004 — Rapid A regression
reward/close 타이밍에서 A를 3~5회 빠르게 입력한다.

**Expected**
- crash/pageerror 없음.
- completed quiz가 재활성화되지 않는다.
- null explanation 오류 없음.
- reward 중복 지급 없음.

---

## D. Cave Acceptance

### TC-CAVE-001 — Full 8-step flow
실제 이동/입력으로:

```text
caveGate
→ glowTrail
→ echoCrystal
→ shadowMark
→ fireflyPattern (3 rounds)
→ crystalBridge
→ bat
→ reward
```

**Expected**
- 단계가 정확히 이 순서로 진행된다.
- 첫 30초 안에 최소 1 interaction 가능.
- fireflyPattern 3 round 모두 UI로 진행.
- Bat 발견 후 `firefly-crystal` 지급.
- Hub badge 3/5 (Camp+Waterfall+Cave 기준).

### TC-CAVE-002 — Retry/re-observation
한 interaction panel을 B/Escape로 닫고 다시 접근/열기.

**Expected**
- state 손상 없음.
- 재관찰 가능.
- 완료 단계가 중복 완료/중복 reward되지 않는다.

---

## E. Giant Tree Acceptance

### TC-TREE-001 — Full 8-step flow
실제 이동/입력으로:

```text
rootGate
→ barkPattern
→ seedTrail
→ hollowEcho
→ treeRing (3 rounds)
→ canopyStairs
→ squirrel
→ reward
```

**Expected**
- 모든 단계가 순차 진행.
- treeRing 3 rounds 정상 표시/선택/feedback.
- path/corridor에서 막힘 없음.
- Squirrel 발견 후 `ancient-seed` 지급.
- Hub badge 4/5.

### TC-TREE-002 — Route recovery
경로 가장자리/벽 쪽으로 일부러 이동 후 다시 목표로 복귀한다.

**Expected**
- collision 때문에 영구 stuck되지 않는다.
- 시각적으로 갈 수 있어 보이는 길과 실제 이동 가능 길이 크게 어긋나지 않는다.

---

## F. Sky Ridge Acceptance

### TC-SKY-001 — Corridor navigation regression
실제 방향키로 axis-aligned corridor를 따라 이동한다.

```text
skyGate
→ windRibbon
→ cloudShadow
→ windChime
→ summitBridge
→ hawk
→ reward
```

**Expected**
- diagonal shortcut 없이도 정상 완주 가능.
- corridor/bridge에서 dead-end 없음.
- 카메라/scene가 플레이어를 놓치지 않는다.

### TC-SKY-002 — 3 clue quizzes
windRibbon / cloudShadow / windChime 문제를 실제 UI로 풀이.

**Expected**
- 각 quiz panel 정상.
- score 누적 정상.
- 3개 clue completion 후 summitBridge/hawk로 진행.

### TC-SKY-003 — Hawk two-step confirmation
Hawk encounter 후 reward 확인까지 실제 A 입력으로 처리.

**Expected**
- encounter와 reward confirm이 중복/스킵되지 않는다.
- `sky-star` 지급.
- Hub에서 5/5 + 완주 문구 확인.

---

## G. Persistence / Re-entry

### TC-PERSIST-001 — Mid-game reload
Waterfall 완료 후 Hub에서 reload.

**Expected**
- 2/5 badge 유지.
- Cave unlock 유지.
- Camp/Waterfall reward 중복/소실 없음.

### TC-PERSIST-002 — Final reload
5개 stage 완료 후 Hub reload 2회.

**Expected**
- 5/5 유지.
- `정글 탐험 완주!` 유지.
- badge IDs 변하지 않음.

### TC-PERSIST-003 — Completed stage re-entry
완료한 Camp 또는 Waterfall에 다시 진입해 일부 interaction 시도 후 Hub 복귀.

**Expected**
- 이미 획득한 reward가 중복 추가되지 않는다.
- progress가 6/5 같은 비정상 상태가 되지 않는다.
- 기존 완료 상태가 깨지지 않는다.

---

## H. Input / UI Acceptance

### TC-INPUT-001 — Keyboard
Desktop에서 Arrow + A + B만으로 최소 1개 stage 핵심 flow 진행.

**Expected**
- keydown/up 유실 없음.
- panel open/close 후 movement 정상.

### TC-INPUT-002 — Mouse
Hub navigation, quiz choice, confirm 가능한 UI는 실제 mouse click으로 조작.

**Expected**
- 클릭 target과 visible target 위치가 일치.
- double-click 시 중복 progression 없음.

### TC-INPUT-003 — Tablet touch
800×1280 또는 1024×768 headed context에서 D-pad/A/B와 quiz choice를 tap.

**Expected**
- D-pad target >= 44px.
- A/B target >= 44px.
- HUD/modal이 D-pad/A/B를 가리지 않는다.
- touch 이동이 keyboard와 동일하게 동작한다.

### TC-INPUT-004 — Orientation/resize
play 중 portrait ↔ landscape resize 1회.

**Expected**
- canvas blank/왜곡 없음.
- controls 화면 밖으로 나가지 않음.
- modal choice clipping 없음.
- resize 후 입력 계속 동작.

---

## I. Visual / Child UX Acceptance

각 stage에서 다음을 실제 화면으로 판단한다.

### TC-UX-001 — Readability
**Expected**
- 주요 한글이 잘리지 않는다.
- 글자와 배경 대비가 충분히 읽을 수 있다.
- 깨진 문자/중국어 잔존/영문 artifact 없음.

### TC-UX-002 — What-next clarity
각 interaction 종료 직후 3~5초간 화면을 보고 다음 행동을 추정한다.

**Expected**
- 목표/cue/길/오브젝트 중 최소 하나가 다음 행동을 알려준다.
- 아무 설명 없이 화면을 헤매야 하는 구간은 issue로 기록.

### TC-UX-003 — Modal obstruction
**Expected**
- compact panel이 world context를 완전히 가리지 않는다.
- 조작 버튼과 겹치지 않는다.
- 닫기/확인 방법이 명확하다.

### TC-UX-004 — Reward clarity
**Expected**
- 동물/발견 → reward 연결이 눈에 보인다.
- reward 이름이 stage theme과 일치한다.
- Hub badge 증가가 사용자가 인지 가능하다.

---

# 5. Quiz Acceptance

현재 bank는 265문항이다. 이번 작업에서 gameplay 랜덤화 자체를 새로 구현하지 않는다.

실제 플레이 중 표시된 모든 문제에 대해 기록:
- question id (read-only로 확인 가능할 때)
- 표시 text
- choice 수
- 선택 결과
- feedback text
- 동일 session 내 question 중복 여부

## 기대 결과
- 빈 question/choice/explanation 없음.
- 깨진 한글/중국어/비의도 영문 artifact 없음.
- answer가 실제 choice 중 하나.
- 정답 선택 시 positive feedback.
- 오답 선택 시 retry/설명 feedback.
- quiz가 끝난 뒤 progression 정상.

### 중요
화면에 표시된 문제를 보고 선택한다.
내부 정답 key를 읽어서 자동으로 정답을 고르는 방식은 Acceptance QA 증거로 인정하지 않는다.

---

# 6. Console / Network / Runtime 관찰

Chrome 실행 중 수집:
- `pageerror`
- `console.error`
- failed request / HTTP >=400
- unhandled rejection

## Expected
- JS runtime error: 0
- pageerror: 0
- gameplay 관련 console.error: 0
- 신규 asset/network failure: 0

기존 `/assets/vendor/*.glb` 404는 procedural fallback이 정상 작동하는 경우 **expected vendor warning**으로 별도 집계한다.

REPORT에는:
- expected vendor warnings N건
- 실제 error 0건
을 분리해서 적는다.

---

# 7. 실제 눈으로 확인할 회귀 포인트

특히 아래 과거 이슈를 반드시 다시 본다.

1. Waterfall reward confirm 전 `rewardComplete:false`였던 문제 재발 여부.
2. Waterfall 빠른 A 입력 시 completed quiz 재활성화/null explanation crash 여부.
3. Sky Ridge bridge/corridor 이동 막힘 여부.
4. Cave/GiantTree quiz 3 rounds 후 다음 phase 전환 여부.
5. Hub stage unlock이 reload 후 즉시 반영되는지.
6. 5/5 reward persistence.
7. tablet에서 D-pad/A/B와 modal overlap 여부.
8. 모든 stage에서 blank canvas/asset fallback 이상 여부.

---

# 8. 버그 발견 시 처리 규칙

Severity:
- **S0 BLOCKER**: 게임 시작/완주 불가, 저장 손실, 지속 crash
- **S1 MAJOR**: 핵심 stage 진행 막힘, reward 잘못 지급, 입력 먹통
- **S2 UX**: 힌트 불명확, modal overlap, 글자 clipping, route 혼란
- **S3 POLISH**: 사소한 시각/문구/animation 문제

## 수정 정책
- S0/S1: 이번 작업에서 최소 수정 필수.
- S2: 명확한 수정 가능하면 함께 수정.
- S3: REPORT에 backlog로 남겨도 됨.

수정 후:
1. 해당 TC 재실행
2. 해당 stage 처음부터 재완주
3. Full Adventure smoke 재실행
4. `node --test`
5. `git diff --check`

Production code 수정 이유/영향 범위를 REPORT에 기록한다.

---

# 9. Evidence

## Screenshots
최소 **50장**.

필수 포함:
- Hub fresh 0/5
- 각 stage start
- 각 stage 핵심 interaction
- 각 stage quiz
- 각 stage discovery
- 각 stage reward
- Hub 1/5, 2/5, 3/5, 4/5, 5/5
- final completion text
- mid reload
- final reload
- tablet portrait
- tablet landscape
- 발견한 UX/버그 before/after

저장:
`jungle-web-canvas-poc/artifacts/jungle-chrome-acceptance-qa/`

## Video
Playwright headed 환경에서 video recording 가능하면 Run A 전체를 저장한다.
불가능하면 screenshot+로그로 대체하고 REPORT에 명시한다.

---

# 10. Automated regression after Chrome Acceptance

실제 브라우저 acceptance가 끝난 뒤에만 실행:

```bash
node --test
git diff --check
```

기준:
- 전체 tests 0 fail
- 현재 265 quiz bank 유지
- 기존 Full Adventure E2E 구조 회귀 없음

가능하면 마지막에 기존:

```bash
node tools/browser/jungle_full_adventure_e2e.mjs
```

도 1회 돌려 automated smoke와 headed acceptance 결과가 일치하는지 확인한다.

---

# 11. PASS 기준

아래를 모두 만족해야 최종 PASS.

## Browser execution
- [ ] 실제 headed Chrome/Chromium 실행
- [ ] Run A Desktop 완료
- [ ] Run B Tablet touch 완료
- [ ] Run C Negative/Recovery 완료

## Adventure
- [ ] Hub fresh state 정상
- [ ] Camp 완주
- [ ] Waterfall 완주
- [ ] Cave 완주
- [ ] Giant Tree 완주
- [ ] Sky Ridge 완주
- [ ] 발견/마일스톤 5/5
- [ ] reward/badge 5/5
- [ ] `배지 5 / 5 · 정글 탐험 완주!`

## Persistence
- [ ] mid reload 정상
- [ ] final reload 정상
- [ ] completed stage re-entry 중복 reward 없음

## Input/UX
- [ ] keyboard 정상
- [ ] mouse 정상
- [ ] touch/D-pad/A/B 정상
- [ ] resize/orientation 후 정상
- [ ] modal/control overlap 없음
- [ ] 치명적 route confusion/dead-end 없음

## Errors
- [ ] pageerror 0
- [ ] gameplay console.error 0
- [ ] 신규 non-vendor HTTP error 0
- [ ] modal stuck 0
- [ ] input stuck 0
- [ ] blank canvas 0

## Forbidden shortcuts
- [ ] teleport 0
- [ ] state injection 0
- [ ] storage injection 0
- [ ] DOM force 0
- [ ] direct progression call 0

## Regression
- [ ] `node --test` 0 fail
- [ ] `git diff --check` clean
- [ ] Full Adventure automated smoke PASS

하나라도 S0/S1 또는 필수 조건이 실패하면 PASS라고 쓰지 않는다.

---

# 12. REPORT

작성:

`.agent/REPORT_JUNGLE_REAL_CHROME_ACCEPTANCE_QA_12.md`

반드시 포함:
1. START HEAD
2. FINAL HEAD
3. 실제 사용 브라우저 (Chrome/Chromium, version, headed 여부)
4. OS/display 환경
5. changed files
6. production code 변경 여부
7. Run A/B/C 결과
8. **각 TC ID별 PASS/FAIL 표**
9. stage별 실제 관찰 flow
10. stage별 기대 결과 vs 실제 결과
11. Hub unlock/progress evidence
12. 발견/마일스톤 5/5 evidence
13. reward/badge 5/5 evidence
14. quiz 화면/feedback evidence
15. persistence evidence
16. keyboard/mouse/touch evidence
17. portrait/landscape evidence
18. UX issue 목록 + severity
19. 발견 버그 root cause / 수정 내용 / 재검증 결과
20. screenshot 수/경로
21. video 여부/경로
22. pageerror/console/network 집계
23. expected vendor warning 별도 집계
24. 금지행위 0건 확인
25. `node --test` 결과
26. `git diff --check` 결과
27. automated Full Adventure smoke 결과
28. 남은 이슈/backlog
29. 최종 PASS / FAIL / BLOCKED

REPORT는 "테스트했다"는 주장만 쓰지 말고 **TC별 실제 화면 관찰 결과와 기대 결과를 나란히 기록**한다.

---

# 13. Deliverable

필요 시 최소 production fix + Chrome acceptance tooling + REPORT를 commit/push.

코드 수정이 전혀 필요 없으면 QA script/REPORT만 commit/push.

최종:

```bash
git status
git log -1 --oneline
git push origin prototype/jungle-web-canvas-poc
```

원격 branch가 FINAL HEAD와 동일한지 확인한다.

**merge/close 금지.**
