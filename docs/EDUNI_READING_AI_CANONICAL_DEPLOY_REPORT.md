# Reading AI / canonical HTTPS production verification

Date: 2026-10-04. Verdict: **EDUNI READING AI CANONICAL DEPLOY PASS — REAL-DEVICE VOICE ACCEPTANCE PENDING**.

## Deployed change

Product commit `18ae920cf1d0ce005988c3cc3dacf6a592505e6f`, branch `feature/eduni-ai-companion`. Reading had omitted the companion widget and activity allowlists. Shared widget injection, privacy-safe generic reading context and exact legacy-browser HTTPS redirect are now deployed. Parent summaries are still local statistics, not LLM analysis of stored records.

Canonical browser entry: `https://k12.tail8b64d5.ts.net:8443`; reading: `https://k12.tail8b64d5.ts.net:8443/reading`. Legacy HTTP document navigation automatically redirects. Health/data APIs retain their existing behavior for service compatibility.

## Preservation and rollout

- Only existing Compose project `eduni-space-mvp` app service `eduni-game` rebuilt/recreated with `up -d --no-deps --build eduni-game`; PostgreSQL not restarted.
- Existing app volume `eduni-space-mvp_eduni_data` and PG volume `eduni-space-mvp_eduni_postgres_data` reused. Both preflight mounts checked. Existing ignored environment files reused; app PG password, bridge key and HTTPS Origin compared in memory and unchanged; values never printed or committed.
- Backup outside Git: `D:/Codex/Backups/eduni-reading-ai-canonical-20261004`: online SQLite backup 20,480 bytes, full app data copy, PG custom dump 3,675 bytes; dump list verified.
- Previous image `sha256:29fcbaba2536ce5a440e677e194e584e98f5848d8b608652bec14e7ef92ee7c6` retained as `eduni-rollback:pre-reading-ai-canonical-20261004`.
- New app image `sha256:92d58c435b0b47676221459ca4535d43073164cd1ce9065115cb4b37dc5f1fc9`, container `7392934e79e9d86b82f0865a5d80eea9503a1c6bbfe6d4a9af395fea5e4640af`, healthy.
- Existing owned supervised Windows bridge stopped through its own launcher session and restarted with the same Origin/key/encrypted credentials to load the `reading` allowlist. Loopback remains `127.0.0.1:8765`; no new public exposure, credential/model/security-setting change.
- PG container `c52cbca3028ef900ecedc132b6f2e35bcf73518b6b3f79bfb7a056a9ea176ebc`, start `2026-09-26T03:05:57.299069868Z` unchanged; healthy; host bindings empty.
- Host 8080 not queried/connected/bound/stopped/killed. Other containers/projects, TLS/Tailscale settings untouched. No prune, down, volume removal, schema change or synthetic production record.

## Live proof

- HTTPS `/healthz`, `/portal`, `/reading`, `/reading/api/health`, `/reading/api/insights`, `/ai/health`, `/bubble`, `/bubble-shooter`, `/baduk`, `/omok`, `/sudoku`: HTTP 200. Reading health `{ok:true, storage:postgresql}`.
- Legacy HTTP `/reading?view=books` with HTML navigation returns 307 to the exact canonical HTTPS path/query; direct HTTP health remains 200. Real headed top-level Chrome entered the old HTTP reading URL and landed on canonical HTTPS, without a loop.
- Reading HTML contains exactly one versioned companion JS tag; widget opens with reading-specific questions and the generic reading label. Actual Chrome CSS 360x800: one widget, no horizontal overflow, usable panel. Default viewport reset afterward; canonical reading tab left open.
- Actual production HTTPS companion route and existing authenticated Windows ChatGPT bridge returned HTTP 200 with a meaningful answer to one nonpersonal synthetic question about writing a reading note. No saved record, title, private note or photo supplied. UI Send/voice was not used for this inference check; actual HTTP provider response and separate browser rendering were verified.
- Deployed hashes of companion backend, reading route and companion JS match product checkout.
- SQLite integrity `ok`; child_profile 1, activity_session 0, process_badge_event 0, parent_settings 0 before/after. Reading records 0, media files 0; inventory digest unchanged. Production runtime error marker scan (`Traceback|ERROR|Exception`): zero.
- Screenshots outside Git: default panel `C:/Users/GMK/.browser-control/artifacts/screenshot/2026-10-04/screenshot-1791074396484-42c1e8acdb8f.png`; mobile panel `C:/Users/GMK/.browser-control/artifacts/screenshot/2026-10-04/screenshot-1791074413250-47d3e768acf7.png`. CSS viewport dimensions were read directly, not inferred from screenshot pixels.

## Rollback / remaining limits

No rollback needed. Retag the retained image to `eduni-space-mvp-eduni-game:latest` and recreate only the app with the same project/env files and `--no-deps --no-build` if required; never delete volumes or overwrite live data. Existing bridge credentials/key remain compatible.

Implementation verification: 237 Python tests with one environment-gated skip; four JS checks, focused 27 tests, actual isolated fake-provider HTTP/privacy and independent adversarial review passed (see implementation report for intermediate environment-only failures). Phone/tablet microphone permission and speech support are not certified by desktop emulation. Saved-reading LLM analysis, browser voice and bridge reboot autostart remain separate work.

Only this documentation file changed after deployment; report committed/pushed without merge or PR creation.
