# EDUNI Production Deploy Report — 50

## Final verdict

**EDUNI PRODUCTION DEPLOY PASS — READING JOURNAL LIVE**

## Git/source gate

- Repository: `JongPyoShin/eduni-links`
- Branch: `feature/eduni-space-mvp`
- Verified product source SHA: `f9dfee796225ba9461d53a9167aca91e5b19a83c`
- Branch HEAD used for deployment: `11d321e5356ad45dfe99d62103732ea3ed5a219c`
- Remote branch HEAD before report commit: `43641c97c90f8766826546597ab960e1be2242da`
- Commits after the verified product source add only `.agent/PROMPT_EDUNI_PRODUCTION_DEPLOY_50.md` and `.agent/PROMPT_EDUNI_PRODUCTION_DEPLOY_RESUME_50B.md`; both are documentation-only. The remote advanced to 50B during this task, and the worktree was fast-forwarded before report commit. No product code changed after deployment.
- Clean source worktree; `git diff --check` passed before deployment.

## Initial BLOCKED attempt and secret setup

The first attempt stopped safely before deployment because there was no production PostgreSQL password. The follow-up instruction explicitly authorized first-time local secret creation.

- Confirmed `.env` is ignored by `.gitignore` (`git check-ignore` passed).
- `.env` was absent, so a 32-byte cryptographically secure random value was generated and stored as a 64-character hex `EDUNI_POSTGRES_PASSWORD` in the ignored root `.env`.
- The local `.env` ACL was restricted to the current user, SYSTEM, and Administrators.
- Only non-empty/format checks were emitted. The secret was never printed, logged, reported, committed, or sent to chat.
- Production `docker compose -p eduni-space-mvp config --format json` passed using `.env`; output was captured and only non-secret contract checks were printed.

## Static Compose contract

- EDUNI mapping: host `100.75.214.95:8081` -> container `18081`.
- Container healthcheck: `http://127.0.0.1:18081/healthz`.
- Reading paths: SQLite `/data/eduni_portal.sqlite3`; files `/data/reading-journal`.
- PostgreSQL endpoint: Compose service `eduni-postgres`, internal port `5432`.
- PostgreSQL has no host-published port; rendered configuration contains no standalone host-port 8080 reference.
- Compose project identity: `eduni-space-mvp`.

## Previous runtime, volumes, and backups

- Docker context: `desktop-linux`.
- Previous runtime: Docker Compose project `eduni-space-mvp`.
- Previous `eduni-game`: healthy; container `a722c1003c32c94b7bfbfaa1efe01dd6ae308d90c052261d846dc2f88e6a4856`; image `eduni-space-mvp-eduni-game`, image ID `sha256:5c903e1e587fbb950033cde7bac458a569a9cc71889f5c0a8e809688aee845db`.
- Previous host publication: `100.75.214.95:8081` -> container `18081`; listener was `com.docker.backend.exe`. No process was stopped.
- Existing app volume: `eduni-space-mvp_eduni_data` at `/data`; same named volume was reused.
- Before deployment, no `eduni-postgres` container or `eduni-space-mvp_eduni_postgres_data` volume existed. This was the authorized first PostgreSQL initialization.
- Protected backup location outside Git: `D:\Codex\Backups\eduni-production-deploy-50-20260926T030314Z`.
- Original app volume backup: 23 files / 467,554 bytes. Predeploy copy after SQLite migration: 24 files / 488,034 bytes.
- Existing container-layer `/app/data/eduni_portal.sqlite3`: 20,480 bytes. A raw copy and a SQLite online-backup snapshot were saved; snapshot integrity was `ok`, size 20,480 bytes. Legacy `/app/data` contained one file / 20,480 bytes.
- No existing PostgreSQL database/volume existed to back up.
- No cover files existed before deployment. No production Reading Journal record was created.

## SQLite and existing-data preservation

The old portal SQLite database was in the previous container writable layer at `/app/data/eduni_portal.sqlite3`, not in the named `/data` volume. Before recreating the container, it was backed up consistently and copied into the existing `eduni-space-mvp_eduni_data` volume at `/data/eduni_portal.sqlite3`; the destination had been confirmed absent before the copy.

- Predeploy SQLite snapshot: integrity `ok`; `child_profile=0`, `activity_session=0`, and no `reading_record` table.
- Postdeploy SQLite: present, 20,480 bytes, integrity `ok`; `activity_session=0`.
- The approved first GET of `/reading/api/records` exercised existing lazy default-profile initialization, so `child_profile` is now 1 (`EDUNI learner`). There were no pre-existing child profiles to lose. No activity session or fake reading record was created.
- Existing Hanja data remained on the same app volume; all 23 predeploy Hanja files matched postdeploy SHA-256 (`23/23`).
- `/data/reading-journal/covers` exists and is writable; it contains 0 files. No previous Reading Journal cover files were found.
- The newly initialized PostgreSQL `public.reading_record` schema exists and is empty (`0` rows), as expected for first-time PostgreSQL deployment.

## Deployment and runtime health

Command used, scoped to the existing Compose project and the two EDUNI services only:

```powershell
docker compose -p eduni-space-mvp up -d --build eduni-postgres eduni-game
```

- Image build passed. New `eduni-game` image ID: `sha256:03068fa03021965bd54395f1ca5928f67903f02e66fa0eb6879dc6cb7042ed3f`.
- `eduni-postgres`: running/healthy; container `c52cbca3028ef900ecedc132b6f2e35bcf73518b6b3f79bfb7a056a9ea176ebc`; volume `eduni-space-mvp_eduni_postgres_data` at `/var/lib/postgresql/data`.
- `eduni-game`: running/healthy; container `1c493c3a6ca99212a62313d07551b5a581f02bed90c37fbca37b41b0b0074a91`; existing volume `eduni-space-mvp_eduni_data` at `/data`.
- Runtime port inspection: `18081/tcp` published only as `100.75.214.95:8081`; PostgreSQL `5432/tcp` is not published to the host.
- Scoped logs: 57 lines examined; 0 traceback/critical/fatal matches and 0 error/exception/start-failure matches.

## Production acceptance on host 8081

| Route | Result |
|---|---|
| `/healthz` | HTTP 200 |
| `/portal` | HTTP 200 |
| `/reading` | HTTP 200 |
| `/reading/api/health` | HTTP 200; `ok=true`, storage `postgresql` |
| `/ai/health` | HTTP 200; provider `disabled`, `configured=false` |
| `/bubble` | HTTP 200 |
| `/bubble-shooter` | HTTP 200 |
| `GET /reading/api/records` | HTTP 200; total 0, page count 0; no fake record created |

## Safety and cleanup

- Host 8080 was never queried, contacted, bound, stopped, or killed; no request was sent to it. Only rendered Compose text was statically checked for a standalone 8080 reference.
- Production host 8081 was inspected for ownership before deploy and used for the requested acceptance routes after deployment.
- `start_eduni_services.ps1` and `watch_eduni_services.ps1` were not executed.
- Only `eduni-postgres` and `eduni-game` were started/recreated through Compose. No unrelated container, volume, or PostgreSQL resource was touched.
- No prune, `down -v`, manual table edit, or destructive data operation was run.
- The ignored `.env` is not part of Git changes. The only intended Git change is this deployment report.
- Backups remain at the recorded location for rollback readiness.

## Live path

`http://100.75.214.95:8081/reading`
