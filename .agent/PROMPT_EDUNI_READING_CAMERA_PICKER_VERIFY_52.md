# EDUNI Reading Journal — Camera / Gallery Split Verify 52

## Mission

Independently verify the Reading Journal camera/gallery split implemented on:

Repository: `JongPyoShin/eduni-links`
Branch: `feature/reading-camera-picker`

Verified implementation candidate:

`6771e6d58e985fbc28d6158af0ae870f0fb47d0c`

Base branch:

`feature/eduni-space-mvp`

Base SHA at implementation time:

`c8ca644ed353250b451e8d6ac31f96c6961a7d7c`

Implementation report:

`EDUNI_READING_CAMERA_PICKER_IMPLEMENT_REPORT_51.md`

This is verification only.

Do not modify product code.
Do not fix failures.
Do not create a PR.
Do not merge.
Do not deploy.
Do not touch production 8081.
Do not query, probe, connect to, bind, stop, or kill host 8080.

## Read first

- `AGENTS.md`
- `nice-gui-1-1-7/AGENTS.md`
- `.agent/PROMPT_EDUNI_READING_CAMERA_PICKER_IMPLEMENT_51.md`
- `EDUNI_READING_CAMERA_PICKER_IMPLEMENT_REPORT_51.md`
- `nice-gui-1-1-7/portal_app/static_games/eduni_reading_journal.html`
- `nice-gui-1-1-7/tests/test_reading_journal.py`

## 1. Git gate

Confirm:

- current branch = `feature/reading-camera-picker`
- product/test implementation candidate =
  `6771e6d58e985fbc28d6158af0ae870f0fb47d0c`
- any later commit before the Verify 52 report is documentation-only
- branch is based on production base
  `c8ca644ed353250b451e8d6ac31f96c6961a7d7c`
  or a clearly understood descendant relationship
- no merge/deploy occurred from this feature branch

Record:

- current branch HEAD
- base HEAD
- merge base
- ahead/behind counts
- exact changed product/test files

If product/test code changed after the candidate without a new reviewed implementation
report, verdict = BLOCKED.

## 2. Static HTML contract

Independently inspect the final HTML.

Required camera input:

- dedicated camera input exists
- `type="file"`
- accepts image content
- contains exactly the intended native camera hint:
  `capture="environment"`
- does not contain `multiple`

Required gallery input:

- dedicated gallery input exists
- `type="file"`
- accepts safe image types
- contains NO `capture` attribute
- does not contain `multiple`

Required visible actions:

- `📷 카메라로 촬영`
- `🖼️ 갤러리에서 선택`

The camera action must target only the camera input.
The gallery action must target only the gallery input.

Confirm the buttons are explicit user actions and the page does not request camera
access on load.

## 3. Shared processing gate

Verify both inputs converge on one shared image-processing path.

Confirm shared behavior preserves:

- file/type validation
- image decode
- maximum-side resizing
- JPEG conversion
- preview update
- stale async callback protection
- `imageProcessing` lifecycle
- create mode image payload
- edit mode `coverAction = replace`
- existing photo keep behavior
- remove-photo behavior
- input value reset after processing
- input reset when clearing/editing/removing

Reject unnecessary duplicated camera/gallery processing logic if it creates divergent
behavior.

Confirm there is still no automatic upload immediately after capture or selection.

The image must persist only when the normal Reading Journal save action is submitted.

## 4. Backend compatibility

Confirm this UI change does NOT alter:

- Reading Journal API shape
- PostgreSQL schema
- Reading Journal storage layer
- cover server storage format
- image-size server limit
- routes
- AI
- Docker Compose
- ports
- production scripts

No backend change should be required.

## 5. Focused source/adversarial checks

Check for common regressions:

- camera input accidentally wired to gallery button
- gallery input accidentally wired to camera button
- `capture` copied onto gallery input
- old ambiguous single-input control remains active
- double event processing from two listeners plus shared handler
- same-file re-selection fails because input value is not cleared
- stale async image job can overwrite a newer selection
- remove-photo does not reset both new inputs
- edit mode loses existing image when neither new action is used
- button click submits the form unexpectedly
- narrow mobile layout causes horizontal overflow

Any of the above = FAIL if reproduced.

## 6. Automated validation

From repository root:

~~~powershell
cd nice-gui-1-1-7
python -m unittest tests.test_reading_journal
python -m unittest tests.test_routes
python scripts/validate_content.py
$env:PYTHONUTF8='1'
python -m unittest discover -s tests
Remove-Item Env:PYTHONUTF8
python -m compileall -q portal_app tests
cd ..
git diff --check
~~~

Record exact totals, failures, errors, and skips.

Expected baseline:

- Reading Journal: 16 tests
- routes: 7 tests
- full suite: 204 tests, 1 skipped

The existing Windows CP949 issue is environment-only if the suite passes unchanged
under `PYTHONUTF8=1`.

Do not modify product/test code to work around console encoding.

## 7. Headed browser verification

Use only an isolated local app on an unused loopback high port.

Do not use production 8081.
Do not touch host 8080.

At a mobile viewport approximately 360×800 verify:

- camera button visible
- gallery button visible
- camera button appears first
- no horizontal overflow
- no overlap/cutoff
- gallery input can receive a synthetic image
- camera input can receive a synthetic image
- both produce the same preview pipeline
- selection A followed by selection B leaves preview B
- photo removal clears preview
- repeated selection remains possible
- edit-mode existing photo remains if user does not choose/remove a new photo
- no uncaught page errors
- no serious console errors

Do not save a production or persistent fake reading record.

## 8. Physical mobile camera verification

This feature specifically addresses a real mobile-device behavior, so actual device
evidence is preferred.

If an authorized physical Android/iOS device and browser are available without
deploying to production, test:

1. open the isolated Reading Journal page from the device;
2. tap `카메라로 촬영`;
3. record whether the browser opens the native camera directly or presents a
   system chooser;
4. if camera opens, record whether rear/environment camera is selected/requested;
5. capture a test image;
6. confirm returning to the page shows the preview;
7. tap `갤러리에서 선택`;
8. confirm normal gallery/picker behavior remains separate.

Do not require camera permission before the user taps the camera action.

### Hardware-unavailable rule

If no physical mobile-device path is available to the verifier, this does NOT by
itself block PASS.

Instead report:

`PHYSICAL CAMERA: NOT VERIFIED — PLATFORM ACCEPTANCE REQUIRED`

PASS may still be issued only if all static, automated, and headed-browser gates pass.

The report must explicitly state that HTML `capture="environment"` is a browser
hint and cannot guarantee that every browser bypasses its chooser UI.

## 9. Privacy/security

Confirm no new:

- getUserMedia stream
- persistent camera stream
- background camera access
- geolocation
- EXIF extraction
- analytics
- cloud upload
- external image service
- dependency
- write-before-save behavior

Camera access must remain user initiated.

## 10. Diff scope

Expected product/test diff relative to base:

- `nice-gui-1-1-7/portal_app/static_games/eduni_reading_journal.html`
- `nice-gui-1-1-7/tests/test_reading_journal.py`

Prompt/report files are documentation.

If unrelated product files changed, investigate and fail/block if not justified.

## 11. Cleanup

Stop/remove only isolated verification processes and temporary browser/test files.

Do not touch:

- production `eduni-game`
- production `eduni-postgres`
- production data
- production 8081
- host 8080
- Nextcloud
- unrelated Docker resources

## 12. Report

Create:

`EDUNI_READING_CAMERA_PICKER_VERIFY_REPORT_52.md`

Include:

- exact candidate SHA
- exact current branch HEAD
- exact base HEAD
- ahead/behind and merge-base
- static camera input result
- static gallery input result
- shared processing result
- backend compatibility result
- adversarial checks
- focused test totals
- full-suite total/skips
- compileall
- content validation
- diff-check
- headed mobile browser result
- physical mobile-camera result or explicit not-verified marker
- platform/browser limitation
- confirmation production 8081 untouched
- confirmation host 8080 untouched
- confirmation no product/test changes during Verify 52
- confirmation no PR/merge/deploy occurred

Commit/push only the report to:

`feature/reading-camera-picker`

Do not create a PR.
Do not merge.
Do not deploy.

## 13. Final verdict

Use exactly one:

`READING CAMERA PICKER VERIFY PASS — READY FOR PR`

`READING CAMERA PICKER VERIFY FAIL`

`BLOCKED`

Stop after report commit/push.
