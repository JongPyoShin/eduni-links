# EDUNI Baduk deployment sync report

### DEPLOYMENT-VERDICT
- `PASS` — the live `http://100.75.214.95:8081/baduk` endpoint returned HTTP 200 after the container was rebuilt from `origin/feature/eduni-space-mvp` at `b07074acb3c18508c7c7e96be21767d5aacbb35d`.

### ROOT-CAUSE
The external 8081 address was served by the `eduni-game` Docker container (Docker backend PID 7536), whose image predated the synchronized checkout. A temporary host Python process initially proved the new HTML locally, while the external address still returned the legacy 9x9 page. Rebuilding/recreating only `eduni-game` replaced the stale image; no source feature change was needed.

### SERVER-CHECKOUT
- repo path: `D:\Codex\Worktrees\eduni-space-mvp`
- branch before / after: `feature/eduni-space-mvp` / `feature/eduni-space-mvp`
- HEAD before / after: `c3f43ce5d83d03df4f3934d63687df072fbec0e4` / `b07074acb3c18508c7c7e96be21767d5aacbb35d`
- dirty status before / after: clean before sync; clean after sync (the only later untracked path was temporary runtime logs under `nice-gui-1-1-7/work/`)
- source wiring: `_BADUK_HTML = "eduni_baduk_v2.html"`; v2 page and all three persistence/AI/coach assets present.

### PORT-8081
- old owner: Docker backend PID 7536 forwarding `100.75.214.95:8081` to `eduni-game:8080`; container `8e9412826f76`, image created before sync.
- new owner: Docker backend PID 7536 forwarding the recreated `eduni-game` container `21a8d013e1e2`; container process PID 21226, command `python app.py`.
- host binding: `100.75.214.95:8081 -> 0.0.0.0:8080`; container environment `EDUNI_HOST=0.0.0.0`, `PORT=8080`.
- only `eduni-game` was rebuilt/recreated. The temporary host verification process PID 12740 was stopped afterward.

### BADUK-RUNTIME-EVIDENCE
- live external HTML: HTTP 200, 46,580 bytes.
- 9x9: present (`초급 · 9×9`).
- 13x13: present (`중급 · 13×13`).
- 19x19: present (`정규 · 19×19`).
- realtime coach: present (`실시간 바둑 코치`).
- save/resume runtime: inline `localStorage` code present; headed Chrome reload restored a two-move game.
- legacy-only signature `9×9 입문 바둑 · 흑이 먼저 둬요`: absent.
- container-internal route checks: `/baduk`, `/portal`, and `/bubble-shooter` each returned HTTP 200.

### LIVE-BROWSER-QA
- Headed Chrome opened `http://100.75.214.95:8081/baduk` and visibly showed the v2 level selector, AI/local mode controls, realtime coach, and action buttons.
- Selected 13x13: canvas `aria-label` became `13×13 바둑판`.
- Selected 19x19: canvas `aria-label` became `19×19 바둑판`.
- Switched back to 9x9: canvas `aria-label` became `9×9 바둑판`.
- Made a legal center move with coach enabled, confirmed `여기에 두기`, and observed AI response; visible `진행 수` became 2 and the AI explanation card appeared.
- Reloaded the page; the visible game restored with `진행 수` 2, proving save/resume behavior.

### TESTS
- Python focused unittest command: 17 tests ran; 15 passed, 1 failure and 1 error. The failure is an existing source-expectation mismatch for `integrate_v2_coach(...)`; the error is the Windows cp949 decoding failure while the test launches Node (`UnicodeDecodeError`), not a live deployment failure.
- Node focused suites: 35 passed, 0 failed.
- `python scripts/validate_content.py`: `VALID: 1 enabled activities`.
- Live route checks: external `/baduk`, `/portal`, `/bubble-shooter` HTTP 200; all required Baduk signatures present on `/baduk`.

### CHANGES-MADE
- Deployment/runtime only: fetched and fast-forwarded `feature/eduni-space-mvp`, rebuilt/recreated the `eduni-game` container, and stopped the temporary host verification process.
- Source code changes: `NONE`.
- Added this report: `REPORT_EDUNI_BADUK_DEPLOY_SYNC_15.md`.

### REMAINING-RISKS
- The Python unittest command still has the pre-existing cp949 subprocess issue and one stale assertion; Node tests and live headed-browser checks pass.
- The compose service is configured with `restart: unless-stopped`; future startup automation must continue using `D:\Codex\Worktrees\eduni-space-mvp` (the compose label records this path) to avoid rebuilding from another clone.
