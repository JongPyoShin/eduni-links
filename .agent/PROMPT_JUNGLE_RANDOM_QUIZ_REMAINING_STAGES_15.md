# PROMPT_JUNGLE_RANDOM_QUIZ_REMAINING_STAGES_15

## Mission
PROMPT 14의 265문항 랜덤 퀴즈 runtime 통합을 **중간 작업을 버리지 않고 끝까지 완성**한다.

현재 작업 흐름상 `waterfall_game.js`를 수정 중일 수 있다. 이 지시서는 새 구현을 다시 시작하는 문서가 아니라, **현재 dirty workspace/부분 구현을 그대로 보존하면서 Cave → Giant Tree → Sky Ridge → Camp까지 연결하고, 마지막에 5개 스테이지 전체 회귀를 통과시키는 completion prompt**다.

PROMPT 14의 계약이 상위 기준이다. 충돌 시 PROMPT 14를 우선한다.

---

# 0. 시작 전 — 기존 작업 절대 보존

먼저 다음만 확인한다.

```bash
git rev-parse --show-toplevel
git remote -v
git status --short
git branch --show-current
git diff -- jungle-web-canvas-poc/src
```

필수:
- 원격은 `JongPyoShin/eduni-links`여야 한다.
- 현재 `waterfall_game.js` 및 관련 랜덤 퀴즈 수정이 있으면 **그대로 보존**한다.
- `git reset --hard`, `git clean`, force push 금지.
- 다른 agent/사용자 변경을 덮어쓰지 않는다.
- 이미 만들어진 공통 `stage_quiz_pools`/selector/session helper가 있으면 반드시 재사용한다.
- 각 stage가 서로 다른 랜덤 시스템을 따로 만들지 않는다.

현재 branch가 예상과 다르더라도 먼저 기존 diff를 이해하고, 안전한 방식으로 최신 원격을 반영한다.

---

# 1. 완료 목표

실제 플레이에서 아래 5개 stage 모두:

```text
stage 시작
  → theme pool에서 3문항 선택
  → attempt 내 3문항 고정
  → 실제 modal에서 1/3 → 2/3 → 3/3 표시
  → 2개 이상 정답 = 성공
  → 0~1개 정답 = 실패
  → 실패 시 reward 없음 + retry 가능
  → retry 시 새 문제 조합
  → 성공 시 기존 reward/progression/persistence 그대로
```

그리고 Hub부터 5개 stage를 한 브라우저 session에서 완주할 때 **총 15문항 question ID 중복 0**이어야 한다.

---

# 2. Waterfall 현재 작업 마무리

현재 수정 중인 `waterfall_game.js`를 먼저 완성한다.

기존 진행:
- `streamGate`
- `steppingStones`
- `echo`
- `mistTrail`
- `waterDrops`
- Kingfisher encounter/reward

보존:
- 이동/충돌/상호작용 좌표
- clue 순서
- Kingfisher reward ID
- 저장 key
- Hub unlock

변경:
- q008/q002/q039 같은 고정 question 의존 제거
- Waterfall theme pool에서 attempt당 3문항 선택
- echo/mistTrail/waterDrops가 그 3문항을 순서대로 소비
- modal close/reopen에 현재 question reroll 금지

Waterfall acceptance:
- 3/3 → reward 1회
- 2/3 → reward 1회
- 1/3 → reward 0, retry 가능
- 0/3 → reward 0, retry 가능
- retry → 직전 3문항과 overlap 0 (pool 여유 시)
- rapid A/Enter 반복으로 score 중복 증가 금지

Waterfall만 통과한 뒤 다음 stage로 간다.

---

# 3. Cave runtime 연결

기존 exploration flow를 절대 단축하지 않는다.

기존 핵심 흐름:

```text
caveGate
→ glowTrail
→ echoCrystal
→ shadowMark
→ fireflyPattern quiz 3 rounds
→ crystalBridge
→ bat
→ firefly-crystal reward
```

구현:
- Cave theme pool에서 attempt 시작 시 정확히 3문항 선택.
- `fireflyPattern` 3 rounds가 선택된 q1/q2/q3를 실제로 표시.
- 한 round에서 modal을 닫았다 다시 열어도 동일 question 유지.
- 정답/오답 feedback과 explanation 정상 표시.
- 2/3 이상만 Bat milestone/reward 진행 허용.
- 0~1/3은 Bat/reward로 진행 불가, retry route가 존재해야 함.

TC-CAVE-RNG-01
- fresh attempt question IDs 3개 unique.
- Expected: PASS.

TC-CAVE-RNG-02
- 2개 정답 + 1개 오답.
- Expected: Bat milestone + `firefly-crystal` exactly once.

TC-CAVE-RNG-03
- 1개 정답 + 2개 오답.
- Expected: reward 없음, completion flag false, retry 가능.

TC-CAVE-RNG-04
- Escape로 quiz modal close → 같은 interactable 재접근.
- Expected: 같은 current question ID/number 유지.

