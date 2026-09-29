# EDUNI Jungle Runtime Reliability Report 39B (Luna)

Verdict: `JUNGLE RELIABILITY PASS — READY FOR INDEPENDENT VERIFY`

## Proven findings

- **World-map controller lock — PROVEN.** `pressA()` advanced the stage, opened the world map, and then left `stageInputLock=18`; `update()` returned before decrementing it while `handleMotion()` rejected analog/HAT input. The world-map branch now decrements the lock before returning, so the lock expires and controller navigation resumes. D-pad key-up remains consumed and key-down is routed once through `JungleWorldMapInput`.
- **Duplicate/stale quiz requests — PROVEN.** Repeated interaction could start more than one acquisition, and callbacks had no session ownership. `JungleQuizRequestGuard` accepts one in-flight token, rejects duplicates, and invalidates old responses on reset, stage change, pause, or destroy. The callback completes only its matching token and checks the active runtime state before mutating UI state.
- **Pause/exit — PROVEN.** `onPause()` removes the tick callback, invalidates quiz requests, and clears movement; `onDestroy()` now destroys the loop owner and releases tone resources. `JungleLoopGuard` prevents duplicate resume loops and rejects resume after destroy.
- **World-map recursion suspicion — NOT PRESENT in the reachable path.** The current `stageSelectMoveFromKey()` declaration has no self-call; its only source occurrence is the declaration, and dispatch uses `handleKey()` → `JungleWorldMapInput`/`eduniWorldMapKeyV20_8()`. No recursive callsite remains.
- **Duplicated routing — FIXED narrowly.** Repeated `showStageSelect` branches in `nav()` were reduced to the active world-map path. Dispatch, key-down, and key-up now share the guarded `handleKey()` route.
- **Mutable network-event state — PROVEN.** Worker threads previously read `mode`, counters, coordinates, selection, and `quiz` after the initiating event. Both progress and quiz events now snapshot their payload fields on the UI thread before starting network I/O; quiz payloads remain valid even after `quiz=null`.

## Implementation

Changed Jungle-only code:

- `NativeJungleActivity.java`
- `JungleLoopGuard.java`
- `JungleQuizRequestGuard.java`
- `JungleWorldMapInput.java`
- `JungleRuntimeReliabilityTest.java`

The helpers are package-private, dependency-free, and only own loop, request-token, and exactly-once key state. Gameplay, persistence, visuals, movement physics, quiz fallback, and API contracts were not redesigned.

## Stress and regression

- Quiz/session: **500/500** deterministic transitions; 333 valid responses accepted, stale/duplicate responses rejected, no in-flight leak.
- Lifecycle: **200/200** resume/pause/stop sequences; no more than one logical loop and no loop after destroy.
- Input: **100/100** repeated press/release sequences; exactly one movement per intended press, repeats and key-up consumed.
- `python scripts/validate_content.py`: PASS (`VALID: 1 enabled activities`).
- `python -m unittest discover -s tests`: PASS, **204 tests**, 1 skipped.
- `git diff --check`: PASS.

## Android validation

- `gradlew.bat --no-daemon testDebugUnitTest`: PASS (`BUILD SUCCESSFUL`, 21 actionable tasks).
- `gradlew.bat --no-daemon assembleDebug`: PASS (`BUILD SUCCESSFUL`, 31 actionable tasks).
- SDK was found read-only at `%LOCALAPPDATA%\Android\Sdk` and supplied only as temporary `ANDROID_HOME`/`ANDROID_SDK_ROOT` values for the current PowerShell process; no `local.properties` or system setting was created.
- No emulator or physical-device/ADB claim was made.

## Compatibility and remaining risks

Stages, progression unlocks, movement/collision behavior, rewards, SharedPreferences schema, visuals/assets, and network endpoint contracts remain unchanged. Remaining risk is physical-device/ADB behavior, which was not exercised; the independent verifier should repeat the deterministic guards and build checks.
