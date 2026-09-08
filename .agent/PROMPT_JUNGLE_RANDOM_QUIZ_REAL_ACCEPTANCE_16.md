# PROMPT_JUNGLE_RANDOM_QUIZ_REAL_ACCEPTANCE_16

## Mission

PROMPT 15의 랜덤 퀴즈 구현 자체는 완료되었지만, 브라우저 acceptance가 요구 수준을 충족하지 못했다.
이번 작업의 목적은 **새 기능을 크게 추가하는 것이 아니라, 현재 구현이 실제 사용자 플레이 흐름에서 정말 동작하는지 headed Google Chrome으로 끝까지 증명하고, 발견된 실제 버그만 최소 수정하는 것**이다.

현재 기준 원격 브랜치:
- branch: `prototype/jungle-web-canvas-poc`
- current HEAD: `a227fb215eb1d6727b89292ad51ae06b9a2765fc`
- PROMPT 15 functional HEAD: `0faacacdf8850815bf279093b3152fd679d44255`
- unit tests reported: 221 pass / 0 fail

PROMPT 15에서 구현된 핵심:
- `stage_quiz_pools.js`
- `bird_quiz.js` session tracking + stable choice shuffle
- Camp / Waterfall / Cave / Giant Tree / Sky Ridge runtime random quiz integration
- 5 stage theme pools
- browser-session used-ID tracking
- retry / threshold / reward idempotency tests

이번 작업은 **PROMPT 15 acceptance 보강**이다.

---

# 0. 시작 전 원칙

```bash
git rev-parse --show-toplevel
git remote -v
git status --short
git branch --show-current
git fetch origin prototype/jungle-web-canvas-poc
```

필수:
- repo는 `JongPyoShin/eduni-links`.
- branch는 `prototype/jungle-web-canvas-poc`.
- 최신 origin을 기준으로 START HEAD 기록.
- dirty workspace가 있으면 보존.
- `git reset --hard`, `git clean`, force push 금지.
- 현재 게임 코드가 acceptance를 통과하면 production code 수정하지 않아도 된다.
- 실제 플레이에서 버그가 발견된 경우에만 최소 수정.

---

# 1. 지금까지 확인된 문제점

PROMPT 15 QA script는 다음 이유로 최종 acceptance 증거가 부족했다.

1. 각 stage URL을 직접 열어 load/state 존재만 확인했다.
2. Hub → stage 실제 진입 흐름을 끝까지 사용하지 않았다.
3. 실제 퀴즈 15문항을 사용자 입력으로 풀지 않았다.
4. 실제 15 question ID unique를 browser에서 기록하지 않았다.
5. failure → no reward → retry → new questions → success 흐름을 실제 플레이하지 않았다.
6. replay variation 검증이 `uniqueStates.size >= 1`이라 랜덤성 증명이 아니었다.
7. REPORT의 pool count가 실제 코드와 불일치했다.
   - 현재 코드 기준 Camp 27
   - Waterfall 26
   - Cave 26
   - Giant Tree 26
   - Sky Ridge 26
   - total 131 unique

**pool을 억지로 26개씩 맞추지 않는다. REPORT를 실제 코드에 맞춘다.**

---

# 2. 절대 보존 조건

깨지면 FAIL:

- Hub → Camp → Waterfall → Cave → Giant Tree → Sky Ridge 순차 unlock
- 실제 이동/충돌/상호작용 구조
- 5 stage discovery/milestone
- reward/badge 5/5
- 최종 `배지 5 / 5 · 정글 탐험 완주!`
- 2/3 success threshold
- 0~1/3 fail
- completed stage reward duplicate 0
- reload persistence
- keyboard / mouse / tablet touch
- PROMPT 13 visual upgrades
- stable choice order during same question
- sessionStorage 기반 used question tracking
- production test backdoor 없음

---

# 3. Browser QA 기본 규칙

반드시 실제 Google Chrome headed mode:

```js
chromium.launch({
  channel: "chrome",
  headless: false,
})
```

금지:
- stage completion state injection
- teleport
- localStorage/sessionStorage에 progression/reward 직접 write
- DOM에서 progression function 직접 호출
- 직접 정답 state 설정
- production bridge에 test-only setter 추가
- Run A에서 stage URL 직접 `goto()`로 순회

