# EDUNI Production Deploy — Resume 50B

## Mission

Resume the production deployment that was safely BLOCKED in Deploy 50 because no
production PostgreSQL password existed yet.

Repository: JongPyoShin/eduni-links
Branch: feature/eduni-space-mvp

Verified product source:

`f9dfee796225ba9461d53a9167aca91e5b19a83c`

The current branch may contain documentation-only descendants such as Deploy 50
instructions. Re-check exact refs before acting.

User has explicitly approved production deployment.

## Current known production state

From the blocked Deploy 50 attempt:

- existing `eduni-game` was healthy
- Compose project = `eduni-space-mvp`
- existing application data volume = `eduni-space-mvp_eduni_data`
- no existing `eduni-postgres` container was found
- no existing PostgreSQL volume for this Compose project was found
- production PostgreSQL password was not configured
- no image build, container replacement, backup, or HTTP acceptance was performed
- host 8080 was untouched
- rollback was not required

This means PostgreSQL production storage is being initialized for the first time.

## Non-negotiable safety

Host port 8080 belongs to another project.

Never:

- query host port 8080
- connect to host port 8080
- bind host port 8080
- stop host port 8080
- kill its owner
- run any script that may touch host 8080

Do not run:

- `nice-gui-1-1-7/scripts/start_eduni_services.ps1`
- `nice-gui-1-1-7/scripts/watch_eduni_services.ps1`
- `docker compose down -v`
- `docker system prune`
- `docker volume prune`

Do not touch:

- Nextcloud
- `codex-uv-lock-pg`
- `flopi-pr87-pg-20260911`
- unrelated Docker containers/networks/volumes
- unrelated PostgreSQL resources

Only EDUNI production resources may be changed.

## 1. Git/source gate

Fetch safely and record exact refs.

Confirm:

- `feature/eduni-space-mvp` contains
  `f9dfee796225ba9461d53a9167aca91e5b19a83c`
- all commits after that verified product source are documentation-only or otherwise
  explicitly verified
- no product code changed since Verify 49 / PR #72 merge

Use a clean source tree/worktree.

Do not merge any additional branch during deployment.

## 2. Production secret bootstrap

The repository root `.gitignore` excludes `.env`.

If repo-root `.env` does not exist:

- generate a new cryptographically secure production PostgreSQL password locally
- use at least 32 random bytes
- encode it in a shell-safe form such as hex
- write only:
  `EDUNI_POSTGRES_PASSWORD=<generated-secret>`
  to repo-root `.env`

Requirements:

- never print the secret
- never echo the secret to logs
- never include the secret in the report
- never add/commit `.env`
- never use the old verify-only placeholder as production password

If `.env` already exists:

- do not overwrite an existing non-empty production password
- only verify that `EDUNI_POSTGRES_PASSWORD` is present and non-empty
- do not print its value

After creation/verification, confirm only the boolean fact that a non-empty
production password is available.

## 3. Existing application data preservation

Before runtime changes, confirm:

- `eduni-space-mvp_eduni_data` exists
- existing `eduni-game` mounts that volume at `/data`
- the existing SQLite portal database is present under
  `/data/eduni_portal.sqlite3`
- existing data volume contents are not replaced or reinitialized

If Reading Journal cover files already exist under
`/data/reading-journal/covers`, preserve them.

Do not create a replacement application data volume.

## 4. PostgreSQL first-production initialization

Because no existing EDUNI PostgreSQL container/volume was found, creation of the
same-project volume is authorized:

`eduni-space-mvp_eduni_postgres_data`

Requirements:

- project name must remain `eduni-space-mvp`
- PostgreSQL volume belongs only to this EDUNI project
- PostgreSQL host port must NOT be published
- container/internal PostgreSQL port remains 5432

Do not reuse another project's PostgreSQL volume.

## 5. Compose preflight

Using the real local production `.env`, run a safe Compose render.

Confirm:

- eduni-game host publication = `100.75.214.95:8081:18081`
- EDUNI internal port = 18081
- Reading DB host = `eduni-postgres`
- Reading DB port = 5432
- eduni-postgres has no host-published port
- no standalone host-port 8080 use exists

Do not print environment secrets when capturing evidence.

## 6. Backup gate

