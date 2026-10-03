# Reading parent tools production deployment

Date: 2026-10-03. User explicitly approved deployment after first-release verification.

Verdict: **EDUNI READING PARENT TOOLS DEPLOY PASS — REAL-DEVICE ACCEPTANCE PENDING**.

## Scope and cause

Verified feature code was not yet present in the running app image. Deploy product `25fbeaa5d1353c66541f8ba359bf11ffb52d8c42` from the clean existing `feature/eduni-ai-companion` worktree. No product edits, branch merge, PR, dependency change or DB migration during deployment.

Independent read-only deployment review confirmed the delta from the prior runtime product `7f308961e448c9a055473fd2d740b5a741716ab5` contains only verified reading product/tests and docs. Compose/Dockerfile/bridge are unchanged.

## Preservation and rollback

- Compose project `eduni-space-mvp`; only `eduni-game` recreated with `up -d --no-deps --build eduni-game`.
- Existing ignored PostgreSQL `.env` and separate ignored `.env.companion` reused. In-memory comparison confirmed old/new PostgreSQL password and bridge key equal, without printing values. No credential change or commit.
- `eduni-space-mvp_eduni_data` remains mounted at `/data`; `eduni-space-mvp_eduni_postgres_data` unchanged.
- PostgreSQL container ID `c52cbca3028ef900ecedc132b6f2e35bcf73518b6b3f79bfb7a056a9ea176ebc` and start time `2026-09-26T03:05:57.299069868Z` unchanged; healthy; host port bindings `{}`.
- EDUNI bindings remain `100.75.214.95:8081` and `127.0.0.1:8081` → container `18081`.
- Backup directory outside Git: `D:/Codex/Backups/eduni-reading-parent-20261003`: SQLite online backup (20,480 bytes), full app `/data` copy, PostgreSQL custom-format dump (3,675 bytes).
- Previous image `sha256:239d9ff91b7fdb8a40246c681db33738bc8addd150188d91c0c5b88e2e72f8e5` retained as `eduni-rollback:pre-reading-parent-20261003`.
- New app image `sha256:29fcbaba2536ce5a440e677e194e584e98f5848d8b608652bec14e7ef92ee7c6`; new container `32310c9324e7c77cb228ce00a75dac970b10a71aa623f1c004c16901e004819f`; healthy.
- Normal rollback requires retagging the retained old image as `eduni-space-mvp-eduni-game:latest`, then the same project/env Compose `up -d --no-deps --no-build eduni-game`. Do not remove volumes or restore backups over live data. No rollback was needed or executed.
- Host 8080 was not queried, connected, bound, stopped or killed. Other projects, Nextcloud, unrelated PostgreSQL resources, Tailscale configuration and Windows bridge process were untouched. No prune/down/volume deletion used.

## Actual production verification

HTTPS origin: `https://k12.tail8b64d5.ts.net:8443`.

- `/healthz`, `/portal`, `/reading`, `/reading/api/health`, `/reading/api/insights`, `/ai/health`, `/bubble`, `/bubble-shooter`, `/baduk`, `/omok`, `/sudoku`: all HTTP 200.
- Reading health: `{"ok":true,"storage":"postgresql"}`. Insights returned recorded count 0 and insufficient-data status, consistent with the existing database before deployment. No production synthetic record/image saved.
- Direct `http://100.75.214.95:8081/healthz`: 200.
- Public bibliographic query for `The Very Hungry Caterpillar`: cover search 200, five candidates; selected-cover download 200, 9,009-byte JPEG. Query and download only; no record creation.
- Hashes of deployed `reading_covers.py`, `reading_journal.py`, journal HTML and unchanged companion JS match the verified checkout exactly.
- App-to-existing-Windows-bridge authentication/connectivity: authenticated empty invalid request rejected 400 before provider invocation, confirming Docker-to-bridge reachability and existing key acceptance. This is not a new ChatGPT inference/voice test; no private child data or questions were sent.
- Before/after SQLite integrity `ok`; child_profile 1, activity_session 0, process_badge_event 0, parent_settings 0. Reading records 0 before/after. Reading media files 0 before/after, empty inventory digest identical.
- Runtime `Traceback|ERROR|Exception` marker scan: zero after route/provider checks.
- Actual top-level headed Chrome on production HTTPS: new publisher search controls, disclosure, parent panel, source cards and empty-data message visible. CSS 360×800 verified from `innerWidth/innerHeight`; horizontal overflow false. Temporary viewport override reset; live reading tab left open.
- Local screenshot evidence: mobile emulated region `C:/Users/GMK/.browser-control/artifacts/screenshot/2026-10-03/screenshot-1791032903757-95a7a9e25a7e.png`; default-size production panel `C:/Users/GMK/.browser-control/artifacts/screenshot/2026-10-03/screenshot-1791032985178-2352d5a5762d.png`. Browser capture pixel size is not used to infer CSS viewport dimensions.

Prior implementation acceptance remains: 233 Python tests, zero failures/one environment-gated skip; skipped PostgreSQL test separately executed and passed, >200-record PostgreSQL aggregate checks passed, three executable JS checks passed. Those tests were not unnecessarily rerun against production.

## Remaining limitations

Real phone/tablet touch/camera acceptance is pending. Open Library Korean coverage/edition accuracy is not guaranteed; NAVER integration is not enabled. Parent educational cards are dated curated material, not realtime web research or an LLM diagnosis. Existing multi-client edit conflicts and bridge OS-reboot autostart remain separate inherited limitations.

This report is the only file changed after deployment. It is committed/pushed on the feature branch without merge.
