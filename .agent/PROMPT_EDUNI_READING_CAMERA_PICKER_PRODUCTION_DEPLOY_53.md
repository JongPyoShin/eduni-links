# EDUNI Production Deploy — Reading Camera Picker 53

## Mission

Deploy the verified Reading Journal camera/gallery split to EDUNI production.

Repository: `JongPyoShin/eduni-links`
Branch: `feature/eduni-space-mvp`

Approved product merge SHA:

`7e8155ea137a5490cc87966ca96fc1bcb329acec`

PR:

`#73 Add separate camera and gallery picker to Reading Journal`

Verified implementation candidate:

`6771e6d58e985fbc28d6158af0ae870f0fb47d0c`

Verify result:

`READING CAMERA PICKER VERIFY PASS — READY FOR PR`

User explicitly approved production deployment.

This task is deployment only.

Do not modify product code.
Do not create another feature branch.
Do not merge anything else.

## 1. Read first

Read:

- `AGENTS.md`
- `nice-gui-1-1-7/AGENTS.md`
- `EDUNI_PRODUCTION_DEPLOY_REPORT_50.md`
- `EDUNI_READING_CAMERA_PICKER_IMPLEMENT_REPORT_51.md`
- `EDUNI_READING_CAMERA_PICKER_VERIFY_REPORT_52.md`

Confirm the current branch contains merge SHA:

`7e8155ea137a5490cc87966ca96fc1bcb329acec`

If branch HEAD is later than that SHA, verify every later commit is documentation-only before deployment.

If any unreviewed product/test/runtime code exists after the approved merge SHA, stop with BLOCKED.

## 2. Production safety rules

Production Compose project:

`eduni-space-mvp`

Known production resources:

- app container: `eduni-game`
- PostgreSQL container: `eduni-postgres`
- app data volume: `eduni-space-mvp_eduni_data`
- PostgreSQL volume: `eduni-space-mvp_eduni_postgres_data`
- host EDUNI port: `100.75.214.95:8081`
- container EDUNI port: `18081`
- PostgreSQL internal port: `5432`
- PostgreSQL must have NO host-published port

Host port 8080 belongs to another project.

NEVER:

- query host port 8080
- connect to host port 8080
- bind host port 8080
- stop host port 8080
- kill its owner
- use 8080 for temporary verification

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
- unrelated Docker containers
- unrelated Docker volumes
- unrelated PostgreSQL resources

## 3. Production secret gate

The existing production repo-root `.env` must already contain a non-empty:

`EDUNI_POSTGRES_PASSWORD`

Requirements:

- do not regenerate it
- do not overwrite it
- do not print it
- do not log it
- do not include it in the report
- do not add/commit `.env`

Confirm only that the variable exists and is non-empty.

If it is missing, stop with BLOCKED.

## 4. Source and diff gate

Record:

- current branch HEAD
- approved merge SHA
- latest documentation-only commits after the merge, if any
- working-tree status

Confirm the product diff introduced by PR #73 is limited to the already verified Reading Journal camera/gallery change and its tests.

No Docker Compose, DB schema, API, AI, route, or production-script change should exist for this deployment.

Run `git diff --check`.

If product source differs from the verified PR #73 content, stop with BLOCKED.

## 5. Existing production state

Before any recreate/build, inspect only the scoped EDUNI production resources.

Confirm:

- `eduni-game` exists
- `eduni-postgres` exists
- both belong to Compose project `eduni-space-mvp`
- `eduni-game` uses `eduni-space-mvp_eduni_data`
- `eduni-postgres` uses `eduni-space-mvp_eduni_postgres_data`
- PostgreSQL has no host-published port
- both are currently healthy, or clearly record their pre-deploy health

Record the current `eduni-game` image ID for rollback.

Do not inspect or manipulate unrelated containers beyond what is necessary to establish they are not being targeted.

## 6. Backup / rollback gate

This change should not modify persistent data, but preserve rollback readiness.

Before rebuilding `eduni-game`:

- record current `eduni-game` image ID
- create a local rollback image tag from the current image if safe
- verify app data volume remains mounted and intact
- verify PostgreSQL volume remains mounted and intact

At minimum create/confirm a current backup of:

- `/data/eduni_portal.sqlite3`
- `/data/reading-journal` if present

Store backups outside Git-tracked paths.

Do not dump or expose secrets.

If backup/preservation checks fail, stop with BLOCKED before replacing the app container.

## 7. Compose preflight

Use the existing production `.env`.

Validate rendered Compose configuration without exposing the password.

Confirm:

- host mapping remains `100.75.214.95:8081:18081`
- PostgreSQL remains internal-only
- app volume remains `eduni-space-mvp_eduni_data`
- PostgreSQL volume remains `eduni-space-mvp_eduni_postgres_data`
- project name remains `eduni-space-mvp`
- no host-port 8080 reference is introduced

## 8. Deploy

Deploy only the scoped EDUNI services.

Preferred command:

~~~powershell
docker compose -p eduni-space-mvp up -d --build eduni-game
~~~

If Compose requires the dependency to be named explicitly, this is acceptable:

~~~powershell
docker compose -p eduni-space-mvp up -d --build eduni-postgres eduni-game
~~~

Requirements:

- do not recreate PostgreSQL unnecessarily if configuration is unchanged
- never remove volumes
- preserve both existing named volumes
- do not run cloudflared
- do not run legacy startup/watch scripts
- do not touch host 8080
- do not touch unrelated containers

## 9. Container acceptance

After deployment, confirm:

- `eduni-game` healthy
- `eduni-postgres` healthy
- `eduni-game` uses the new image
- app data volume unchanged
- PostgreSQL volume unchanged
- PostgreSQL still has no host-published port
- no scoped startup traceback or fatal error

Record the new app image ID.

## 10. Production HTTP acceptance

Use production host port 8081 only.

Required:

- `/healthz` -> HTTP 200
- `/portal` -> HTTP 200
- `/reading` -> HTTP 200
- `/reading/api/health` -> HTTP 200 and healthy PostgreSQL-backed storage
- `/ai/health` -> HTTP 200
- `/bubble` -> successful response
- `/bubble-shooter` -> successful response

Do not contact host 8080.

## 11. Camera/gallery production markup acceptance

On the production `/reading` response, verify the deployed page contains:

- visible text `카메라로 촬영`
- visible text `갤러리에서 선택`
- a dedicated camera file input
- camera input with `capture="environment"`
- a distinct gallery input without `capture`
- no old ambiguous single `coverInput` control

This verifies the correct frontend reached production.

Do not create a fake Reading Journal record.

Do not upload a synthetic production cover image.

## 12. Existing data acceptance

Verify read-only that existing persistent state remains intact.

Confirm:

- app data volume identity unchanged
- PostgreSQL volume identity unchanged
- Reading Journal DB health remains good
- existing record count is preserved
- existing cover-file count is preserved
- existing portal SQLite integrity remains valid

Do not create test data in production.

## 13. Physical mobile acceptance status

The actual native camera launch cannot be proven by desktop automation alone.

Deployment PASS does not require physical-device camera execution if all server/UI deployment gates pass.

Report:

`PHYSICAL MOBILE CAMERA: PENDING USER ACCEPTANCE`

The user will perform the final device check after deployment:

1. open production `/reading` on the phone
2. tap `📷 카메라로 촬영`
3. verify the native camera opens or the device/browser presents its expected camera chooser
4. take a photo
5. verify the image returns to the Reading Journal preview
6. tap `🖼️ 갤러리에서 선택`
7. confirm gallery selection remains separate

Remember: `capture="environment"` is a browser/platform hint, not a universal guarantee that every browser bypasses a chooser.

## 14. Failure / rollback

If the new app fails container or HTTP acceptance:

- preserve both data volumes
- do not delete/reinitialize PostgreSQL
- do not touch host 8080
- collect only scoped EDUNI evidence
- restore the previous `eduni-game` image/runtime using the recorded rollback image/tag if required
- re-run core health checks on 8081 after rollback

Never use destructive volume cleanup.

## 15. Report

Create:

`EDUNI_READING_CAMERA_PICKER_PRODUCTION_DEPLOY_REPORT_53.md`

Include:

- exact approved merge SHA
- actual branch HEAD at deployment
- confirmation later commits, if any, were documentation-only
- previous app image ID
- new app image ID
- rollback image/tag status
- app/PostgreSQL volume identities before and after
- backup result
- Compose render result
- build/deploy result
- container health
- all HTTP acceptance results
- production camera/gallery markup acceptance
- Reading Journal DB health
- existing record/file preservation
- PostgreSQL host-port status
- physical mobile acceptance status
- confirmation host 8080 was untouched
- confirmation forbidden scripts were not run
- confirmation unrelated Docker resources were untouched
- remaining browser/platform limitation

Do not include secrets.

Only after all non-physical production gates PASS, commit/push the report to:

`feature/eduni-space-mvp`

Do not commit generated backups.
Do not commit `.env`.

## 16. Final verdict

Use exactly one:

`EDUNI CAMERA PICKER DEPLOY PASS — MOBILE ACCEPTANCE PENDING`

`EDUNI CAMERA PICKER DEPLOY FAIL — ROLLBACK REQUIRED`

`BLOCKED`

Stop after report commit/push.
