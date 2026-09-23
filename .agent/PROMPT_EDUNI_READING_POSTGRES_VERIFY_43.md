# EDUNI Reading Journal — PostgreSQL + Edit Verify 43

## Scope

Verification-only for Draft PR #69.

Repository: JongPyoShin/eduni-links
Head: feature/child-reading-journal
Base: feature/eduni-space-mvp

Do not merge.
Do not deploy.
Do not touch production port 8081.
Do not stop, restart, remove, or recreate the live eduni-game, Nextcloud, eduni-nextcloud-db, or unrelated PostgreSQL containers.

## 1. Git gate

Confirm:
- PR #69 is Draft
- behind_by = 0
- record exact HEAD
- no unrelated game logic changes
- Portal/game learning data remains SQLite
- reading_record production metadata uses PostgreSQL
- cover files remain under EDUNI_READING_DATA_DIR/covers
- PostgreSQL has no host-published 5432 port

## 2. Static validation

Run from repository root:

~~~powershell
cd nice-gui-1-1-7
python scripts/validate_content.py
python -m unittest tests.test_reading_journal
python -m unittest tests.test_routes
python -m unittest discover -s tests
cd ..
git diff --check
~~~

Record focused/full totals and skips.

Verify:
- requirements.txt has psycopg[binary]==3.3.6
- .env is ignored
- .env.example contains no real secret
- docker-compose.yml keeps EDUNI_PORTAL_DB=/data/eduni_portal.sqlite3
- eduni-postgres uses postgres:16
- eduni_postgres_data persists /var/lib/postgresql/data
- eduni-game depends on PostgreSQL health
- no 5432:5432 mapping
- password comes from EDUNI_POSTGRES_PASSWORD

Render config only. Never run normal compose up/down:

~~~powershell
$env:EDUNI_POSTGRES_PASSWORD = "verify-" + [guid]::NewGuid().ToString("N")
docker compose config
~~~

## 3. Build isolated candidate

~~~powershell
docker build -f nice-gui-1-1-7/Dockerfile -t eduni-reading-verify:local .
docker run --rm eduni-reading-verify:local python -c "import psycopg; print(psycopg.__version__)"
~~~

Must pass.

## 4. Isolated PostgreSQL

Use only:
- network eduni-reading-verify-net
- PG container eduni-reading-verify-pg
- app container eduni-reading-verify-game
- PG volume eduni-reading-verify-pgdata
- app volume eduni-reading-verify-data

Remove only stale resources with those exact verification names if necessary.

~~~powershell
$env:EDUNI_POSTGRES_PASSWORD = "verify-" + [guid]::NewGuid().ToString("N")
docker network create eduni-reading-verify-net
docker volume create eduni-reading-verify-pgdata
docker volume create eduni-reading-verify-data
docker run -d --name eduni-reading-verify-pg --network eduni-reading-verify-net -e POSTGRES_DB=eduni -e POSTGRES_USER=eduni -e POSTGRES_PASSWORD=$env:EDUNI_POSTGRES_PASSWORD -v eduni-reading-verify-pgdata:/var/lib/postgresql/data postgres:16
docker exec eduni-reading-verify-pg pg_isready -U eduni -d eduni
~~~

Do not publish PostgreSQL 5432 to host.

## 5. Isolated app

Ensure 127.0.0.1:18081 is unused. If occupied by a non-verification process, choose another unused loopback-only high port and record it. Never kill the occupant.

Start candidate:

~~~powershell
docker run -d --name eduni-reading-verify-game --network eduni-reading-verify-net -p 127.0.0.1:18081:8080 -e EDUNI_HOST=0.0.0.0 -e PORT=8080 -e EDUNI_PORTAL_DB=/data/eduni_portal.sqlite3 -e EDUNI_READING_DATA_DIR=/data/reading-journal -e EDUNI_READING_DB_HOST=eduni-reading-verify-pg -e EDUNI_READING_DB_PORT=5432 -e EDUNI_READING_DB_NAME=eduni -e EDUNI_READING_DB_USER=eduni -e EDUNI_READING_DB_PASSWORD=$env:EDUNI_POSTGRES_PASSWORD -v eduni-reading-verify-data:/data eduni-reading-verify:local
~~~

Confirm:
- /healthz = 200
- /portal = 200
- /reading = 200
- /reading/api/health = 200
- reading health JSON has ok=true and storage=postgresql

## 6. PostgreSQL integration

