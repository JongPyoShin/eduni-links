# EDUNI Native Jungle Runtime Reliability Report 39B

## Verdict

`PARTIAL PASS — CRITICAL RACES FIXED`

Critical Jungle runtime races found in the 39B scope were fixed and covered by deterministic pure-Java/source-wiring tests. Full Android Gradle execution is still required before merge because the current execution environment cannot reach GitHub/Gradle dependencies.

## Branch / PR

- Branch: `feature/jungle-runtime-reliability-hardening`
- Base: `feature/eduni-space-mvp`
- Base SHA: `5b23ec1ba0d06d726453269a01f39fa5937abb46`
- Product/test HEAD before report docs: `409d326821e1820550efe9febec303a76371bac6`
- Draft PR: #68

## Findings

| Area | Classification | Evidence | Resolution |
| --- | --- | --- | --- |
| Repeated A during non-Camp quiz fetch | PROVEN | `catchBird()` previously started a new `Thread(fetchQuiz)` on every A while `mode` remained FIELD | `JungleQuizRequestGuard.tryBegin()` permits one in-flight request |
| Late quiz response after reset/stage/world-map/pause | PROVEN | old `main.post` unconditionally assigned `quiz` and `mode=QUIZ` | token ownership + invalidation on pause/reset/world-map/stage completion/stage reset/advance/final exit |
| Old response clearing newer request | PROVEN hazard class | a naive boolean guard could be cleared by an old callback | token-specific `completeIfCurrent()` rejects old token without clearing current ownership |
| Handler duplicate loop on repeated resume | NOT PRESENT | existing `resume()` removes `tick` before posting; `tick` reposts only when `running` | preserved; added explicit destroy cleanup |
| Activity destroy cleanup | PLAUSIBLE gap | no explicit `onDestroy`/handler cleanup existed | `Game.destroy()` invalidates requests, removes callbacks/messages, clears input/locomotion, releases tone |
| `stageSelectMoveFromKey()` recursion | NOT REACHABLE, DEAD HAZARD | only occurrences were method definition + its own self-call | dead recursive method removed |
| Duplicate `showStageSelect` branches in `nav()` | PROVEN dead duplication | first branch returned, making two later identical-condition branches unreachable | reduced to one existing owner path |
| Async progress payload reads mutable state | PROVEN | background threads read `quiz/select/stage/mode/counts/position` after caller state could change; correct answer can set `quiz=null` immediately after scheduling | snapshot payload values before starting background thread |

## Implementation

### New helper

`JungleQuizRequestGuard.java`

Small Android-independent request owner:

- one in-flight request
- duplicate start rejected
- epoch invalidation
- exact-once current completion
- stale/duplicate completion rejected
- old completion cannot clear a newer request

### Native Jungle wiring

`NativeJungleActivity.java`

- non-Camp quiz fetch captures a request token and stage
- response applies only when token is current and runtime/stage state is still valid
- pause/reset/world-map/stage transitions invalidate pending request
- stage completion invalidates pending quiz before showing completion UI
- Activity destroy performs explicit cleanup
- dead recursive world-map method removed
- unreachable duplicate `nav()` branches removed
- progress/quiz telemetry values snapshot before background send

## Compatibility preserved

Unchanged:

- 3-stage progression
- unlock/reward persistence schema
- movement speed and locomotion controller
- move-mask/collision behavior
- touch/controller mappings on live paths
- quiz HTTP endpoints and fallback quiz content
- visuals/assets
- server API payload field names

## Tests added

### `JungleQuizRequestGuardTest`

7 tests, including deterministic 500-iteration stress.

Direct pure-Java JDK 21 execution of the same guard semantics:

- transitions: 500
- accepted current responses: 375
- stale/duplicate responses rejected: 500
- leaked in-flight ownership: 0
- result: PASS

### `NativeJungleReliabilityWiringTest`

10 source-wiring tests covering:

- guard ownership
- callback guard-before-mutation ordering
- reset/pause/world-map invalidation
- stage-transition invalidation
- resume single-loop wiring
- destroy cleanup
- dead recursive method absence
- one world-map branch in `nav()`
- existing quiz fetch/fallback/UI contract
- progress and quiz-attempt payload snapshotting

Equivalent latest-source assertions were replayed against the branch: 10/10 conditions satisfied.

## Static validation

Changed Java files:

- lexical brace/paren/bracket balance: PASS 4/4
- trailing whitespace: 0 lines
- PR diff is Jungle-only
- base comparison: behind_by = 0 at implementation review

## Android validation status

Could not execute:

`./gradlew.bat --no-daemon testDebugUnitTest`

`./gradlew.bat --no-daemon assembleDebug`

Reason: the available execution container cannot resolve GitHub/external Gradle network resources and does not contain the Android SDK/project checkout.

This is the remaining merge blocker. No PASS/merge-ready claim is made.

## Changed product/test files

- `eduni-android-portal/app/src/main/java/com/eduni/portal/JungleQuizRequestGuard.java`
- `eduni-android-portal/app/src/main/java/com/eduni/portal/NativeJungleActivity.java`
- `eduni-android-portal/app/src/test/java/com/eduni/portal/JungleQuizRequestGuardTest.java`
- `eduni-android-portal/app/src/test/java/com/eduni/portal/NativeJungleReliabilityWiringTest.java`

## Remaining risks

1. Full Android JVM suite and APK compile have not yet run on this branch.
2. No physical-device validation is available; this task intentionally does not require it.
3. World-map exactly-once behavior is source-path verified, not device-event verified.