허용:
- 초기 `page.goto(BASE + "/jungle-hub.html")`
- 실제 Hub link click
- keyboard/touch/mouse 입력
- read-only `getState()` inspection
- 화면에 표시된 question text를 test-side bank map으로 question ID에 역매핑
- 기존 PROMPT 11/12의 실제 이동 helper 재사용

**PROMPT 12의 real-input navigation helper를 우선 재사용한다. 새로 shortcut을 만들지 않는다.**

---

# 4. Question ID 증거 수집 방식

실제 UI에는 qID가 표시되지 않을 수 있다.
따라서 QA script에서 production state를 변경하지 않고 다음 방식 중 하나를 사용한다.

권장:
1. QA Node script에서 `BIRD_QUIZ_BANK`를 import.
2. modal의 현재 question text를 읽는다.
3. bank의 `question` text와 매칭하여 ID를 찾는다.
4. stage / order / qID / question text / displayed choices를 기록한다.

예:

```text
Camp #1 q074 "..."
Camp #2 q003 "..."
Camp #3 q061 "..."
...
SkyRidge #3 q129 "..."
```

question text가 bank에서 0개 또는 2개 이상 매칭되면 FAIL.

---

# 5. Run A — Desktop Real Full Adventure

환경:
- Google Chrome headed
- 1280×800
- fresh browser context
- fresh game progress
- 시작 URL은 **Hub 1회만**

## 진행

```text
Hub
→ Camp 실제 link click
→ 실제 이동/상호작용
→ 랜덤 quiz 3문항 실제 답변
→ reward
→ Hub 복귀
→ Waterfall
→ Cave
→ Giant Tree
→ Sky Ridge
→ Hub
```

각 stage는 실제 기존 route를 따라간다.

### Camp
- hut quest start
- feather / footprints / birdcall
- 3문항 실제 modal 확인/답변
- 2/3 이상
- Bluebird
- `bluebird-feather`

### Waterfall
- streamGate
- steppingStones
- echo / mistTrail / waterDrops
- 3문항 실제 답변
- Kingfisher
- `kingfisher-drop`

### Cave
- caveGate
- glowTrail
- echoCrystal
- shadowMark
- fireflyPattern 3 questions
- crystalBridge
- Bat
- `firefly-crystal`

### Giant Tree
- rootGate
- barkPattern
- seedTrail
- hollowEcho
- treeRing 3 questions
- canopyStairs
- Squirrel
- `ancient-seed`

### Sky Ridge
- corridor 실제 이동
- windRibbon / cloudShadow / windChime
- 3문항 실제 답변
- Hawk first interaction
- Hawk reward confirmation
- `sky-star`

## Run A PASS 조건

- 실제 푼 question count = 15
- 15 question IDs unique = 15
- 각 stage question count = 3
- 모든 ID가 해당 stage pool에 포함
- choice 4개 모두 표시
- explanation null/undefined 0
- stage completion 5/5
- reward 5/5
- final Hub exact text: `배지 5 / 5 · 정글 탐험 완주!`
- pageerror 0
- gameplay code console.error 0

REPORT에 15개 ID를 **순서대로 전부** 기록한다.

---

# 6. Run B — Real Failure → Retry → Success

fresh context.

Camp 또는 Waterfall 중 실제 이동이 안정적인 stage 1개를 선택하되, 직접 stage URL로 들어가지 말고 Hub에서 진입한다.

## Attempt 1

실제 modal에서 의도적으로 0/3 또는 1/3이 되도록 답한다.

Expected:
- fail message 표시
- completion false
- reward 없음
- Hub next-stage unlock 잘못 발생하지 않음
- 3 question IDs 기록

## Retry

실제 게임 UX를 통해 retry.

Expected:
- 새 attempt 3문항
- pool 여유가 있으므로 previous 3 IDs와 overlap = 0
- modal close/reopen이 아니라 **명시적 retry에서만** reroll

## Attempt 2

2/3 또는 3/3으로 성공.

Expected:
- success
- reward exactly 1
- progression 정상
- duplicate reward 0

REPORT:

```text
attempt1 IDs: [...]
score: 0/3 or 1/3
reward: 0
attempt2 IDs: [...]
overlap: 0
score: 2/3 or 3/3
reward: 1
```

---

# 7. Run C — Modal Stability / Choice Stability

fresh context.
최소 Camp + Cave 2개 stage에서 실제 quiz까지 이동.

각 stage에서 첫 문제:

1. question text 기록
2. choices 4개 순서 기록
3. Escape/B로 modal close
4. 동일 interactable 재접근
5. 다시 question/choices 기록

Expected:
- question ID 동일
- question number 동일
- choices order 동일
- score 변화 없음
- question used 처리 중복 없음

그 다음 실제 정답을 선택하여 correctness가 bank answer와 일치하는지 확인.

---

# 8. Run D — Real Replay Variation

기존 `uniqueStates.size >= 1` 검증은 삭제/교체한다.

fresh browser context를 **10회** 만든다.
각 run은 Hub → Camp 실제 진입 → 첫 quiz attempt의 3 question IDs를 확보한다.

단 shortcut state injection 금지.
기존 실제 navigation helper 사용.

수집:

```text
run1 [a,b,c]
run2 [d,e,f]
...
run10 [...]
```

PASS 기준:
- 10 run 모두 3 unique IDs
- 모든 ID가 Camp pool 소속
- distinct 3-ID set >= 2
- 전체 30 draw에서 distinct IDs >= 6

위 기준은 randomness 존재 증명용이며 특정 seed를 production에 고정하지 않는다.

REPORT에 10세트를 모두 기록한다.

---

# 9. Run E — Tablet Touch Real Quiz

환경:
- 800×1280
- `hasTouch: true`
- headed Chrome
- fresh context
- Hub 시작

최소 Camp + Waterfall 2 stage를 실제 touch/D-pad/A/B로 진행한다.

PASS:
- touch movement 가능
- A/B 실제 interaction 가능
- quiz choice 4개 모두 touch 가능
- 2 stage 각각 실제 랜덤 questions 3개 확인
- portrait에서 modal clipping 없음
- landscape 1280×800 resize 후 blank canvas 없음
- 다시 portrait 복귀
- 현재 quiz/progression 유실 없음

최소 각 단계 주요 화면 screenshots 남긴다.

---

# 10. Run F — Persistence / Completed Re-entry

Run A 또는 별도 fresh context에서 확인.

### Mid persistence
Waterfall 완료 후 reload.

Expected:
- completed rewards 2/5 유지
- Hub unlock 상태 유지
- 이미 획득한 reward duplicate 없음

### Final persistence
5/5 완료 후 reload 2회.

Expected:
- 5/5 유지
- completion text 유지
- reward count 변화 없음

### Completed stage re-entry
완료된 stage 1개 재진입.

Expected:
- reward duplicate 0
- save corruption 0

---

# 11. Console / Network Error 기준

현재 known vendor GLB missing assets가 존재할 수 있다.

QA script는:
- raw console errors count
- raw failed responses count
- known vendor GLB 404 count
- **unknown/non-vendor error count**

을 따로 기록한다.

PASS:
- pageerror = 0
- unknown/non-vendor gameplay console.error = 0
- unexpected response failure = 0

금지:
- 모든 404/console.error를 broad filter
- error listener 자체 제거
- known vendor asset filename/path 증거 없이 무조건 expected 처리

Vendor GLB 404 자체 정리는 이번 PROMPT 16의 필수 목표가 아니다.

---

# 12. Unit / Static Regression

실행:

```bash
node --test
git diff --check
```

PASS:
- >= 221 tests pass
- 0 fail
- 기존 random quiz tests 삭제 금지
- `git diff --check` clean

추가로 실제 pool counts를 코드에서 계산하여 assert/report한다.

Expected current values:

```text
Camp       27
Waterfall  26
Cave       26
GiantTree  26
SkyRidge   26
Total      131
```

코드가 합리적으로 변하지 않았다면 위 값을 REPORT에 정확히 기록한다.

---

# 13. QA Script

기존:

`jungle-web-canvas-poc/tools/browser/jungle_random_quiz_acceptance_qa.mjs`

은 acceptance 수준이 부족하므로 그대로 PASS 근거로 재사용하지 않는다.

권장:

`jungle-web-canvas-poc/tools/browser/jungle_random_quiz_real_acceptance_qa.mjs`

