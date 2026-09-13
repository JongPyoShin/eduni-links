# PROMPT_JUNGLE_GAMEPLAY_INTENT_RECOVERY_01

## Context
The current Jungle Web Game is not behaving like the intended educational adventure game in actual browser play.

Observed actual play at `http://localhost:8124/?renderer=three`:
- the player can walk around, but there is no obvious question flow
- there is no clear hint/quest guidance telling the child what to do next
- interactables are not obvious enough
- bird quiz/capture/codex code may exist, but the player does not naturally encounter it during normal play
- unit tests and HTTP 200 are not enough; the served game must visibly demonstrate the intended loop

Issue reference: #59

## Product intent
This is not a walking demo. The player should immediately understand the loop:

1. explore a stage
2. receive a visible objective/hint
3. find an interactable
4. get a clear `A` interaction cue
5. solve educational problems / stage mini-game
6. reach the stage bird
7. solve 3 bird quiz questions
8. 2/3+ correct => capture success
9. register the bird in the codex
10. receive the stage reward
11. continue to the next stage

A first-time child should experience a meaningful interaction/problem within about 30 seconds without knowing the map beforehand.

## Mandatory first step: reproduce before editing
1. Apply the latest recovery safely.
2. Preserve all existing local changes. Do not `reset --hard`, discard, or overwrite user work.
3. Record `git status`, branch, and HEAD.
4. Run the game from the exact worktree being edited.
5. Reproduce the complaint in the actual browser using `/?renderer=three`.
6. Confirm what is actually served by checking that the response contains the current quiz/codex implementation.
7. Trace why the implemented features are not naturally visible/reachable in normal play.

Do not declare this fixed only because files/functions exist.

## Required gameplay fixes

### 1. Persistent objective/hint HUD
Show the current objective clearly during normal play.
Examples for Camp:
- `학습 오두막을 찾아가 보자`
- `파랑새의 깃털 흔적을 찾아보자`
- `발자국을 찾아보자`
- `새소리를 찾아보자`
- `모닥불에서 흔적 문제를 풀어보자`
- `전망대로 가 보자`
- `파랑새에게 다가가 문제를 풀어보자`

The objective must change with progression and must remain visible without opening a debug screen.

### 2. Current-target guidance
The child must know where to go next without showing the exact answer.
Implement one simple, readable method using the current architecture:
- world-space marker above the active target, OR
- edge-of-screen arrow/indicator toward the active target, OR
- both if inexpensive

Do not reveal all future targets at once. Only guide to the current progression target.

### 3. Obvious interaction cue
When near an active interactable, show a clear cue such as:
- `A 조사하기`
- `A 이야기하기`
- `A 문제 풀기`

The cue must be readable in the actual Three.js gameplay view and not hidden behind canvas layering.

### 4. Early problem experience
The game must not require wandering for a long time before the player understands there are questions.
For Camp, ensure a first-time player can reach at least one real choice/problem interaction within about 30 seconds following the visible guidance.

Do not remove existing Camp clue/Fire Pit progression. Improve discoverability and pacing around it.

### 5. Bird capture flow must be naturally reachable
Preserve and verify:
- Bluebird / Kingfisher / Sky Hawk
- encounter -> 3 questions -> 2/3 success -> capture -> codex -> reward
- failure => no capture/reward, retry allowed

The final bird quiz must be reached through normal gameplay, not only by direct state manipulation or QA controls.

### 6. Codex visibility
Add a small, visible in-game `📖 도감` entry point or status indicator if not already present in the gameplay HUD.
It must not cover the D-pad, A/B buttons, or objective HUD.
Hub codex count must remain functional.

### 7. Keep existing stage mini-games
Do not replace existing stage mini-games with the bird quiz.
Both must exist:
- stage exploration/mini-game
- final bird quiz/capture

### 8. Do not touch unrelated architecture
Do not change:
- world geometry
- renderer architecture
- WebGPU
- terrain experiments
- Android integration
- movement/collision contracts unless required for a proven blocker
- unrelated asset pipeline

## Visual/UX acceptance criteria
At the actual served `/?renderer=three` URL, a fresh player must be able to answer all of these without developer knowledge:
- What should I do now?
- Where should I roughly go?
- What button do I press near the target?
- Where do questions appear?
- How do I eventually capture the bird?
- Where is the codex?

If any answer is unclear, the task is not complete.

## Tests
Add/adjust tests for the new guidance contract where practical.
At minimum verify:
- objective text maps to progression state
- active target marker/indicator exists for current phase
- interaction cue appears only for active nearby interactable
- bird quiz failure does not complete reward
- bird quiz success completes capture/codex/reward path
- codex HUD link/status exists

Run:
- `node --test`
- `git diff --check`

Existing tests must remain green.

## Browser QA — mandatory
Do actual browser QA from the exact modified worktree.

Camp fresh-state QA:
1. clear only Jungle game localStorage keys needed for a fresh run
2. open `/?renderer=three`
3. verify objective/hint is visible immediately
4. follow target guidance without using QA/debug controls
5. verify near-target `A` cue
6. reach and answer a real problem/choice
7. continue to Bluebird
8. verify 3-question bird quiz appears
9. fail once and confirm no reward
10. retry, succeed with 2/3+
11. confirm codex registration and reward
12. open codex from gameplay or Hub
13. reload and confirm persistence

Also smoke Waterfall and Sky Ridge final bird quiz reachability.

Record browser console/page errors.

## Served-build verification
The previous false-positive was caused by claiming implementation complete while the user still saw the old-feeling game.
Therefore explicitly report:
- server PID
- server CWD
- server port
- exact PLAY URL
- served `jungle-hub.html` contains codex UI
- served runtime JS contains bird quiz import/flow
- browser screenshot or concrete DOM/text evidence for objective, interaction cue, and quiz

`200 OK` alone is NOT acceptance evidence.

## Delivery / Git workflow
This task includes code modification.
After implementation and browser QA:
1. create a report at `.agent/REPORT_JUNGLE_GAMEPLAY_INTENT_RECOVERY_01.md`
2. include root cause, files changed, tests, browser QA, served-build evidence, remaining gaps
3. commit code + REPORT
4. push the working branch
5. do NOT merge or close any PR

## Final report format
- HEAD BEFORE:
- HEAD AFTER:
- ROOT CAUSE:
- FILES CHANGED:
- OBJECTIVE/HINT HUD:
- TARGET GUIDANCE:
- INTERACTION CUE:
- EARLY PROBLEM:
- BLUEBIRD FLOW:
- KINGFISHER FLOW:
- SKY HAWK FLOW:
- CODEX:
- TESTS:
- DIFF CHECK:
- SERVER PID/CWD/PORT:
- PLAY URL:
- BROWSER QA:
- CONSOLE/PAGE ERRORS:
- REMAINING GAPS:
- COMMIT:
- PUSH:
