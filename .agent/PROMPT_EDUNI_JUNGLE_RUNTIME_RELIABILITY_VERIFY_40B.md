# EDUNI Native Jungle Runtime Reliability — Independent Verify 40B

## Scope

Verification-only for Draft PR #68.

Repository: `JongPyoShin/eduni-links`

Head: `feature/jungle-runtime-reliability-hardening`

Base: `feature/eduni-space-mvp`

Read:

- root `AGENTS.md`
- `EDUNI_JUNGLE_RUNTIME_RELIABILITY_REPORT_39B.md`
- PR #68 changed files only

Do not implement features.
Do not merge.
Do not deploy.
No physical device is required.

## Hard gates

1. Confirm base `behind_by = 0`.
2. Confirm product/test diff is Jungle-only.
3. Run:
   ```powershell
   cd eduni-android-portal
   .\gradlew.bat --no-daemon testDebugUnitTest
   .\gradlew.bat --no-daemon assembleDebug
   ```
4. Run repository-required content/Python validation and `git diff --check`.
5. Any new regression = FAIL.

## Verify quiz-request race

Independently prove:

- repeated A while one non-Camp quiz request is pending cannot start a second request
- reset invalidates pending response
- world-map transition invalidates pending response
- stage completion/change invalidates pending response
- pause invalidates pending response
- stale response cannot set `mode=QUIZ`
- stale response cannot clear ownership of a newer request
- duplicate completion is rejected

Run `JungleQuizRequestGuardTest` and record exact counts.

## Verify lifecycle

Confirm:

- `resume()` removes existing tick before posting one
- `pause()` clears running and removes tick
- `onDestroy()` calls `Game.destroy()`
- destroy invalidates quiz requests and removes Handler callbacks/messages
- no second recurring tick path was introduced

## Verify world-map input cleanup

Confirm:

- `stageSelectMoveFromKey()` no longer exists
- no call site depends on it
- `nav()` has one `showStageSelect` owner path
- existing `handleKey()/eduniWorldMapConsumeKey()` live routing remains
- controller/touch mapping tests remain green

## Verify async event snapshots

Confirm background network lambdas no longer read mutable live values for:

- mode/screen
- stars/birds/hearts
- player position
- quiz object
- selected index/text
- stage/name

Payload field names and endpoints must be unchanged.

## Compatibility

Confirm unchanged:

- stage count/progression
- unlock/reward persistence
- movement/locomotion constants
- move-mask/collision
- quiz endpoints/fallback content
- visuals/assets
- Bubble/Baduk/Space/Portal
- Docker/production

## Report

Create:

`EDUNI_JUNGLE_RUNTIME_RELIABILITY_VERIFY_REPORT_40B.md`

Include:

- verified SHA
- base SHA
- ahead/behind
- changed files
- JVM exact test totals
- assembleDebug result
- focused Jungle tests
- repository validation totals
- race checks
- lifecycle checks
- input checks
- compatibility
- remaining risks

Final verdict exactly one:

- `JUNGLE RELIABILITY VERIFY PASS — MERGE READY`
- `JUNGLE RELIABILITY VERIFY FAIL`
- `BLOCKED`

If PASS, recommendation:

`MERGE`

Do not merge.
Do not deploy.