~~~powershell
docker exec -e EDUNI_ALLOW_POSTGRES_TESTS=1 eduni-reading-verify-game python -m unittest tests.test_reading_journal_postgres
~~~

Must PASS.

Confirm coverage:
- create/list
- edit text
- keep cover
- replace cover and delete old file
- remove cover
- delete record
- child_profile_id scoping

## 7. API CRUD

Against isolated app only:

Create:
- without image -> 201
- with valid image -> 201 and cover URL 200

PUT keep:
- cover_action=keep
- fields round-trip
- cover filename unchanged

PUT replace:
- cover_action=replace with valid image
- filename changes
- new URL 200
- old URL 404

PUT remove:
- cover_action=remove
- cover_filename and cover_url null
- prior cover URL 404

Validation:
- blank title 400
- invalid date 400
- invalid mode 400
- invalid rating 400
- invalid cover_action 400
- replace without image 400
- fake image 400
- unknown id 404

Delete:
- first delete 200
- repeated delete 404

## 8. Persistence

Create one record with image.

Restart only eduni-reading-verify-pg.
Wait for pg_isready.
Confirm metadata remains and reading health recovers.

Restart only eduni-reading-verify-game.
Confirm:
- reading health = PostgreSQL
- metadata remains
- cover URL remains 200

Metadata loss or cover loss = FAIL.

## 9. SQLite boundary

Inside candidate verify /data/eduni_portal.sqlite3 still exists.

Production-mode reading API must read/write PostgreSQL and must not silently fall back to SQLite.

The PostgreSQL reading table intentionally stores child_profile_id without a cross-database foreign key.

## 10. UI regression and adversarial image races

Desktop headed Chrome 1280x800:
- 수정 and 삭제 visible
- edit loads fields
- keep/replace/remove photo work
- 수정 취소 works
- 새 독서기록 exits edit state
- date edit re-sorts
- desktop 모바일 보기 toggles approximately 390px preview and restores
- no console/page errors

Mobile headed Chrome 360x800:
- one column
- no horizontal overflow
- edit/delete tappable
- edit scrolls to form
- desktop mobile-preview control hidden
- no clipping/errors

Adversarial:
1. choose image A then immediately B; A must never overwrite B
2. large image then immediate 수정 취소; stale result must not repopulate form
3. large image then immediate 새 독서기록; stale result must not repopulate form
4. submit during resize must be disabled/rejected
5. 사진 제거 must not overlap 사진 바꾸기
6. desktop remains two-column and mobile remains one-column

Any stale callback = FAIL.

## 11. PostgreSQL-down behavior

Stop only eduni-reading-verify-pg.

Confirm:
- candidate app remains running
- /portal remains reachable
- /reading/api/health returns 503
- reading API does not silently fall back to SQLite

Start PostgreSQL again and confirm recovery without rebuilding app.

Silent fallback = FAIL.

## 12. Security/config

Confirm:
- no host 5432 listener from verification PG
- password is not committed
- API errors do not echo password or connection string
- generated cover filenames remain UUID-based
- user filenames never become filesystem paths

Known P2 accepted:
- edit/delete API has no parent PIN yet
- concurrent edits are last-writer-wins

Do not broaden scope to fix these in this run.

## 13. Cleanup

Always clean only verification resources:

~~~powershell
docker rm -f eduni-reading-verify-game
docker rm -f eduni-reading-verify-pg
docker volume rm eduni-reading-verify-data
docker volume rm eduni-reading-verify-pgdata
docker network rm eduni-reading-verify-net
Remove-Item Env:EDUNI_POSTGRES_PASSWORD -ErrorAction SilentlyContinue
~~~

Never remove live eduni-game, live eduni_data, Nextcloud resources, or unrelated PostgreSQL resources.

## 14. Report

Create EDUNI_READING_POSTGRES_VERIFY_REPORT_43.md.

Include:
- exact verified HEAD
- base SHA
- ahead/behind
- changed files
- focused/full totals
- PG integration result
- image build result
- psycopg version
- reading health result
- CRUD evidence
- restart persistence
- PG-down behavior
- SQLite boundary
- desktop/mobile QA
- adversarial photo-race result
- production untouched confirmation
- cleanup confirmation
- remaining risks

Final verdict exactly one:
READING POSTGRES VERIFY PASS — MERGE READY
READING POSTGRES VERIFY FAIL
BLOCKED

If PASS, recommendation exactly:
MERGE

Do not merge.
Do not deploy.
