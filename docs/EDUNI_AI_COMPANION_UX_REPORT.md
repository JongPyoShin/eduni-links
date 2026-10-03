# AI companion interaction polish

Date: 2026-10-03 (Asia/Seoul). Branch: `feature/eduni-ai-companion`.

## Cause and change

- Quick-question handlers previously filled/focused the textarea without sending. They now invoke the existing send path directly, retaining busy, request-generation and current-screen guards.
- Recognition results and panel opening previously focused the textarea and could trigger the mobile keyboard. Automatic input focus is removed; voice text still requires explicit review/send.
- The long notice and guardian acknowledgment occupied most of the panel. The user explicitly requested checkbox removal; the checkbox was an acknowledgment, not authentication. The supervised-trial/privacy disclosure remains in collapsed details; server Origin and transport protections remain unchanged.
- The mobile panel is capped at 58dvh, with a prominent titled answer card, compact input and busy status/spinner. Error, close and stale-context paths clear the waiting answer.
- Both provider prompts specify the intended 7-year-old boy audience without gender stereotypes, easy Korean and short steps, unsafe-content refusal, trusted-adult escalation and untrusted-screen handling. Prompt instructions are not a complete safety filter or clearance for independent child use.

## Verification

- Full Python suite: 225 tests, zero failures, one dedicated PostgreSQL integration test skipped. Content validator, JavaScript syntax and diff checks PASS.
- Node widget tests prove immediate chip send, fresh context, duplicate/busy guard, generation cancellation and 503/network error state cleanup. Independent screen-context fixture also executes a synthetic voice result and proves no textarea focus and no late-recognition overwrite after context change.
- Real headed Chrome, isolated UI preview: panel opening left focus on the launcher button; notice initially collapsed and guardian checkbox absent. At 360×800 the panel measured about 412px (52% of viewport), with visible answer card and no horizontal overflow; mobile screenshot succeeded. This does not prove real-device speech recognition, OS keyboard behavior, or unsupported-browser voice availability.
- Review caught a stale waiting-card message after request failure; corrected before rollout.

## Rollout and scope

Existing supervised Tailscale family trial only; no new network exposure, parent authentication, child-data capture, model download or dependencies. Operational rollback image retained as `eduni-rollback:pre-companion-ux-20261003`. SQLite online backup (integrity ok), app data and PostgreSQL custom-format backup retained outside Git at `D:/Codex/Backups/eduni-companion-ux-20261003`.

Rollout: **SUPERVISED TRIAL UX DEPLOY PASS — REAL-DEVICE VOICE/KEYBOARD ACCEPTANCE PENDING**.

- Product commit `7f308961e448c9a055473fd2d740b5a741716ab5`; new image `sha256:239d9ff91b7fdb8a40246c681db33738bc8addd150188d91c0c5b88e2e72f8e5`.
- Rebuilt/recreated only `eduni-game` with the existing project, volumes and unchanged production PostgreSQL password. Restarted only our loopback bridge supervisor to load the updated prompt, reusing its existing key; no new background startup task installed.
- HTTPS health, portal, PostgreSQL reading health, Baduk, Sudoku and both bubble routes returned 200; both scoped containers healthy. Real connected provider rejected a synthetic unsafe/ignore-rules question with a short refusal and trusted-adult guidance. This one example is not a general safety certification.
- Production headed Chrome showed the revised answer card, collapsed notice and no guardian checkbox; screenshot succeeded. Temporary viewport override reset afterward.
- SQLite integrity ok, child_profile count 1 and other three portal tables 0 unchanged; reading_record count 0 unchanged. Runtime error-marker scan zero. No production fake reading data was created.
- A local ignored preview SQLite file was found in the build context; it was left untouched and SQLite runtime files in that data folder were excluded from future Docker builds. No file or credential value was copied into the report.
- Host 8080, other projects, PostgreSQL restart/published ports and volume contents were not changed. Existing pre-UX rollback image and backups remain available.

Refresh `https://k12.tail8b64d5.ts.net:8443/portal` on the Tailscale device to load versioned assets. Browser speech-recognition support/permissions are still prerequisites; this change removes our automatic focus trigger, not every possible OS/browser keyboard behavior. Bridge OS-reboot auto-start remains unconfigured, as recorded in the trial deployment report.

Official safety guidance: https://developers.openai.com/api/docs/guides/safety-checks/under-18-api-guidance . Removing a checkbox and adding an age prompt do not replace the additional privacy/content safeguards required for minors. Continue supervised synthetic-question testing only.
