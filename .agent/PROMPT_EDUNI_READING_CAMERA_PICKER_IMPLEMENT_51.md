# EDUNI Reading Journal — Camera / Gallery Split Implement 51

## Mission

Improve Reading Journal cover-photo input so mobile users can explicitly choose:

1. **카메라로 촬영** — request the device's rear camera immediately on supported mobile browsers
2. **갤러리에서 선택** — open the normal image picker/gallery

Repository: `JongPyoShin/eduni-links`
Branch: `feature/reading-camera-picker`
Base: `feature/eduni-space-mvp`

Branch creation baseline:

`c8ca644ed353250b451e8d6ac31f96c6961a7d7c`

This base is the production state after:

`EDUNI PRODUCTION DEPLOY PASS — READING JOURNAL LIVE`

Do not merge.
Do not deploy.
Do not touch production containers.
Do not touch host 8080.
Do not touch production 8081.

## Read first

- `AGENTS.md`
- `nice-gui-1-1-7/AGENTS.md`
- `EDUNI_PRODUCTION_DEPLOY_REPORT_50.md`
- `nice-gui-1-1-7/portal_app/static_games/eduni_reading_journal.html`
- `nice-gui-1-1-7/tests/test_reading_journal.py`

Read only additional targeted files if required.

## Current behavior

The Reading Journal currently uses one hidden file input equivalent to:

~~~html
<input id="coverInput"
       type="file"
       accept="image/jpeg,image/png,image/webp"
       capture="environment">
~~~

with one visible label:

`책 사진 찍기 / 고르기`

On the user's mobile device this still opens the gallery/file picker rather than
giving a clear direct-camera action.

The existing image pipeline already:

- validates JPEG/PNG/WEBP
- resizes large images
- converts prepared image to JPEG
- previews it
- protects against stale async image callbacks
- supports create/edit/replace/remove

Preserve that behavior.

## 1. UI requirement

Replace the ambiguous single photo action with two explicit actions.

Required visible actions:

- `📷 카메라로 촬영`
- `🖼️ 갤러리에서 선택`

The UI should remain mobile-first and fit cleanly on narrow screens.

Recommended structure:

- one dedicated hidden camera input
- one dedicated hidden gallery input
- two real buttons that trigger their corresponding input
- the existing preview area
- existing photo-remove action

Do not make the whole cover card the only clickable target anymore.

Use accessible button labels and preserve keyboard behavior.

## 2. Dedicated camera input

Create a dedicated camera input with semantics equivalent to:

~~~html
<input
  id="cameraInput"
  type="file"
  accept="image/*"
  capture="environment">
~~~

Requirements:

- `capture="environment"` must be present only on the camera input
- request the rear/environment camera
- do not use `multiple`
- camera button must activate this exact input
- reset the input value after processing so taking another photo of the same file/name is possible

This is the primary native-camera path.

Do not add a camera upload endpoint.
Do not send anything before the user saves the Reading Journal record.

## 3. Dedicated gallery input

Create a second hidden input for gallery selection.

Requirements:

- accept JPEG/PNG/WEBP or equivalent safe image MIME types
- **must not** contain a `capture` attribute
- gallery button must activate this exact input
- reset its value after processing

The gallery path must continue to work exactly as today.

## 4. Shared image processing

Do not duplicate the image-processing implementation.

Refactor the current `coverInput change` logic into one shared helper used by
both inputs.

Both camera and gallery must flow through the same existing safety behavior:

- type validation
- image decode
- resize
- JPEG conversion/quality behavior
- stale job generation protection
- preview update
- edit `coverAction = replace`
- error handling
- imageProcessing state
- remove-photo behavior

Preserve the existing server payload/API contract.

Do not modify backend storage unless absolutely required. It should not be needed.

## 5. Preview behavior

After either:

- taking a camera photo, or
- selecting a gallery photo

show the same existing preview.

The user must still press the normal Reading Journal save action to persist the
record.

Do **not** auto-upload immediately after capture.

Reason:

- prevents accidental production records
- preserves the existing create/edit transaction flow
- preserves image validation before save

When editing an existing record:

- camera capture can replace the image
- gallery selection can replace the image
- remove photo still works
- choosing neither keeps the existing image

## 6. Camera/browser compatibility

The production EDUNI site may be accessed from a mobile browser or WebView.

The native `capture="environment"` file-input behavior is browser/platform
controlled. Implement the standards-compatible native path first.

Do not add `getUserMedia()` as a hidden fallback in this change.

Reason:

- `getUserMedia()` generally requires a secure context
- production access may not always be HTTPS
- camera permission/stream lifecycle would add a larger new feature surface

If a supported mobile browser ignores `capture`, retain a clear fallback message
or normal picker behavior without breaking gallery selection.

Do not falsely claim HTML can force every browser to open the camera.

## 7. UX details

Preferred layout on mobile:

- camera button first and visually primary
- gallery button second
- photo remove action remains available after image selection
- existing preview remains large enough to confirm the captured book cover

Use the existing visual language of the Reading Journal.

Avoid:

- modal complexity
- new libraries
- icons that require external CDN assets
- camera permission prompts on page load
- auto-opening camera on page load

Camera access should occur only after explicit user action.

## 8. Security/privacy

Preserve current privacy boundaries.

Do not add:

- camera stream persistence
- background camera access
- EXIF extraction
- geolocation
- cloud upload
- analytics
- external image service
- new third-party dependency

Images must remain in the existing Reading Journal storage flow.

## 9. Automated tests

Extend focused Reading Journal tests to cover the new contract.

At minimum verify the rendered HTML/source contains:

- separate camera input
- camera input has `capture="environment"`
- camera input accepts images
- separate gallery input
- gallery input does NOT contain `capture`
- visible camera action text
- visible gallery action text
- both inputs are wired to shared image processing
- existing remove-photo semantics remain
- existing create/edit image payload behavior remains

Do not make tests rely on actual camera hardware.

Run:

~~~powershell
cd nice-gui-1-1-7
python -m unittest tests.test_reading_journal
python -m unittest tests.test_routes
python scripts/validate_content.py
python -m unittest discover -s tests
python -m compileall -q portal_app tests
cd ..
git diff --check
~~~

Record exact totals.

## 10. Browser verification

Use an isolated local/high-port app only if browser verification is available.

Do not use production port 8081.
Do not use or probe host 8080.

Verify at mobile viewport approximately 360x800:

- both buttons are visible
- no horizontal overflow
- gallery input can accept an injected test image
- preview appears
- remove-photo still works
- replacing an existing preview works
- no uncaught page error

Automated browser tooling is not expected to prove that physical Android/iOS
camera hardware launches.

If an actual mobile-device/browser test is available, additionally record:

- browser/device
- whether `카메라로 촬영` opens camera directly
- whether rear camera is requested
- whether captured image returns to preview

Do not block implementation solely because physical hardware is unavailable.

## 11. Scope guard

Expected product changes should be narrow, primarily:

- `nice-gui-1-1-7/portal_app/static_games/eduni_reading_journal.html`
- `nice-gui-1-1-7/tests/test_reading_journal.py`

Modify another product file only if truly required and explain why.

Do not change:

- PostgreSQL schema
- Reading Journal API
- cover-image server storage format
- AI
- Docker Compose
- production scripts
- ports
- Hanja
- other games

## 12. Git/report

Create:

`EDUNI_READING_CAMERA_PICKER_IMPLEMENT_REPORT_51.md`

Report:

- exact base SHA
- changed files
- UI structure
- camera input attributes
- gallery input attributes
- shared processing refactor
- focused test totals
- full-suite result
- browser verification result
- physical-camera verification result if available
- remaining browser/platform limitation
- confirmation no merge/deploy occurred
- confirmation host 8080 and production 8081 were untouched

Commit product/test changes and report to:

`feature/reading-camera-picker`

Push the branch.

Do not create a PR yet.
Do not merge.
Do not deploy.

## 13. Final verdict

Use exactly one:

`READING CAMERA PICKER IMPLEMENT PASS — READY FOR VERIFY`

`READING CAMERA PICKER IMPLEMENT FAIL`

`BLOCKED`

Stop after commit/push.
