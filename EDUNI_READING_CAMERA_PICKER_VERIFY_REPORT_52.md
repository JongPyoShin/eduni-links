# EDUNI Reading Journal Camera Picker — Verify 52 Report

## Verdict

`READING CAMERA PICKER VERIFY PASS — READY FOR PR`

All required source, automated, and isolated headed-browser gates passed. Physical mobile-camera behavior remains unverified as allowed by Prompt 52.

## Git gate

- Repository: `JongPyoShin/eduni-links`
- Branch: `feature/reading-camera-picker`
- Implementation candidate: `6771e6d58e985fbc28d6158af0ae870f0fb47d0c`
- Branch HEAD at verification start: `6fbf9d1329bd673925189477f7080526564c1587`
- Base branch HEAD: `c8ca644ed353250b451e8d6ac31f96c6961a7d7c`
- Merge base: `c8ca644ed353250b451e8d6ac31f96c6961a7d7c`
- Ahead / behind at verification start: `3 / 0`
- The only commit after the implementation candidate was the Verify 52 instruction document. The three commits from base are Prompt 51 docs, the candidate implementation, and Verify 52 docs; no merge commit or deployment commit is present.
- Product/test diff from base is exactly:
  - `nice-gui-1-1-7/portal_app/static_games/eduni_reading_journal.html`
  - `nice-gui-1-1-7/tests/test_reading_journal.py`
- No product or test file was changed during Verify 52.

## Static and adversarial inspection

- Camera input is a dedicated `type="file"` input with `accept="image/*" capture="environment"`, no `multiple`, and it is the only input carrying `capture`.
- Gallery input is a separate `type="file"` input accepting JPEG/PNG/WEBP, with neither `capture` nor `multiple`.
- The exact Korean camera and gallery actions are present, are `type="button"`, and each button activates only its corresponding input. No old `coverInput` control remains.
- Both change events reference one `handleCoverChange` implementation; there is no duplicate handler or separate camera/gallery processing path. No `getUserMedia` or `navigator.mediaDevices` access exists, and camera access is only requested after explicit button action.
- Shared processing retains JPEG/PNG/WEBP validation, the 15 MB client-side limit, image decode, maximum-side 1600 px resize, JPEG conversion at quality 0.82, preview, stale-generation protection, processing/error state, and input reset in `finally`.
- Create payload remains attached to the normal form submit. Edit starts at `coverAction = 'keep'`; replace/remove update the existing action, and both inputs reset on form reset, edit start, and photo removal. The file-change handler itself does not upload or submit.
- Remove-photo remains outside the clipped preview container. Both actions fit below the preview without overlap in the tested narrow viewport.
- Diff inspection found no changes to routes, Reading Journal API, database/storage modules or schema, cover server format/limits, AI, dependencies, Docker Compose, ports, or production scripts.

## Automated verification

| Check | Result |
|---|---|
| `python -m unittest tests.test_reading_journal` | PASS — 16 tests |
| `python -m unittest tests.test_routes` | PASS — 7 tests |
| `python scripts/validate_content.py` | PASS — 1 enabled activity |
| `PYTHONUTF8=1 python -m unittest discover -s tests` | PASS — 204 tests, 1 skipped |
| `python -m compileall -q portal_app tests` | PASS |
| `git diff --check` | PASS |

The full suite required `PYTHONUTF8=1` for the known Windows CP949 decoding issue in existing Node subprocess tests; it passed unchanged.

## Headed browser verification

- Browser: headed Google Chrome, top-level local page at `http://127.0.0.1:18719/reading`.
- The verification app used a fresh temporary SQLite database/media directory; `/reading/api/health` reported `sqlite`. No production hostname, production port 8081, or host port 8080 was accessed.
- Chrome/Windows imposed a minimum popup width: measured CSS viewport was `420×902`, not exactly the requested approximate `360×800`. This is within the page's `max-width: 520px` mobile styling breakpoint. Both actions were visible; `scrollWidth` equaled `clientWidth` (403 px) and no horizontal overflow was present.
- Injected synthetic PNG A through `galleryInput` at `2000×1200`; it followed the common path and previewed as JPEG `1600×960`.
- Injected synthetic PNG B through `cameraInput` at `1200×2000`; the preview changed from A to JPEG `960×1600`. Both inputs reset to an empty value after processing. Re-selecting a synthetic file with the same filename also processed and refreshed the preview.
- Clicked the form's `사진 제거` control: preview `src` cleared, `has-image` was removed, the remove control hid, both input values were empty, and Save was re-enabled.
- For edit-mode keep behavior, created one temporary local-only fixture with a visible `480×720` cover in the isolated SQLite app, opened its edit action, and confirmed the existing cover remained loaded with no camera/gallery selection or removal. The normal Save action was not clicked; source inspection confirmed the edit payload remains `cover_action: keep` when unchanged. The fixture record and cover were subsequently removed through scoped cleanup.
- After resetting network capture, synthetic image selection and edit interaction generated zero API requests. No page `error`, `unhandledrejection`, or `console.error` was captured during the tested interactions.
- Existing-cover edit screenshot: `C:\Users\GMK\.browser-control\artifacts\screenshot\2026-09-26\screenshot-1790399601086-3628a0a671ea.png`.
- Replacement-preview screenshot: `C:\Users\GMK\.browser-control\artifacts\screenshot\2026-09-26\screenshot-1790399902126-c940fb011668.png`.

Browser Control's scroll command returned `BACKEND_ERROR` on this local popup. After the failure, a narrow `scrollIntoView` was used only to reveal the local edit button; the target was then re-snapshotted and activated by a normal headed-Chrome click. This did not affect product files or test results.

## Physical camera, privacy, and cleanup

`PHYSICAL CAMERA: NOT VERIFIED — PLATFORM ACCEPTANCE REQUIRED`

No authorized Android/iOS device path was available. The `capture="environment"` attribute is browser/platform-controlled and cannot guarantee direct rear-camera launch in every browser or WebView. No `getUserMedia`, background camera access, EXIF/geolocation, analytics, cloud/external image upload, new dependency, or write-before-save behavior was added. Synthetic selections remained in the browser until the test session closed; no UI record save was submitted.

- The temporary local app process and Browser Control task session were stopped/closed.
- Read-only verification after cleanup confirmed zero `child_profile`, `reading_record`, `activity_session`, `process_badge_event`, and `parent_settings` rows; no fixture cover file remains.
- The generated SQLite file and empty test-data directories remain at `C:\Users\GMK\AppData\Local\Temp\eduni-reading-picker-verify52-6fbf9d1`. Both recursive and exact-path filesystem removal commands were rejected by the local command policy. This residual contains only the test schema and zero rows; no process is using it. No production data is present.
- Production `eduni-game` / port 8081 and host port 8080 were untouched.
- No PR, merge, or deployment occurred.
- Only this verification report is to be committed and pushed from Verify 52.
