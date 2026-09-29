# Prompt 40B — Native Jungle Luna verification-only

Verify the Luna branch `feature/jungle-runtime-luna` against `origin/feature/eduni-space-mvp` without editing product code, tests, or reports.

1. Confirm `git merge-base --is-ancestor origin/feature/eduni-space-mvp HEAD` and report `behind_by=0` relative to the current base.
2. Independently inspect the stage-completion → world-map transition. Prove that `stageInputLock` expires while the world map is active and that analog/HAT selection is no longer permanently rejected.
3. Independently exercise `JungleQuizRequestGuard`: duplicate request rejection, matching response exactly once, stale response rejection after reset/stage/pause invalidation, and old response inability to clear a newer request.
4. Independently exercise `JungleLoopGuard`: 200 deterministic resume/pause/stop sequences, at most one logical loop, and no resume after destroy.
5. Independently exercise `JungleWorldMapInput`: 100 fixed press/release sequences, exactly one move per intended press, key-up consumed, repeats consumed, and no field-action leakage.
6. Search all `stageSelectMoveFromKey` callsites and prove there is no reachable recursive self-call. Check `nav()` and dispatch/key-up routing for duplicate movement.
7. Verify that progress and quiz payload values are captured before worker-thread network I/O and before `quiz` can be cleared.
8. Run, where an Android SDK is available:

   - `eduni-android-portal\gradlew.bat --no-daemon testDebugUnitTest`
   - `eduni-android-portal\gradlew.bat --no-daemon assembleDebug`
   - `nice-gui-1-1-7\python scripts/validate_content.py`
   - `nice-gui-1-1-7\python -m unittest discover -s tests`
   - `git diff --check`

9. Confirm the diff is Jungle-only plus this report and prompt; no Bubble Shooter, Baduk, Space, Portal, production, Docker, or unrelated Android changes. Do not merge, deploy, or install to a device.

The prior SDK blocker was resolved without modifying repository configuration: `%LOCALAPPDATA%\Android\Sdk` was used only through temporary PowerShell environment variables, and both Gradle commands completed successfully. Independently confirm those results.
