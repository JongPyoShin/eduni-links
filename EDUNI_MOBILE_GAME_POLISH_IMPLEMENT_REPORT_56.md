# EDUNI Mobile Game Polish — Implement Report 56

Date: 2026-09-28
Branch: `feature/eduni-mobile-game-polish`
Baseline: `6024366fdc0199b239269bb11609eaa7861bdc3b`

## Findings and changes

- **의준 링크:** Runtime reproduction showed the permanent left action column taking 64–96 px on narrow screens; at short landscape height the 28 px minimum tile could also exceed the space actually available. Mobile/short-landscape now uses a four-action bottom dock (pause, hint, shuffle, more); the More modal dispatches to the existing new-game, codex, parent-menu, and sound controls. Desktop keeps its toolbar. Tile sizing now follows the measured board panel without the old 28 px floor, keeping the path canvas aligned through resize/orientation changes.
- **버블:** The real `/bubble` DOM inserts its game root as a body sibling rather than inside `.nicegui-content`; the old global wrapper sizing therefore did not own the visible viewport. In addition, the canonical question records have `target`/`answerLabel` but no `choices`, while the renderer dereferenced `choices.length`, producing a real JS exception and an unusable question screen. The game root now owns the viewport with a fixed, safe-area-aware layout; the shell, prompt, field, bubbles, feedback, and actions use available dimensions, including short landscape. Canonical records are adapted into valid choices from existing answer labels without changing their correct answer or learning content.
- **한자 슈터:** The former canvas forced a logical minimum of 320×480 even when the actual landscape canvas was about 778×205, placing the launcher below the visible canvas and skewing pointer aim. Canvas geometry, launcher, radius, and resize handling now use measured CSS-pixel dimensions. The page has a mobile-first navy/blue-violet arcade presentation with a prominent target Hanja card, compact score/remaining chips, and reachable controls. The shared shooter logic and gameplay rules were not changed.

## Changed files

- `nice-gui-1-1-7/app.py`
- `nice-gui-1-1-7/portal_app/static_games/eduni_link.html`
- `nice-gui-1-1-7/tests/test_mobile_game_polish.py` (6 focused contract tests)
- `EDUNI_MOBILE_GAME_POLISH_IMPLEMENT_REPORT_56.md`

## Validation

- Focused mobile contract tests: **6 passed**.
- Route tests: **7 passed**.
- AI tests: **25 passed**.
- Content validation: **VALID — 1 enabled activity**.
- Full test discovery: **210 passed, 1 skipped**.
- `compileall -q portal_app tests app.py`: **passed**.
- `git diff --check`: **passed** (only Git's existing LF/CRLF working-copy notices).

### Headed Chrome viewport matrix

Local isolated app: `http://127.0.0.1:18789` (temporary SQLite and reading-data paths). The browser used CSS viewport dimensions with mobile/touch emulation.

| Game / route | 360×800 | 390×844 | 412×915 | 800×360 |
|---|---|---|---|---|
| Link `/link` | 200; board 319×319; bottom dock visible | 200; board 349×349; bottom dock visible | 200; board 371×371; bottom dock visible | 200; board 202×202; compact dock visible |
| Bubble `/bubble` | 200; field/actions visible | 200; field 374×502; actions visible | 200; field/actions visible | 200; field 784×106; prompt and actions visible |
| Shooter `/bubble-shooter` | 200; canvas 344×610; controls visible | 200; canvas 374×654; controls visible | 200; canvas 396×725; controls visible | 200; canvas 778×205; controls visible |

Across all 12 route/viewport combinations: document width matched the viewport (no horizontal overflow); the main board/field/canvas and required controls were visible; there were **0 uncaught page errors, 0 console errors, and 0 HTTP responses ≥400**. Bubble answer selection/next-question flow and Link More-menu actions were exercised with pointer input. On the shooter landscape canvas, a pointer aim/release was processed and the target advanced; a scored correct hit was not established in that interaction check.

Screenshots captured from headed Chrome:

- `C:/Users/GMK/AppData/Local/Temp/eduni-mobile-game-polish-56/screenshots/link_390x844.png`
- `C:/Users/GMK/AppData/Local/Temp/eduni-mobile-game-polish-56/screenshots/link_800x360.png`
- `C:/Users/GMK/AppData/Local/Temp/eduni-mobile-game-polish-56/screenshots/bubble_390x844.png`
- `C:/Users/GMK/AppData/Local/Temp/eduni-mobile-game-polish-56/screenshots/bubble_800x360.png`
- `C:/Users/GMK/AppData/Local/Temp/eduni-mobile-game-polish-56/screenshots/bubble_shooter_390x844.png`
- `C:/Users/GMK/AppData/Local/Temp/eduni-mobile-game-polish-56/screenshots/bubble_shooter_800x360.png`

## Scope and remaining risk

- Existing Link matching/path, hints, shuffle, stages, score, timer, pause, sound, codex, parent settings, local storage, and images remain wired to their original controls.
- Bubble retains the 10-round flow, score/stars, feedback, explanation, sound, restart, and resize behavior.
- Shooter retains canonical questions, target/answer mapping, shared collision/shot rules, physics, scoring, round flow, sound, praise, and explanation. The only gameplay-script adjustment is responsive canvas geometry.
- Validation used headed Chrome mobile emulation, not a physical handset. A successful correct-scoring shooter hit was not demonstrated in the manual pointer check; automated shared-logic coverage and the existing gameplay tests remain in place.
- Production EDUNI/8081 and host 8080 were **not contacted or modified**. No merge or deploy occurred. This implementation is local verification only; no PR was created.

## Verdict

**EDUNI MOBILE GAME POLISH IMPLEMENT PASS — READY FOR VERIFY**