Before recreating `eduni-game`, create a timestamped backup of the existing EDUNI
application data.

At minimum preserve:

- existing SQLite portal DB
- any existing Reading Journal cover directory/files

Store backup outside Git-tracked paths.

Record only:

- backup path
- source size
- backup size
- success/failure

Do not expose secret values.

There is no prior EDUNI PostgreSQL production data to back up because this is its
first production initialization.

If application-data backup fails, stop with BLOCKED.

## 7. Deploy

Use the existing Compose project exactly:

`eduni-space-mvp`

Preferred scoped deployment:

~~~powershell
docker compose -p eduni-space-mvp up -d --build eduni-postgres eduni-game
~~~

Equivalent scoped commands are acceptable.

Requirements:

- preserve `eduni-space-mvp_eduni_data`
- allow first creation of `eduni-space-mvp_eduni_postgres_data`
- do not use `down -v`
- do not touch unrelated containers
- do not run cloudflared
- do not run legacy startup/watch scripts
- do not touch host 8080

If host 8081 is owned by the existing EDUNI Docker publication, normal Compose
replacement is allowed.

If an unexpected non-Docker/ambiguous process owns 8081, stop and report BLOCKED.
Do not kill an ambiguous process.

## 8. Container acceptance

Confirm:

- `eduni-postgres` becomes healthy
- `eduni-game` becomes healthy
- no startup/schema traceback in scoped EDUNI logs
- application data volume remains `eduni-space-mvp_eduni_data`
- PostgreSQL volume is `eduni-space-mvp_eduni_postgres_data`
- PostgreSQL has no host-published port

## 9. Production HTTP acceptance

Only after containers are healthy, test production host 8081.

Required:

- `/healthz` -> HTTP 200
- `/portal` -> HTTP 200
- `/reading` -> HTTP 200
- `/reading/api/health` -> HTTP 200 and healthy PostgreSQL-backed storage
- `/ai/health` -> HTTP 200
- `/bubble` -> successful response
- `/bubble-shooter` -> successful response

AI may remain disabled/not configured. That is expected unless separately
configured.

Do not contact host 8080.

## 10. Reading Journal acceptance

Perform non-destructive checks only.

- load `/reading`
- GET `/reading/api/records`
- confirm Reading Journal storage uses PostgreSQL
- confirm `reading_record` schema initialized successfully

If there are no existing reading records, an empty list is valid.

Do not create fake production reading records.

## 11. Existing-data acceptance

Verify the previously existing EDUNI portal data remains available after deploy.

Use read-only evidence where possible.

Confirm:

- existing child/profile/activity data survived
- existing application data volume is unchanged
- new PostgreSQL volume is separate and healthy

If prior application data is missing after deployment:

- stop
- do not initialize replacement data over it
- preserve current volumes
- report failure with rollback evidence

## 12. Failure handling

If deployment fails:

- do not delete volumes
- do not recreate/initialize the app data repeatedly
- do not touch host 8080
- collect only scoped EDUNI logs/evidence
- preserve rollback capability to the prior EDUNI runtime

Do not alter unrelated resources.

## 13. Report

Update/create:

`EDUNI_PRODUCTION_DEPLOY_REPORT_50.md`

The report must note:

- first Deploy 50 attempt safely BLOCKED on missing production PostgreSQL secret
- production secret was later prepared locally in ignored `.env`
- secret value was never logged/reported/committed
- exact deployed source SHA
- actual branch HEAD
- Compose project name
- previous runtime type
- application volume reused
- PostgreSQL volume created
- backup result
- build/deploy result
- container health
- HTTP acceptance results
- Reading Journal health
- existing-data preservation result
- AI health result
- PostgreSQL host-port publication result
- confirmation host 8080 was never queried/contacted/bound/stopped
- confirmation legacy startup/watch scripts were not executed
- remaining risks

Do not include:

- PostgreSQL password
- parent PIN hash
- access code
- private token

Only after full production acceptance PASS, commit/push the report.

## 14. Final verdict

Use exactly one:

`EDUNI PRODUCTION DEPLOY PASS — READING JOURNAL LIVE`

`EDUNI PRODUCTION DEPLOY FAIL — ROLLBACK REQUIRED`

`BLOCKED`

Stop after the report.
