# EDUNI AI Companion — supervised family trial deployment

Date: 2026-10-03 (Asia/Seoul).

User authorized production deployment, confirmed mobile devices use Tailscale, and explicitly selected no additional parent PIN. This is a supervised family trial, not clearance for independent child use or under-13 personal-data processing. Existing notice and disabled-by-default configuration remain. Screen text/questions go to OpenAI; private information must not be entered.

## Scope and preflight

- Source branch: `feature/eduni-ai-companion`; previous verified feature commit `0d4f665511d764779aa238e42d779a79ea258bd1`.
- Existing production source: `a00829fb87b9b3d18418f91e68ea0f4157e8d4d3`, an ancestor of the feature.
- Existing Compose project: `eduni-space-mvp`; recreate only `eduni-game`, leave `eduni-postgres` running.
- Existing app and PostgreSQL volumes: `eduni-space-mvp_eduni_data` and `eduni-space-mvp_eduni_postgres_data`.
- PostgreSQL has no host port. Existing production password is nonempty and remains in its original ignored `.env`, unchanged.
- Old app image: `sha256:4369b7927500c9367cef7482a235100f7aada9522fbae64a733524ae945ca0f4`, retained as `eduni-rollback:pre-companion-20261003`.
- Backups outside Git: `D:/Codex/Backups/eduni-companion-20261003/`: SQLite online backup (integrity `ok`), app `/data` copy, PostgreSQL custom-format dump.
- Predeployment SQLite row counts: child_profile 1; activity_session/process_badge_event/parent_settings 0. Reading records 0.
- Docker Desktop can reach the Windows loopback listener through `host.docker.internal`; no LAN/public bridge bind is needed. Credentials remain Windows DPAPI-protected; only a separate app-to-bridge shared key is supplied to the app.
- Existing tailnet HTTPS listener 8443 pointed to loopback 8081 but the app only published on its Tailscale IP; add loopback publication for this same app port, preserving the existing Tailscale IP publication.
- No host 8080 connection, bind, process query, stop or kill. Reading global Tailscale configuration incidentally showed an unrelated listener, which was not acted upon. Other services/listeners remain unchanged.

## Acceptance

Verdict: **SUPERVISED FAMILY TRIAL DEPLOY PASS — MOBILE VOICE ACCEPTANCE PENDING**.

- Deployed product commit: `1e129e7edbbc0f96a8e605751df1ba5038c4dc3a`. No branch merge or PR was performed.
- New app image: `sha256:31a6435e66709827b2c8e428fdb93fe0ef290d6728cd7fb58414083f71be8b0b`.
- Recreated only `eduni-game` using Compose `up -d --no-deps --build eduni-game`, existing project and original PostgreSQL secret file plus separate ignored `.env.companion`. Both scoped containers are healthy. PostgreSQL was not restarted.
- HTTPS route checks: `/healthz`, `/portal`, `/reading`, `/reading/api/health`, `/ai/health`, `/bubble`, `/bubble-shooter`, `/baduk`, `/omok`, `/sudoku` all HTTP 200. Reading health returned `{"ok":true,"storage":"postgresql"}`.
- Actual HTTPS app → loopback Windows bridge → connected ChatGPT synthetic HTTP test returned 200: “지금은 **9줄 바둑판**이고, **흑돌 차례**야.” Wrong Origin rejected with 403. This HTTP test used explicitly constructed synthetic context; the default widget projection was independently exercised in the previous local-browser verification, not conflated with this HTTP test.
- Real top-level headed Chrome opened the production HTTPS portal and AI panel, displayed the current-screen label and supervised-trial notice; a desktop screenshot succeeded. No microphone permissions or real child data were used. Device voice quality and full mobile acceptance remain unverified.
- Full Python suite: 224 tests, no failures, one dedicated PostgreSQL integration test skipped. Content validator, Node current-screen regression, Python compilation and diff checks PASS.
- Independent review identified missing HTTPS Origin forwarding and secret-containing Docker build context risk; both were fixed before build. Final read-only review found no remaining must-fix. `.dockerignore` excludes both local env files.
- Postdeployment SQLite integrity `ok` and all recorded table counts identical; Reading count remains zero. Existing app/PG volume names unchanged, PostgreSQL host port remains absent. Original PostgreSQL `.env` size and modification time unchanged. No production fake record/image was created. Runtime error-marker scan found zero Traceback/ERROR/Exception entries.
- Companion shared key is cryptographically generated, separate from the PostgreSQL secret, ignored by Git, excluded from image build context, and its local file ACL restricted to the current user/SYSTEM/Administrators. No credential values were printed or committed.

## Runtime and rollback

Family URL: `https://k12.tail8b64d5.ts.net:8443/portal` (Tailscale required, not public Internet). Use HTTPS for companion chat; configured Origin intentionally rejects direct HTTP chat requests. Existing HTTP game routes remain available.

The host bridge is currently supervised by the execution session. It runs on `127.0.0.1:8765`, not the LAN/Tailscale interface. OS-reboot auto-start and auto-recovery were **not** installed. After a PC reboot or supervisor exit, the AI connection must be restarted on this Windows account:

```powershell
cd D:/Codex/Worktrees/eduni-ai-companion/nice-gui-1-1-7
python -m scripts.run_companion_bridge --supervised --origin https://k12.tail8b64d5.ts.net:8443
```

This reuses the existing companion key; keep the launcher running. It never starts Compose or replaces the production PostgreSQL password. A missing bridge returns a bounded unavailable response rather than changing data. A hidden background launch was rejected by execution policy; no policy-bypass startup workaround was installed.

Rollback image and backups remain intact. If needed, retag `eduni-rollback:pre-companion-20261003` to `eduni-space-mvp-eduni-game:latest`, then use the unchanged original `D:/Codex/Worktrees/eduni-sudoku-kids/docker-compose.yml` with the original PostgreSQL env file and `up -d --no-deps --no-build eduni-game`. Do not recreate PostgreSQL, remove volumes or restore over live data. The original Compose lacks loopback publication, so its prior HTTPS proxy limitation would also return; this is recorded, not silently treated as healthy rollback HTTPS.