또는 기존 파일을 명확히 개선.

필수 특징:
- headed Chrome
- Hub start
- real input
- real quiz answer clicks
- 15 IDs collection
- failure/retry
- modal stability
- replay variation
- tablet touch
- persistence
- explicit PASS/FAIL assertions
- 실패 시 process exit != 0

**단순 load/state existence check는 acceptance TC로 계산하지 않는다.**

---

# 14. Screenshots / Evidence

신규 evidence 경로 권장:

`jungle-web-canvas-poc/artifacts/jungle-random-quiz-real-acceptance/`

최소:
- Hub initial
- 각 stage quiz 화면 최소 1장씩
- 각 stage reward 최소 1장씩
- failure 화면
- retry 새 question 화면
- final 5/5 Hub
- tablet portrait quiz
- tablet landscape
- reloaded final Hub

수량 자체보다 실제 TC 증거가 중요하다.

REPORT에서 screenshot filename과 TC를 연결한다.

---

# 15. Production Code 수정 정책

우선 acceptance script만 수정/추가해서 검증한다.

실제 플레이에서 제품 버그가 발견되면:
1. 재현 screenshot/state 기록
2. 최소 production fix
3. 해당 bug regression test 추가
4. Run A~F 다시 수행

게임 로직을 QA에 맞추기 위해 우회/단축하지 않는다.

---

# 16. REPORT

작성:

`jungle-web-canvas-poc/.agent/REPORT_JUNGLE_RANDOM_QUIZ_REAL_ACCEPTANCE_16.md`

필수:

1. START HEAD
2. FINAL FUNCTIONAL HEAD
3. production code 변경 여부 및 이유
4. QA script 변경 내용
5. 실제 stage pool counts
6. Run A 15 question IDs 전체
7. 15/15 unique 증거
8. 각 stage score/reward
9. Run B fail IDs / retry IDs / overlap
10. Run C before/after modal question + choice order
11. Run D 10개의 3-ID set + distinct count
12. Run E tablet 결과
13. Run F persistence/re-entry 결과
14. raw console/network errors와 known vendor 404 분리
15. pageerror count
16. unit test 결과
17. `git diff --check`
18. screenshot evidence 목록
19. prohibited action count = 0
20. FINAL VERDICT: PASS / FAIL

FINAL FUNCTIONAL HEAD는 기능/QA commit 후 실제 SHA로 정리한다.

---

# 17. 최종 PASS 기준

아래가 모두 충족되어야 PASS:

```text
[ ] headed Google Chrome
[ ] Hub에서 실제 시작
[ ] 직접 stage URL 순회 없음
[ ] 실제 입력으로 5 stages 완주
[ ] 실제 quiz 15문항 답변
[ ] 15 question IDs = 15 unique
[ ] 각 ID stage pool 소속
[ ] reward 5/5
[ ] final Hub 5/5 completion text
[ ] fail → reward 0
[ ] retry → 새 3 questions, overlap 0
[ ] retry success → reward exactly 1
[ ] modal close/reopen question stable
[ ] choice order stable
[ ] 10 fresh replay contexts에서 variation 증명
[ ] tablet touch 실제 quiz
[ ] mid/final reload persistence
[ ] completed re-entry duplicate reward 0
[ ] pageerror 0
[ ] unknown gameplay console.error 0
[ ] >=221 unit tests pass, 0 fail
[ ] git diff --check clean
[ ] production backdoor/state injection/teleport 0
```

하나라도 빠지면 `PARTIAL` 또는 `FAIL`로 보고하고 PASS라고 쓰지 않는다.

---

# 18. Commit / Push

완료 후:

- QA script
- 필요 시 최소 production fix
- regression tests
- REPORT

를 함께 commit/push.

대상 branch:

`prototype/jungle-web-canvas-poc`

merge/PR close/main 반영은 하지 않는다.

최종 응답은 다음 형식으로 짧게:

```text
PROMPT 16: PASS / FAIL
FUNCTIONAL SHA: <sha>
REPORT SHA: <sha>
RUN A: 15/15 unique, reward 5/5
RUN B: fail→retry PASS
Chrome/Tablet/Persistence: PASS
Tests: N pass / 0 fail
```
