# BUBBLE SHOOTER PHASE 2 — DOCKER PACKAGING FIX REPORT (Prompt 34)

**Date:** 2026-09-21
**Branch:** `fix/bubble-shooter-phase2-docker-shared-data`
**Base:** `feature/eduni-space-mvp` (`b6e8eda`)
**PR:** Draft — targeting `feature/eduni-space-mvp`

---

## 1. Docker Packaging Bug

`app.py` resolves canonical dataset at:

```python
CANONICAL_QUESTIONS_PATH = Path(__file__).parent.parent / 'shared' / 'bubble_shooter_questions.json'
```

Inside Docker (WORKDIR=/app), this resolves to `/shared/bubble_shooter_questions.json`.

The Dockerfile copied `nice-gui-1-1-7 -> /app` but did **not** copy `shared/`. The canonical path did not exist in the image. The runtime silently fell back to legacy quiz files.

---

## 2. Dockerfile Change

**Before:**
```dockerfile
COPY nice-gui-1-1-7 /app
COPY files-mentioned-by-the-user-oracle/outputs /app/hanja-data
```

**After:**
```dockerfile
COPY nice-gui-1-1-7 /app
COPY shared /shared
COPY files-mentioned-by-the-user-oracle/outputs /app/hanja-data
```

One line added: `COPY shared /shared`

---

## 3. Canonical Data Verification

| Check | Value |
|-------|-------|
| Repository file SHA-256 | `5144fba397854d1632bc2e82c49d37cf2991583dfe8e6a8a9f3e54562a10a9a3` |
| Image file SHA-256 | `5144fba397854d1632bc2e82c49d37cf2991583dfe8e6a8a9f3e54562a10a9a3` |
| Byte-identical | **YES** |
| schemaVersion | 1 |
| Question count | 122 |
| Duplicates | 0 |
| First entry | 不 불 |
| Last entry | 정 정 |

---

## 4. Container Runtime Proof

| Check | Result |
|-------|--------|
| `CANONICAL_QUESTIONS_PATH.exists()` | True |
| `_load_canonical_questions()` count | 122 |
| Legacy fallback used | **NO** |
| `/bubble-shooter` HTTP 200 | Yes (449,534 bytes) |
| `/baduk` HTTP 200 | Yes (68,330 bytes) |
| `/portal` HTTP 200 | Yes (27,044 bytes) |
| `/healthz` OK | Yes |

---

## 5. Image / Container

| Item | Value |
|------|-------|
| Image | `eduni-links-eduni-game:latest` |
| Temp container | `eduni-test-34` (stopped/removed) |
| Test port | 18082 |
| Production 8081 | **NOT touched** |
| Production 8080 | **NOT touched** |

---

## 6. Browser Smoke (isolated temp container)

Desktop 1280×800: **16/16 passed**

- Page loads, Canvas exists, logic loaded
- resolveShot correct hit (+100, no pressure)
- miss adds pressure
- isDanger works
- isGenerationValid works
- Canvas has content, stable render, no JS errors

Mobile 360×800: **18/18 passed**

- Same logic/API checks as desktop
- Canvas renders correctly at mobile viewport
- /baduk 200, /portal 200
- No console errors

---

## 7. Validation

| Suite | Result |
|-------|--------|
| JS unit + fixture | 32/32 |
| Python integration + routes + packaging | 39/39 |
| Android JVM | 43/43 (UP-TO-DATE) |
| `git diff --check` | clean |

---

## 8. Android APK

| Item | Value |
|------|-------|
| Path | `eduni-android-portal/app/build/outputs/apk/debug/app-debug.apk` |
| Size | 11.28 MB |
| SHA-256 | `757160535b8286f357ab7031f5d49b4e4db4aa9fc53c15f5fda846d05c847db8` |

---

## 9. Diff Scope

| File | Change |
|------|--------|
| `nice-gui-1-1-7/Dockerfile` | +1 line (`COPY shared /shared`) |
| `nice-gui-1-1-7/tests/test_bubble_shooter_integration.py` | +41 lines (6 packaging tests) |

No changes to: Bubble Shooter logic, canonical dataset content, Android runtime, Baduk, portal, production compose, production ports.

---

## 10. Remaining Risks

1. Production deployment not yet performed (requires Prompt 35)
2. No emulator smoke on Android APK

---

## Verdict

**PACKAGING FIX PASS — READY FOR MERGE**