---

# 4. Giant Tree runtime 연결

기존 exploration flow 보존:

```text
rootGate
→ barkPattern
→ seedTrail
→ hollowEcho
→ treeRing quiz 3 rounds
→ canopyStairs
→ squirrel
→ ancient-seed reward
```

구현:
- Giant Tree theme pool에서 3문항.
- `treeRing` 3 rounds가 실제 random session을 소비.
- Squirrel은 birdCodex capture로 바꾸지 않는다. 기존 milestone semantics 유지.
- 2/3 이상 성공, 0~1/3 실패.
- reward duplicate 금지.

TC-TREE-RNG-01
- attempt 내 3개 unique.

TC-TREE-RNG-02
- 3/3, 2/3 각각 success.
- Expected: `ancient-seed` 1회.

TC-TREE-RNG-03
- 1/3 실패 후 retry.
- Expected: 새 3문항, 직전과 overlap 0 가능하면 보장.

TC-TREE-RNG-04
- corridor/root navigation 회귀.
- Expected: 랜덤 퀴즈 변경 때문에 이동 stuck 없음.

---

# 5. Sky Ridge runtime 연결

기존 흐름 보존:

```text
ridge corridor
→ windRibbon
→ cloudShadow
→ windChime
→ Hawk encounter
→ Hawk confirmation/reward
```

제거/대체 대상:
- q019/q015/q017 등 clue별 고정 mapping.

구현:
- Sky Ridge theme pool에서 attempt당 3문항.
- windRibbon/cloudShadow/windChime가 순서대로 q1/q2/q3 소비.
- 2/3 이상에서만 Hawk 2-step encounter/reward 진행.
- Sky gate/headed Chrome timing retry가 필요하더라도 game logic을 우회하지 않는다.

TC-SKY-RNG-01
- 3문항 unique.

TC-SKY-RNG-02
- 2/3 success → `sky-star` 1회.

TC-SKY-RNG-03
- 0/3 fail → reward 없음.

TC-SKY-RNG-04
- axis-aligned corridor 실제 keyboard 이동.
- Expected: 기존 route 그대로 통과.

TC-SKY-RNG-05
- Hawk encounter 첫 interact + reward confirmation 두 단계 유지.

---

# 6. Camp runtime 연결

Camp는 마지막에 연결한다. 이유는 기존 clue-specific mapping과 chapter state coupling이 가장 오래된 구조이므로, 앞 4개 stage에서 공통 selector/session API를 안정화한 후 적용한다.

기존 flow:

```text
hut quest start
→ shinyFeather
→ footprints
→ birdcall
→ Bluebird encounter
→ bluebird-feather reward
```

기존 `getClueQuizId()` 고정 mapping은 runtime random session으로 교체/우회하되 chapter progression contract는 유지한다.

구현:
- Camp attempt 시작 시 3문항 고정.
- feather/footprints/birdcall clue 순서대로 q1/q2/q3 소비.
- Bluebird success threshold = 2/3.
- 실패 시 Bluebird complete false + reward 없음.
- retry 가능.

TC-CAMP-RNG-01
- 3개 clue 모두 다른 question ID.

TC-CAMP-RNG-02
- 2/3 success → `bluebird-feather` 1회.

TC-CAMP-RNG-03
- 1/3 fail → Bluebird complete false, reward 0.

TC-CAMP-RNG-04
- quest/clue 순서 unchanged.

---

# 7. Adventure-session 15문항 중복 방지

5개 stage 개별 성공만으로 완료 처리하지 않는다.

실제 browser session에서:

```text
Camp 3
Waterfall 3
Cave 3
Giant Tree 3
Sky Ridge 3
= 총 15문항
```

Expected:
- 15 question IDs unique.
- stage별 theme pool 조건 충족.
- sessionStorage 기반 used ID가 있다면 Hub 이동/페이지 navigation 후에도 유지.
- 새 browser context에서는 새로운 sequence 가능.
- localStorage에 quiz-used history를 영구 저장하지 않는다.

단 pool 겹침 때문에 15 unique가 불가능한 구조라면 selector 설계를 고쳐야 한다. 테스트에서 우연히 통과시키는 방식 금지.

---

# 8. Choice shuffle 안정성

현재 `currentQuestion()`가 호출될 때마다 choices를 다시 shuffle하는 구조가 남아 있다면 검토한다.

문제:
- render/update 호출마다 choice 순서가 바뀌면 어린 사용자에게 혼란.

완료 기준:
- **한 question이 표시된 동안 choice order는 고정**.
- 다음 question으로 넘어갈 때만 새 choice order 가능.
- answer ID와 displayed choice가 항상 일치.

필요하면 session 생성 시 질문별 shuffled choices를 freeze/cache한다.
테스트용 RNG injection은 허용하지만 production backdoor는 금지.

TC-CHOICE-01
- 같은 question을 20회 render/current read.
- Expected: choice order 동일.

TC-CHOICE-02
- answer 선택 후 correctness.
- Expected: shuffle 여부와 무관하게 정답 판정 정확.

---

# 9. Unit tests

기존 PROMPT 14 테스트 요구를 모두 포함하고, 최소 다음을 추가/확인한다.

1. 265 bank integrity.
2. 5 stage pool >=20, duplicate 0.
3. attempt당 정확히 3 unique.
4. 1000회 iteration에서 attempt 내부 duplicate 0.
5. 500 adventure simulation에서 15문항 unique.
6. 여러 seed에서 stage별 실제 variation 발생.
7. immediate retry overlap 0 (pool 여유 시).
8. 3/3 success.
9. 2/3 success.
10. 1/3 fail.
11. 0/3 fail.
12. modal close/reopen current question stable.
13. current question choice order stable.
14. double answer/rapid input guard.
15. reward exactly once.
16. completed stage re-entry duplicate reward 0.

완료 기준:

```text
node --test
>= 201 pass
0 fail
```

기존 테스트를 삭제해서 PASS 수를 맞추면 FAIL.

---

# 10. Headed Chrome 실제 검증

반드시 Google Chrome headed mode:

```js
chromium.launch({ channel: "chrome", headless: false })
```

## Run A — Desktop 1280×800 full adventure

fresh context → Hub에서 시작.

실제 입력으로:
- Camp complete
- Waterfall complete
- Cave complete
- Giant Tree complete
- Sky Ridge complete

검증:
- 5 stage 15 question IDs 기록.
- 15 unique.
- reward 5/5.
- final Hub: `배지 5 / 5 · 정글 탐험 완주!`
- pageerror 0.
- gameplay console.error 0.

## Run B — Failure + retry

fresh context에서 최소 Camp/Waterfall/Cave 중 1개 stage:
- 의도적으로 0/3 또는 1/3.
- reward 없음 확인.
- retry.
- 새 3문항 확인.
- 2/3 또는 3/3으로 성공.
- reward 정확히 1회.

## Run C — Tablet touch 800×1280

- touch D-pad/A/B 사용.
- 최소 2개 stage 실제 quiz 진행.
- 4 choices 모두 누를 수 있음.
- text clipping 없음.
- portrait → landscape → portrait resize.
- current quiz/progression 유지.

## Run D — Replay variation

새 browser context를 최소 5회 시작.
같은 stage를 반복 진입하여 question IDs 기록.

Expected:
- 매번 동일한 3문항 세트만 나오지 않음.
- 최소 5 run에서 stage별 6개 이상의 distinct question ID 관찰 권장.
- variation evidence를 REPORT에 기록.

---

# 11. 금지 사항

- teleport/state injection으로 stage complete 금지.
- localStorage에 completion/reward 직접 write 금지.
- DOM에서 버튼 강제 invoke하여 progression shortcut 금지.
- 고정 정답 index 하드코딩 금지.
- qa script에서 production state 변경 금지.
- 기존 visual effects/PROMPT 13 결과 제거 금지.
- vendor GLB 404를 숨기기 위해 broad console suppression 추가 금지.

읽기 전용 state inspection은 허용.

---

# 12. REPORT

작성:

`jungle-web-canvas-poc/.agent/REPORT_JUNGLE_RANDOM_QUIZ_REMAINING_STAGES_15.md`

필수 항목:
- START HEAD
- FINAL FUNCTIONAL HEAD
- 기존 dirty changes를 어떻게 보존했는지
- 수정 파일 목록
- stage별 pool count
- 각 stage 실제 Run question IDs
- Desktop full adventure 15 IDs + unique proof
- failure/retry before/after IDs
- replay variation 결과
- choice order stability 결과
- 3/3, 2/3, 1/3, 0/3 결과
- rewards 5/5
- persistence/re-entry 결과
- tablet/touch/rotation 결과
- screenshot 수/경로
- pageerror/console.error/network error
- node --test 결과
- git diff --check 결과
- remaining risks

REPORT의 FINAL HEAD를 `TBD`로 남기지 않는다.
기능 commit 후 필요하면 REPORT-only finalization commit을 추가해도 된다.

---

# 13. 완료 판정

다음이 모두 true일 때만 PASS:

- Waterfall random runtime 완료.
- Cave random runtime 완료.
- Giant Tree random runtime 완료.
- Sky Ridge random runtime 완료.
- Camp random runtime 완료.
- 각 attempt 3문항 unique.
- full adventure 15문항 unique.
- replay variation 증명.
- 2/3 threshold 정확.
- 실패 reward 0 + retry 정상.
- current question/choice order 안정.
- reward duplicate 0.
- Hub final 5/5.
- headed Chrome Desktop PASS.
- headed Chrome Tablet PASS.
- node tests fail 0.
- pageerror/console.error 0.
- REPORT 작성 및 FINAL HEAD 기록.

완료 후 **코드 + 테스트 + REPORT를 commit/push**한다.
merge/branch delete는 하지 않는다.
