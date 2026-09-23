# EDUNI Child Reading Journal — Edit & Mobile Preview Verify 42

## Scope

Verification-only for Draft PR #69 after edit/mobile-preview changes.

Repository:

`JongPyoShin/eduni-links`

Head:

`feature/child-reading-journal`

Base:

`feature/eduni-space-mvp`

Do not implement features.
Do not merge.
Do not deploy.
Do not touch production/8081.

## Isolation

Use temporary local paths only:

```powershell
$env:EDUNI_PORTAL_DB = "$PWD/.tmp-reading-edit-verify/portal.sqlite3"
$env:EDUNI_READING_DATA_DIR = "$PWD/.tmp-reading-edit-verify/reading"
```

Delete only this temporary directory afterward.

## 1. Git gate

Confirm:

- PR #69 is Draft
- base behind_by = 0
- no game logic changes
- changed product files remain reading journal / portal entry / Docker persistence only

Record exact HEAD SHA.

## 2. Automated tests

From `nice-gui-1-1-7` run:

```powershell
python -m unittest tests.test_reading_journal
python -m unittest tests.test_routes
python scripts/validate_content.py
python -m unittest discover -s tests
git diff --check
```

Record exact totals.

Any new regression = FAIL.

## 3. CRUD API

Using temporary data, create one record with a valid image.

Then verify PUT:

### Text-only edit / keep photo

`PUT /reading/api/records/{id}`

Change:

- title
- author
- read_date
- reading_mode
- rating
- child_comment
- favorite_part
- parent_note

Use:

`cover_action=keep`

Confirm:

- HTTP 200
- all edited fields round-trip
- same cover filename remains
- existing image still exists

### Replace photo

Use:

`cover_action=replace`

with a new valid image data URL.

Confirm:

- HTTP 200
- new filename differs
- new file exists
- old file is deleted

### Remove photo

Use:

`cover_action=remove`

Confirm:

- HTTP 200
- cover_filename / cover_url become null
- previous image file is deleted

### Validation

Confirm:

- invalid cover_action -> 400
- replace without cover_data_url -> 400
- unknown record -> 404
- invalid title/date/mode/rating/image validation still behaves as before

### Delete

Delete the edited record and confirm repeated delete -> 404.

## 4. Desktop headed Chrome 1280×800

Verify:

- existing record card shows `수정` and `삭제`
- clicking `수정` loads all existing fields into the form
- existing image preview is shown
- title changes to `독서기록 수정`
- submit button changes to `수정 저장`
- `수정 취소` restores new-record mode
- edit + keep photo works
- edit + replace photo works
- edit + remove photo works
- successful edit updates the same card, not a duplicate card
- changing read_date re-sorts the bookshelf
- clicking `＋ 새 독서기록` while editing cancels edit state and opens a blank new form
- zero console/page errors

## 5. Mobile headed Chrome 360×800

Verify:

- responsive one-column layout
- no horizontal overflow
- card `수정` / `삭제` controls remain tappable
- tapping `수정` scrolls to the edit form
- existing photo preview fits
- edit fields/chips/save/cancel fit without clipping
- actual-phone layout hides the desktop-only `모바일 보기` button
- zero console/page errors

## 5B. Adversarial photo-state races

Explicitly exercise these races in headed browser:

### Rapid replacement

1. choose image A
2. before A processing settles, choose image B
3. ensure A cannot later overwrite B preview/data
4. final saved image must be B only

### Cancel while image is processing

1. enter edit mode
2. choose a large replacement image
3. immediately press `수정 취소` or `＋ 새 독서기록`
4. after old image processing completes, it must NOT repopulate the new/blank form
5. no stale preview / coverDataUrl may survive

### Submit during image processing

While a selected image is still being resized:

- save must be disabled or rejected
- record must not save without the intended pending image
- after processing finishes, save becomes available again

### Remove-photo layout

Verify on desktop and mobile:

- `사진 제거` is outside the overflow-hidden preview box
- it remains visible/tappable
- the left photo area and right form remain the intended 2-column desktop layout
- no overlap with `사진 바꾸기`
- mobile remains one column

Any stale image callback or layout break = FAIL.

## 6. Desktop mobile-preview toggle

At desktop viewport:

- initial state uses normal responsive desktop layout
- click `📱 모바일 보기`
- body receives `force-mobile`
- page becomes ~390px centered mobile-preview layout
- toggle text changes to `↔ 자동 보기`
- clicking again restores normal layout
- data/form state is preserved while toggling
- no console errors

This is only a desktop preview control; actual mobile remains automatic responsive layout.

## 7. Regression contract

Confirm still working:

- create new record
- photo capture/file-input contract
- client resize maxSide 1600
- search
- stats
- refresh persistence
- delete
- child-profile scoping
- pressure-free UX
- Docker `/data` persistence wiring

## 8. Report

Create:

`EDUNI_READING_JOURNAL_EDIT_VERIFY_REPORT_42.md`

Include:

- verified HEAD
- base SHA
- ahead/behind
- changed files
- focused/full test totals
- CRUD PUT evidence
- image keep/replace/remove evidence
- desktop QA
- mobile QA
- desktop mobile-preview toggle QA
- console/page errors
- remaining risks

Final verdict exactly one:

- `READING JOURNAL EDIT VERIFY PASS — MERGE READY`
- `READING JOURNAL EDIT VERIFY FAIL`
- `BLOCKED`

If PASS, recommendation exactly:

`MERGE`

Do not merge.
Do not deploy.
