# EDUNI Reading Journal Camera Picker — Implementation Report 51

## Result

Implemented the separate camera and gallery selection paths on `feature/reading-camera-picker`. The change is limited to the Reading Journal page and its focused tests. No API, database, image-storage, production, or deployment code was changed.

## Baseline and changed files

- Prompt baseline: `c8ca644ed353250b451e8d6ac31f96c6961a7d7c`
- Feature branch started at `8bb9e16758479cc797ffc988d80c11eedeb091b1` (Prompt 51 documentation commit).
- `nice-gui-1-1-7/portal_app/static_games/eduni_reading_journal.html`
- `nice-gui-1-1-7/tests/test_reading_journal.py`
- `EDUNI_READING_CAMERA_PICKER_IMPLEMENT_REPORT_51.md`

## Implementation

- Added two real, keyboard-operable buttons: `📷 카메라로 촬영` and `🖼️ 갤러리에서 선택`. Each activates its corresponding hidden file input; the camera action is first and visually primary.
- The camera input uses `accept="image/*" capture="environment"` and has no `multiple` attribute. The gallery input accepts JPEG/PNG/WEBP and has no `capture` attribute.
- Both change events use one shared image-processing handler. Existing type validation, decode/resize/JPEG conversion, preview, stale-job guard, error handling, processing state, and create/edit `coverAction` payload behavior are preserved. Both inputs reset after processing and when clearing/editing/removing a photo, allowing same-name re-selection.
- The remove action remains available outside the clipped preview area. The mobile layout stacks the controls below the preview and avoids narrow-screen horizontal overflow.
- No automatic upload, camera stream, new endpoint, dependency, or backend change was introduced.

## Automated verification

| Check | Result |
|---|---|
| `python -m unittest tests.test_reading_journal` | PASS — 16 tests |
| `python -m unittest tests.test_routes` | PASS — 7 tests |
| `python scripts/validate_content.py` | PASS — 1 enabled activity |
| `python -m unittest discover -s tests` | PASS — 204 tests, 1 skipped, with `PYTHONUTF8=1` |
| `python -m compileall -q portal_app tests` | PASS |
| `git diff --check` | PASS (Git emitted only its LF-to-CRLF advisory) |

The first full-suite run under the machine's default Windows CP949 locale encountered three existing Node-subprocess test errors while decoding UTF-8 output. Re-running the same suite with `PYTHONUTF8=1` completed successfully; no source or test workaround was added for the environment issue.

## Headed browser verification

Used the isolated local app at `127.0.0.1:18717/reading` in headed Chrome; no production URL or host port was used. At a narrow mobile viewport of approximately 360×800 (measured CSS viewport 362×810):

- Both actions were visible, with the camera action first.
- No horizontal overflow was present.
- Injected test images through the gallery and camera input paths reached the shared handler. A 2000×1200 PNG preview became a 1600×960 JPEG; a replacement 1200×2000 PNG became a 960×1600 JPEG.
- Preview replacement and photo removal both worked, and the input values were reset after processing.
- No uncaught page error was observed. The save action was not submitted; the browser check did not create a Reading Journal record.
- Final mobile preview screenshot: `C:\Users\GMK\.browser-control\artifacts\screenshot\2026-09-26\screenshot-1790397440207-08aaea90a972.png`.

The input paths and preview were exercised with synthetic images; physical Android/iOS camera launch and rear-camera behavior were not tested. `capture="environment"` is a browser/platform hint and cannot force every browser or WebView to open a camera. The UI communicates this limitation and retains the gallery path.

## Scope and disposition

- Production `eduni-game` / port 8081: untouched.
- Host port 8080: untouched and not probed.
- No merge, PR, or deploy was performed.
- Changes are intended only for commit and push to `feature/reading-camera-picker`; no production action is authorized by this report.
