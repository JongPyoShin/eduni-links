# EDUNI Bubble Shooter Phase 2 — Docker Canonical Data Packaging Fix (Prompt 34)

## Objective

Close the production packaging gap discovered after PR #65 merge.

Do **not** deploy production yet.

Current merged Phase 2 Web code resolves the canonical dataset at:

`Path(__file__).parent.parent / 'shared' / 'bubble_shooter_questions.json'`

Inside the current Docker image:

- `app.py` is copied to `/app/app.py`
- therefore the runtime canonical path resolves to:
  `/shared/bubble_shooter_questions.json`

But the current Dockerfile copies:

- `nice-gui-1-1-7 -> /app`
- Hanja output data -> `/app/hanja-data`

and does **not** copy repository `shared/`.

If deployed as-is, the Web runtime can silently fall back to legacy quiz files instead of using the merged 122-entry canonical Phase 2 dataset.

This prompt must make the smallest packaging fix, prove the container uses the canonical dataset, and hand off to a later production deployment prompt.

---

## Repository / current base

Repository:

`JongPyoShin/eduni-links`

Base branch:

`feature/eduni-space-mvp`

Required merged Phase 2 commit:

`bd4e340239cdeb0f6f93bfac865c1658fdaa6754`

Production service remains:

- service: `eduni-game`
- external endpoint: `http://100.75.214.95:8081`
- compose build context: repository root
- Dockerfile: `nice-gui-1-1-7/Dockerfile`

Do not modify or restart production in this task.

---

# 1. Create a dedicated packaging-fix branch

Fetch latest base.

Create:

`fix/bubble-shooter-phase2-docker-shared-data`

from current:

`origin/feature/eduni-space-mvp`

Open a Draft PR targeting:

`feature/eduni-space-mvp`

Suggested title:

`Fix Bubble Shooter Phase 2 canonical data packaging`

Do not work directly on the base branch.

Do not merge.

---

# 2. Read current deployment evidence

Read:

- root `AGENTS.md`
- `nice-gui-1-1-7/AGENTS.md`
- `docker-compose.yml`
- `nice-gui-1-1-7/Dockerfile`
- `nice-gui-1-1-7/app.py`
- `shared/bubble_shooter_questions.json`
- `BUBBLE_SHOOTER_PHASE2_WEB_ANDROID_PARITY_REPORT.md`
- `EDUNI_8081_BADUK_BUBBLE_PRODUCTION_DEPLOY_REPORT_31.md`

Confirm before editing:

- Docker build context is repository root
- container workdir is `/app`
- `app.py` canonical path resolves to `/shared/bubble_shooter_questions.json`
- current Dockerfile does not place the canonical file at that runtime path

Record this in the report.

---

# 3. Implement the smallest robust packaging fix

Preferred minimal solution:

Add a Dockerfile copy for the repository shared data so the existing runtime path is valid:

```dockerfile
COPY shared /shared
```

Place it in a sensible position before CMD.

Do not duplicate the canonical JSON manually into `nice-gui-1-1-7`.

Do not change the canonical source-of-truth location.

Do not introduce a network fetch.

Do not remove the Web legacy fallback in this packaging task.

If inspection shows a more robust minimal path is needed, such as an explicit shared-data environment variable, document why before implementing it. Avoid broad path refactors.

---

# 4. Add/extend packaging regression tests

Add a focused repository test that prevents this exact failure from returning.

Required checks should prove the deployment contract, not merely search for an arbitrary string.

At minimum verify:

- `app.py` canonical path resolves to the expected container location under current Docker WORKDIR/layout
- Dockerfile packages repository `shared/` to that expected location
- canonical JSON exists in repository source
- canonical JSON schemaVersion = 1
- canonical question count = 122
- no second manually maintained production canonical source is introduced

A targeted Python test is acceptable.

Keep existing Phase 2 tests.

---

# 5. Build the actual image

From repository root, build the same production service/image path used by compose.

Use the normal equivalent of:

```powershell
docker compose build eduni-game
```

Do **not** run `docker compose up` against production.

Do not recreate/restart the live `eduni-game` container.

Record the newly built local image ID separately from the currently running production image.

---

# 6. Prove canonical data exists inside the built image

Run an ephemeral container or equivalent non-production inspection against the newly built image.

Required proof:

```text
/shared/bubble_shooter_questions.json
```

exists inside the image.

Verify inside the image:

- file is readable
- schemaVersion = 1
- question count = 122
- no duplicate `hanja + reading`
- representative known entries are present

Record SHA-256 of:

1. repository `shared/bubble_shooter_questions.json`
2. built-image `/shared/bubble_shooter_questions.json`

They must be byte-identical unless a deliberate build transform is documented. Preferred result: identical hashes.

---

# 7. Prove the container runtime uses canonical data, not fallback

Run the newly built image as an **isolated non-production test container** on a temporary port.

Do not bind or replace production 8081.

Use a free local/test port.

Then verify:

- `/healthz` works
- `/bubble-shooter` HTTP 200
- runtime canonical path exists
- `_load_canonical_questions()` returns exactly 122 entries

Add a deterministic runtime proof that distinguishes canonical data from legacy fallback.

Preferred options:

- execute Python inside the test container and assert `len(_load_canonical_questions()) == 122`
- assert `CANONICAL_QUESTIONS_PATH.exists()`
- optionally compare one or more canonical-only entries if useful

Do not infer canonical usage merely because the page renders.

The acceptance condition is explicit: **production image layout is capable of serving Phase 2 canonical data without fallback.**

Stop/remove only the temporary test container after validation.

Do not touch the live production container.

---

# 8. Re-run focused Phase 2 validation

Minimum:

## Web

```powershell
cd nice-gui-1-1-7
node --test tests/bubble_shooter_logic.test.mjs tests/contract_fixture_runner.test.mjs
python -m unittest tests.test_bubble_shooter_integration
python -m unittest tests.test_routes
python scripts/validate_content.py
python -m unittest discover -s tests
```

Current independently verified baselines:

- JS: 32/32
- Python focused integration + routes: 33/33
- browser: 34/34
- full Python count: record actual current count

## Android

Because this packaging fix should not change Android source, rerun at least:

```powershell
cd ..\eduni-android-portal
.\gradlew.bat --no-daemon testDebugUnitTest
```

Current independent baseline:

- Android JVM: 43/43

If the count differs, report actual discovered tests and explain.

## Whitespace

```powershell
git diff --check
```

Must pass.

---

# 9. Browser regression against isolated new image

Run headed browser smoke against the temporary container/image, not production.

At minimum:

- desktop 1280×800
- mobile 360×800

Verify:

- Bubble Shooter loads
- canonical-backed target data available
- correct hit +100
- correct hit does not add pressure bubble
- miss adds exactly one pressure bubble
- restart race remains clean
- zero console errors

Also smoke:

- `/baduk`
- `/portal`

because the same image contains them.

No product behavior should change.

---

# 10. Android artifact build only

Phase 2 also changed native Android code.

Build the debug/test artifact using the project-supported command, e.g.:

```powershell
cd eduni-android-portal
.\gradlew.bat --no-daemon testDebugUnitTest assembleDebug
```

Record:

- test result
- APK path
- APK size
- APK SHA-256

Do **not** install to a device.

Do **not** uninstall or replace an existing app.

Do **not** clear app data.

Physical-device deployment is a separate authorized action.

---

# 11. Diff scope

The intended product/deployment-config diff for this PR should be extremely small.

Expected core product/config change:

- `nice-gui-1-1-7/Dockerfile`

Plus:

- focused regression test(s)
- Prompt/report documentation if required

No changes to:

- Bubble Shooter gameplay logic
- canonical dataset content
- Android runtime behavior
- Baduk
- portal UI
- production compose port bindings
- production 8080

If broader changes appear, stop and explain.

---

# 12. Report

Create:

`BUBBLE_SHOOTER_PHASE2_DOCKER_PACKAGING_FIX_REPORT_34.md`

Include:

- branch
- base SHA
- final feature HEAD
- PR number
- Docker packaging bug explanation
- exact Dockerfile change
- repository canonical file SHA-256
- image canonical file SHA-256
- byte-identical yes/no
- image ID
- temporary container ID/port
- explicit `CANONICAL_QUESTIONS_PATH.exists()` result
- explicit canonical loader count = 122
- fallback used yes/no
- Web tests
- Python full discovery
- Android JVM tests
- browser isolated-image smoke
- APK build path/size/hash
- live production container touched: **no**
- live 8081 restarted: **no**
- production 8080 touched: **no**
- remaining risks

Final verdict exactly one of:

- `PACKAGING FIX PASS — READY FOR MERGE`
- `BLOCKED`
- `FAIL`

Do not merge.

Do not deploy.

---

# 13. After PASS

If and only if this prompt returns:

`PACKAGING FIX PASS — READY FOR MERGE`

then wait for explicit merge authorization.

After that fix PR is merged, the next task will be a separate **Prompt 35 production deployment** of the merged base to 8081.

Do not create or execute Prompt 35 in this task.
