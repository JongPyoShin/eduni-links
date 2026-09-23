# EDUNI Child Reading Journal — Independent Verify 41

## Scope

Verification-only for Draft PR #69.

Repository:

`JongPyoShin/eduni-links`

Head:

`feature/child-reading-journal`

Base:

`feature/eduni-space-mvp`

Do not merge.
Do not deploy.
Do not touch production data.

## Important isolation

Use temporary local data paths while testing:

```powershell
$env:EDUNI_PORTAL_DB = "$PWD/.tmp-reading-verify/portal.sqlite3"
$env:EDUNI_READING_DATA_DIR = "$PWD/.tmp-reading-verify/reading"
```

Delete only this temporary verification directory afterward.

Never point verification at the production Docker volume.

## 1. Diff / base

Confirm:

- PR #69 remains Draft
- base behind_by = 0
- product changes are limited to reading journal + required portal/Docker persistence wiring
- no game logic changes

## 2. Unit tests

From `nice-gui-1-1-7` run:

```powershell
python -m unittest tests.test_reading_journal
python -m unittest tests.test_routes
python scripts/validate_content.py
python -m unittest discover -s tests
```

Record exact counts and separate any known baseline failures.

Run:

```powershell
git diff --check
```

## 3. Local server

Start the existing family server with the temporary data environment only.

Verify HTTP 200:

- `/reading`
- `/reading/api/records`
- `/portal`
- `/healthz`

No production 8081 restart/recreate.

## 4. API behavior

Using temporary data:

### Create without image

POST a valid record.

Confirm:

- 201
- title/date/mode/rating/notes round-trip
- GET returns it

### Create with image

Use a small valid JPEG or PNG data URL.

Confirm:

- 201
- generated cover filename is UUID-like, not user supplied
- file exists under temporary reading covers directory
- returned `cover_url` loads HTTP 200

### Validation

Confirm 400 for:

- blank title
- invalid date
- invalid reading mode
- rating outside 1–5
- non-image data URL
- fake PNG/JPEG magic bytes
- decoded image above limit

### Delete

Confirm:

- record removed
- image file removed
- repeated delete -> 404

## 5. Desktop browser 1280×800

Verify:

- page visually loads
- form and bookshelf are readable
- photo chooser works
- image preview appears
- title/date/mode/reaction fields work
- child comment / memorable scene / parent note save correctly
- success status appears
- newly saved card appears
- refresh preserves the record
- search filters by title/author
- delete confirmation removes record
- zero console errors
- zero page errors

## 6. Mobile browser 360×800

Verify:

- no horizontal overflow
- camera input contains `capture="environment"`
- photo area is easy to tap
- form fields do not clip
- mode/reaction chips wrap cleanly
- save button is tappable
- bookshelf cards fit viewport
- photo preview is not distorted
- zero console errors/page errors

Real physical camera invocation is not required; verify file-input capture contract plus mobile layout.

## 7. Image compression

In browser, upload a reasonably large image and verify the submitted data URL is generated through the canvas resize path.

Check:

- max side <= 1600
- JPEG output
- original file is not written directly to server
- server decoded limit remains 4 MiB

## 8. Pressure-free product contract

Confirm the page does NOT introduce:

- leaderboard
- public sharing
- reading-time competition
- streak loss/punishment

Confirm the child-facing memory fields remain prominent:

- 아이가 한 말
- 가장 기억에 남는 장면 / 이야기
- 부모 메모

## 9. Docker persistence wiring

Do not deploy.

Statically verify:

- `eduni_data:/data` volume remains
- `EDUNI_PORTAL_DB=/data/eduni_portal.sqlite3`
- `EDUNI_READING_DATA_DIR=/data/reading-journal`

Flag this migration requirement in the report:

Before the future production recreate, preserve/copy any existing live Portal DB from the old in-container path if it contains data worth keeping.

## 10. Report

Create:

`EDUNI_READING_JOURNAL_VERIFY_REPORT_41.md`

Include:

- verified head SHA
- base SHA
- ahead/behind
- changed files
- unit/full-suite counts
- HTTP checks
- API create/list/delete evidence
- image persistence evidence
- desktop browser checks
- mobile browser checks
- console/page errors
- Docker persistence confirmation
- remaining risks

Final verdict exactly one:

- `READING JOURNAL VERIFY PASS — MERGE READY`
- `READING JOURNAL VERIFY FAIL`
- `BLOCKED`

If PASS, recommendation exactly:

`MERGE`

Do not merge.
Do not deploy.
