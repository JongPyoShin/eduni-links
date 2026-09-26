# EDUNI Production Deploy — 50

## Mission

Deploy the verified EDUNI production build that contains:

- Reading Journal
- Verify 47 port migration
- Phase AI-1

Repository: JongPyoShin/eduni-links
Production source branch: feature/eduni-space-mvp

Verified product merge source SHA:

`f9dfee796225ba9461d53a9167aca91e5b19a83c`

The deployment must use this exact product state or a documentation-only descendant.

User has explicitly approved production deployment.

## Non-negotiable safety

Host port **8080 belongs to another project**.

Never:

- connect to host 8080
- probe host 8080
- bind host 8080
- stop host 8080
- kill its owner
- run any script that can touch host 8080

Do not run:

- `nice-gui-1-1-7/scripts/start_eduni_services.ps1`
- `nice-gui-1-1-7/scripts/watch_eduni_services.ps1`

Reason: the legacy startup path manages port owners and cloudflared processes and
starts a direct Python/Tetris path on 8081. This deployment must use Docker Compose.

Do not remove/reuse or prune:

- Nextcloud resources
- codex-uv-lock-pg
- flopi-pr87-pg-20260911
- unrelated PostgreSQL containers/volumes
- unrelated Docker networks/images/volumes

Never run:

- `docker system prune`
- `docker volume prune`
- `docker compose down -v`
- broad container/process cleanup

Only EDUNI production resources may be changed.

## Required production port contract

- DB/Hanja: host 18080 where separately managed
- EDUNI production host: `100.75.214.95:8081`
- EDUNI container/internal: `18081`
- PostgreSQL: container/internal `5432`, no host publication
- host 8080: untouched

The current Compose contract must render:

`100.75.214.95:8081:18081`

and healthcheck:

`http://127.0.0.1:18081/healthz`

## 1. Git/source gate

Fetch the repository safely.

Record exact refs:

- `origin/feature/eduni-space-mvp`
- expected verified product source:
  `f9dfee796225ba9461d53a9167aca91e5b19a83c`

If the branch moved after this instruction:

1. inspect every later commit;
2. continue only if later commits are documentation-only or independently verified;
3. otherwise BLOCK deployment and report.

Do not merge any branch during deployment.

Do not modify product code.

Run before deploy:

~~~powershell
git status --short
git diff --check
~~~

Use a clean source tree/worktree for the deployment.

## 2. Static deployment preflight

Before touching runtime, inspect the exact source being deployed.

Confirm:

- Dockerfile default/internal port = 18081
- Compose eduni-game PORT = 18081
- Compose publication = `100.75.214.95:8081:18081`
- Compose healthcheck uses 18081
- eduni-postgres has no host-published port
- Reading Journal env points to:
  - `/data/eduni_portal.sqlite3`
  - `/data/reading-journal`
  - PostgreSQL host `eduni-postgres`
  - PostgreSQL port 5432
- AI provider has no production requirement and remains disabled unless explicitly
  configured. Do not configure or contact a real AI provider in this deployment.

Run:

~~~powershell
$env:EDUNI_POSTGRES_PASSWORD='verify-only-not-production'
docker compose config
Remove-Item Env:EDUNI_POSTGRES_PASSWORD
~~~

This temporary value is for render validation only.
Never use it for production startup.

The rendered Compose configuration must contain no standalone host-port 8080.

## 3. Production environment gate

A real production PostgreSQL password must already exist in the production
environment / `.env`.

Requirements:

- `EDUNI_POSTGRES_PASSWORD` is present and non-empty
- never print its value
- never commit it
- never replace an existing production password with a generated one during this deploy

If no production password exists, verdict = BLOCKED.
Do not start PostgreSQL with a temporary password.

## 4. Identify current EDUNI production resources

Inspect only EDUNI resources and host 8081.

Allowed examples:

~~~powershell
docker ps -a --filter "name=^/eduni-game$"
docker ps -a --filter "name=^/eduni-postgres$"
docker inspect eduni-game
docker inspect eduni-postgres
Get-NetTCPConnection -LocalPort 8081 -State Listen -ErrorAction SilentlyContinue
~~~

Do NOT issue any command for port 8080.

For an existing `eduni-game` container, record:

- image
- container status
- Compose project label if present
- Compose working directory/config label if present
- mounted EDUNI data volume name
- current health
- current published port

For existing `eduni-postgres`, record:

- status
- mounted PostgreSQL volume name
- health
- Compose project label if present

### 8081 ownership gate

If 8081 is owned by:

- the existing EDUNI Docker publication, continue;
- an old direct EDUNI Python process that can be positively identified as the
  legacy EDUNI runtime, record it and stop only that process immediately before
  Compose takes over;
- any unrelated/ambiguous process, verdict = BLOCKED.

Never kill an ambiguous process.

## 5. Preserve existing data

This is mandatory.

Before recreating EDUNI containers, determine the actual existing persistent data.

### Existing Docker deployment

If the current EDUNI deployment already uses Docker volumes:

- reuse the exact existing EDUNI application data volume;
- reuse the exact existing EDUNI PostgreSQL volume;
- preserve the same Compose project name when required for volume identity.

Do not create fresh replacement volumes if that would orphan existing production
data.

### Existing non-Docker legacy deployment

If production is currently a direct Python process rather than Docker:

- locate the current EDUNI SQLite database used by the running app;
- record its path and size;
- create a backup copy before migration;
- initialize the Docker EDUNI data volume and copy the existing SQLite database
  into `/data/eduni_portal.sqlite3`;
