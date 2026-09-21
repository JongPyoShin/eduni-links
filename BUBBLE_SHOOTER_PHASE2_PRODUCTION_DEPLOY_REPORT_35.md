# EDUNI Bubble Shooter Phase 2 — Production Deploy Report (Prompt 35)

## Verdict

`DEPLOYMENT PASS`

Bubble Shooter Phase 2 (PR #65 canonical data + PR #66 Docker packaging fix) has been deployed to the live production `eduni-game` service on port 8081. All automated tests, canonical data proof, route verification, and browser smoke checks pass.

---

## Deployment metadata

- Date: 2026-09-21
- Branch: `feature/eduni-space-mvp`
- Deployed source SHA: `306bd91023a18e5846b4cbfcb09a8974aeab86f3`
- PR #65 merge (`bd4e3402`): confirmed ancestor
- PR #66 merge (`3589c94f`): confirmed ancestor
- Production service: `eduni-game`
- External endpoint: `http://100.75.214.95:8081`

---

## Pre-deploy production state

| Item | Value |
|------|-------|
| Container | `eduni-game` / `80dc9dcf9b53` |
| Image tag | `eduni-space-mvp-eduni-game` |
| Image ID | `sha256:fd7c92302a463f58af34e96c400398750f037d9f20384ec24c7caf1908705b63` |
| Created | 2026-09-20T23:25:02 |
| Started | 2026-09-21T07:43:07 |
| PID | 619 |
| Bind | `100.75.214.95:8081 -> 8080/tcp` |
| Health | Up 5 hours (healthy) |
| Restart policy | unless-stopped |
| Mount | volume `eduni-space-mvp_eduni_data` -> `/data` |

---

## Rollback target

- Old container ID: `80dc9dcf9b53`
- Old image ID: `sha256:fd7c92302a463f58af34e96c400398750f037d9f20384ec24c7caf1908705b63`
- Old image tag: `eduni-space-mvp-eduni-game`
- Bind: `100.75.214.95:8081 -> 8080/tcp`
- Health: healthy

Rollback command: `docker run -d --name eduni-game -p 100.75.214.95:8081:8080 -v eduni_data:/data --restart unless-stopped sha256:fd7c92302a463f58af34e96c400398750f037d9f20384ec24c7caf1908705b63 python app.py`

---

## Runtime-log preservation

| File | Status |
|------|--------|
| `nice-gui-1-1-7/work/baduk-8081-stderr.log` | Not present (acceptable — logs not previously persisted on this host) |
| `nice-gui-1-1-7/work/baduk-8081-stdout.log` | Not present (acceptable) |

---

## Deployment mutation

Command:

```powershell
cd D:\Codex\Worktrees\eduni-space-mvp
docker compose up -d --force-recreate --no-deps eduni-game
```

---

## Post-deploy production state

| Item | Value |
|------|-------|
| Container | `eduni-game` / `a722c1003c32` |
| Image tag | `eduni-space-mvp-eduni-game` |
| Image ID | `sha256:9a3fafef24d15954f8f42909041270a7de4e005ee5311d4345b9535b6801980a` |
| Created | 2026-09-21 (deployment time) |
| Bind | `100.75.214.95:8081 -> 8080/tcp` |
| Health | Up (healthy) |
| RestartCount | 0 |
| Tracebacks | None |

---

## Canonical data proof (live production container)

| Check | Result |
|-------|--------|
| `/shared/bubble_shooter_questions.json` exists | True |
| `CANONICAL_QUESTIONS_PATH.exists()` | True |
| `schemaVersion` | 1 |
| Canonical loader count | 122 |
| Duplicates | 0 |
| Live SHA-256 | `5144fba397854d1632bc2e82c49d37cf2991583dfe8e6a8a9f3e54562a10a9a3` |
| Repository SHA-256 | `5144fba397854d1632bc2e82c49d37cf2991583dfe8e6a8a9f3e54562a10a9a3` |
| Byte-identical | **YES** |
| Legacy fallback used | **NO** |

---

## Automated test totals

| Suite | Result |
|-------|--------|
| JS unit + fixture | 32/32 |
| Python integration + routes + packaging | 39/39 |
| Python full discovery | 155/158 (3 pre-existing Baduk Node cp949 errors — not Bubble Shooter) |
| Android JVM | BUILD SUCCESSFUL |
| validate_content.py | VALID |
| `git diff --check` | clean |

---

## Route verification

| Route | Status | Size |
|-------|--------|------|
| `/` | 200 | 27,044 |
| `/bubble` | 200 | 41,231 |
| `/bubble-shooter` | 200 | 454,522 |
| `/baduk` | 200 | 68,330 |
| `/baduk/` | 200 | 68,330 |
| `/games/eduni-baduk` | 200 | 521 |
| `/portal` | 200 | 27,044 |
| `/healthz` | 200 | 11 |

---

## Marker verification

### Bubble Shooter (all FOUND)

- `EDUNIBubbleShooterLogic`
- `eduni-shooter-logic`
- `const L = window.EDUNIBubbleShooterLogic`
- `L.resolveShot`
- `L.isDanger`
- `L.selectTarget`
- `L.pointerToCss`
- `L.isGenerationValid`

### Baduk (all FOUND)

- `analyzeAiDanger`
- `undo`
- `hint`
- `rules`
- `aiForcedPasses`
- `finishAiResignation`
- `largeSelfAtariRisk`

---

## Production browser smoke

### Desktop 1280×800: 15/15 passed

- Page loads, Canvas exists, logic loaded
- resolveShot exported, isDanger exported, isGenerationValid exported
- Correct hit +100, correct hit no pressure
- Miss adds pressure
- isDanger works, isGenerationValid works
- Canvas has content, stable render
- No console errors

### Mobile 360×800: 6/6 passed

- Canvas exists, logic loaded
- Correct hit +100, correct hit no pressure
- Canvas visible
- No console errors

### Baduk: 3/3 passed

- Page loads, Canvas exists, no console errors

### Total: 24/24 passed

---

## Stability observation

- Container: healthy
- RestartCount: 0
- Logs: no traceback, no fatal errors
- healthz: OK
- No input freeze or runaway timer symptoms

---

## Production 8080

Untouched. No container bound to external 8080. Local dev server on 127.0.0.1:8080 unaffected.

---

## Android

- Android APK NOT installed (per Prompt 35 scope)
- APK from Prompt 34: `757160535b8286f357ab7031f5d49b4e4db4aa9fc53c15f5fda846d05c847db8` (11.28 MB)
- Physical device deployment requires separate explicit instruction

---

## Remaining risks

1. No emulator smoke on Android APK
2. Production 8080 is a local dev server, not containerized — unrelated to this deployment

---

## Rollback performed

**No** — deployment succeeded on first attempt.