- do not overwrite a newer non-empty target database without explicit evidence
  that the source is authoritative.

Reading Journal metadata is PostgreSQL-only in the new deployment. If there was no
prior Reading Journal production PostgreSQL instance, an empty new
`reading_record` table is expected.

Reading cover files belong under:

`/data/reading-journal/covers`

Preserve existing files if that directory already exists.

## 6. Backup gate

Before container replacement, create verification-safe backups of any existing
EDUNI persistent data.

At minimum:

- application SQLite/data volume or legacy SQLite file
- existing EDUNI PostgreSQL volume/database if it already exists

Use a timestamped backup location outside Git-tracked paths.

Do not back up or access unrelated projects.

Record:

- backup location
- source size
- backup size
- success/failure

If existing production data is present and backup fails, verdict = BLOCKED.

## 7. Compose project identity

If the current `eduni-game` container has a Compose project label, reuse that
exact project name with `docker compose -p <project> ...`.

This prevents accidental creation of parallel volumes under a different project
name.

If there is no existing Compose project and production is being migrated from
legacy direct Python, choose a single explicit EDUNI project name and document it.

Do not guess an existing project identity when Docker labels already provide it.

## 8. Deploy

Use only the exact verified Compose file and source tree.

Do not run the legacy startup scripts.

Preferred deployment:

~~~powershell
docker compose -p <eduni-project> build eduni-game
docker compose -p <eduni-project> up -d eduni-postgres
docker compose -p <eduni-project> up -d eduni-game
~~~

Or an equivalent scoped command:

~~~powershell
docker compose -p <eduni-project> up -d --build eduni-postgres eduni-game
~~~

Requirements:

- do not use `down -v`
- do not remove persistent volumes
- do not recreate unrelated services
- do not stop unrelated containers
- do not modify host 8080
- do not start cloudflared as part of this deployment
- do not publish PostgreSQL 5432 to host

If an old positively identified direct EDUNI process owns 8081, stop only that
EDUNI process immediately before the Compose `up`.

## 9. Database/schema startup

Allow the app to initialize its normal schemas through the verified application
startup path.

Confirm:

- `eduni-postgres` becomes healthy
- `eduni-game` becomes healthy
- application logs contain no schema/startup traceback
- Reading Journal storage health becomes healthy
- existing SQLite portal data remains readable

Do not manually edit production tables unless startup fails and a separately
reviewed recovery is required.

## 10. Production acceptance

Only after both EDUNI containers are healthy, test the production service on
host 8081.

Allowed:

~~~text
http://127.0.0.1:8081/healthz
http://127.0.0.1:8081/portal
http://127.0.0.1:8081/reading
http://127.0.0.1:8081/reading/api/health
http://127.0.0.1:8081/ai/health
~~~

Do not test or contact 8080.

Required:

- `/healthz` = HTTP 200
- `/portal` = HTTP 200
- `/reading` = HTTP 200
- `/reading/api/health` = HTTP 200 with healthy PostgreSQL-backed storage
- `/ai/health` = HTTP 200
- AI health shows disabled/not configured unless production AI was separately
  configured before this deploy

Also confirm:

- `/bubble` responds
- `/bubble-shooter` responds
- no serious traceback in `eduni-game` logs
- no PostgreSQL host port publication
- `eduni-game` remains bound to host 8081 only as expected

## 11. Reading Journal production smoke

Perform a non-destructive availability check first:

- load `/reading`
- GET `/reading/api/records`

If an existing reading record exists, do not alter/delete it for smoke testing.

If there are no records, do not create a fake production record unless explicitly
needed. Availability/health is enough for deployment acceptance.

Confirm cover directory is writable by the application container without creating
a persistent fake image if possible.

## 12. Existing-data acceptance

Verify that existing EDUNI child/profile/activity data survived deployment.

Use read-only application/API/database evidence where possible.

Do not expose parent PIN hashes or secrets in the report.

If prior data existed before deployment but is missing afterward:

- stop;
- do not initialize new replacement data over it;
- preserve current containers/volumes;
- report FAIL and provide rollback evidence.

## 13. Rollback readiness

Keep the previous image/container identification and data backups until acceptance
passes.

If the new `eduni-game` is unhealthy:

- collect scoped logs;
- do not touch host 8080;
- restore/restart only the prior EDUNI runtime;
- preserve the new failure logs;
- do not delete persistent volumes.

If PostgreSQL is the issue, do not wipe/reinitialize the production database.

## 14. Final report

Create:

`EDUNI_PRODUCTION_DEPLOY_REPORT_50.md`

Report:

- deployed source SHA
- actual branch HEAD
- Compose project name
- previous runtime type: Docker or legacy Python
- previous 8081 owner identification
- EDUNI application volume used
- EDUNI PostgreSQL volume used
- backup result
- image build result
- container health
- exact production acceptance route results
- Reading Journal health result
- existing-data preservation result
- AI health result
- confirmation PostgreSQL is not host-published
- confirmation host 8080 was never probed/contacted/bound/stopped
- confirmation legacy startup/watch scripts were not executed
- remaining risks

Do not include:

- passwords
- parent PIN hashes
- access codes
- private tokens

Commit/push only this deployment report after successful acceptance.

## 15. Final verdict

Use exactly one:

`EDUNI PRODUCTION DEPLOY PASS — READING JOURNAL LIVE`

`EDUNI PRODUCTION DEPLOY FAIL — ROLLBACK REQUIRED`

`BLOCKED`

Stop after the deployment report.
