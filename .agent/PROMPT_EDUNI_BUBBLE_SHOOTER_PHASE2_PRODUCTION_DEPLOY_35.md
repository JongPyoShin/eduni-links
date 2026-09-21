# EDUNI Bubble Shooter Phase 2 — Production Deploy (Prompt 35)

## Objective

Deploy the fully merged Bubble Shooter Phase 2 to the existing production `eduni-game` service on port 8081.

This deployment includes:

- PR #65 — Web/Android canonical data + shared rule contracts
- PR #66 — Docker packaging of repository `shared/` so production Web runtime actually uses the 122-entry canonical dataset

This is a **production mutation task**.

Do not touch production 8080.
Do not deploy Android APK to a physical device.
Do not modify unrelated containers or services.

---

## Repository / required ancestry

Repository:

`JongPyoShin/eduni-links`

Production source branch:

`feature/eduni-space-mvp`

Required merged implementation ancestry:

- PR #65 merge:
  `bd4e340239cdeb0f6f93bfac865c1658fdaa6754`
- PR #66 merge:
  `3589c94f6f6eb9cae72db22136dd6913c474f480`

At execution time, deploy the **current remote HEAD** of:

`origin/feature/eduni-space-mvp`

Do not deploy an old feature branch.

The current base may include this Prompt 35 documentation commit after `3589c94...`; that is acceptable only if the required implementation SHAs remain ancestors.

---

# 1. Read instructions and prior evidence first

Read:

- root `AGENTS.md`
- `nice-gui-1-1-7/AGENTS.md`
- `EDUNI_8081_BADUK_BUBBLE_PRODUCTION_DEPLOY_REPORT_31.md`
- `BUBBLE_SHOOTER_PHASE2_WEB_ANDROID_PARITY_REPORT.md`
- `BUBBLE_SHOOTER_PHASE2_DOCKER_PACKAGING_FIX_REPORT_34.md`
- `docker-compose.yml`
- `nice-gui-1-1-7/Dockerfile`
- `nice-gui-1-1-7/app.py`

Historical Prompt 31 facts are context only.

Re-verify live production state; do not assume the container/image IDs are still unchanged.

Historical last-known Prompt 31 post-deploy state:

- service: `eduni-game`
- container: `80dc9dcf9b53`
- image ID: `sha256:fd7c92302a463f58af34e96c400398750f037d9f20384ec24c7caf1908705b63`
- bind: `100.75.214.95:8081 -> 8080/tcp`

---

# 2. Production ownership preflight — BEFORE any mutation

Identify the process/container actually owning 8081.

Record:

- container name
- container ID
- image name/tag
- image ID
- created/start time
- container PID
- command
- health status
- port binding
- restart policy
- relevant mounts/volumes
- Docker compose service identity

Require the active production owner to be the expected `eduni-game` service.

Confirm:

`100.75.214.95:8081 -> 8080/tcp`

Also explicitly identify production 8080 ownership and record enough evidence to prove it remains untouched.

If ownership is unexpected or ambiguous:

`DEPLOYMENT FAIL`

Stop before mutation.

---

# 3. Record rollback target before mutation

Record exact current production rollback target:

- old container ID
- old image ID
- image tag/name
- compose configuration
- bind
- health state

Do not delete the old image.

Do not prune images/containers.

Do not run broad cleanup commands.

Prepare a concrete rollback method using the current known-good image/config.

The report must include the rollback target before deployment begins.

---

# 4. Preserve runtime logs

Re-check these historical runtime-log paths if they still exist:

- `nice-gui-1-1-7/work/baduk-8081-stderr.log`
- `nice-gui-1-1-7/work/baduk-8081-stdout.log`

For each existing file record before mutation:

- path
- size
- mtime
- SHA-256

Do not delete, move, truncate, or rename them.

After deployment, re-record the same metadata.

Expected: unchanged unless the actual production workflow legitimately writes to them; if changed, explain exactly why.

---

# 5. Sync the deployment checkout safely

Expected checkout historically:

`D:\Codex\Worktrees\eduni-space-mvp`

Use the actual production deployment checkout after confirming it.

Run safe Git synchronization:

```powershell
git fetch --all --prune
git status --short --branch
git rev-parse HEAD
git rev-parse origin/feature/eduni-space-mvp
git merge-base --is-ancestor bd4e340239cdeb0f6f93bfac865c1658fdaa6754 origin/feature/eduni-space-mvp
git merge-base --is-ancestor 3589c94f6f6eb9cae72db22136dd6913c474f480 origin/feature/eduni-space-mvp
git pull --ff-only
```

Do not:

- reset --hard
- clean -fd
- stash unrelated work
- force checkout over dirty tracked files

Known ignored runtime logs do not count as source dirtiness.

If tracked source is unexpectedly dirty, stop before deployment and report.

Record exact deployed source SHA after sync.

---

# 6. Pre-deploy source gates

Before building/recreating production, verify the synced source contains the Phase 2 implementation.

## Canonical dataset

- `shared/bubble_shooter_questions.json` exists
- schemaVersion = 1
- exactly 122 questions
- zero duplicate `hanja + reading`

Record source SHA-256.

Expected historical SHA-256 from Prompt 34:

`5144fba397854d1632bc2e82c49d37cf2991583dfe8e6a8a9f3e54562a10a9a3`

If current base intentionally changed the canonical file after Prompt 34, do not blindly fail on hash mismatch; instead verify the change is an authorized ancestor and report the new count/hash. For this deployment, absent such an authorized change, expect the Prompt 34 hash.

## Web runtime

Verify:

- `CANONICAL_QUESTIONS_PATH`
- `_load_canonical_questions()`
- `load_bubble_questions()`
- `EDUNIBubbleShooterLogic`
- `L.resolveShot`
- `L.isDanger`
- `L.selectTarget`
- `L.pointerToCss`
- `L.isGenerationValid`

## Docker packaging

Verify Dockerfile contains:

`COPY shared /shared`

and compose build context remains repository root.

## Android source

Verify merged base contains:

- `BubbleShooterRules.java`
- canonical asset
- native runtime delegation
- generation guard

Android source verification is required, but Android device installation is not part of this production deployment.

---

# 7. Pre-deploy automated validation

Run the current merged-base suites before production mutation.

## Web / Node

```powershell
cd nice-gui-1-1-7
node --test tests/bubble_shooter_logic.test.mjs tests/contract_fixture_runner.test.mjs
```

Expected independent baseline:

- JS: 32/32

## Python focused

Run current Bubble Shooter integration + routes + packaging tests.

Expected Prompt 34 focused baseline:

- 39/39

Also run:

```powershell
python scripts/validate_content.py
python -m unittest discover -s tests
```

Record actual full discovery count.

## Android JVM

```powershell
cd ..\eduni-android-portal
.\gradlew.bat --no-daemon testDebugUnitTest
```

Expected independent baseline:

- 43/43

Do not install the APK.

## Whitespace

From repository root:

```powershell
git diff --check
```

Must pass.

Any product-code regression is blocking.

---

# 8. Build the production image before recreate

From the production checkout root, build the same compose service:

```powershell
docker compose build eduni-game
```

Record:

- new image name/tag
- new image ID
- build result

Before replacing live production, inspect the newly built image with an ephemeral container or `docker run --rm` equivalent.

Required image proof:

- `/shared/bubble_shooter_questions.json` exists
- file is readable
- SHA-256 matches repository source
- schemaVersion = 1
- question count = 122
- `CANONICAL_QUESTIONS_PATH.exists() == True`
- `len(_load_canonical_questions()) == 122`

This must pass **before** production recreate.

If it does not, stop.

---

# 9. Production mutation — ONLY eduni-game / 8081

Recreate only the actual `eduni-game` service.

Use the production-equivalent command:

```powershell
docker compose up -d --force-recreate --no-deps eduni-game
```

If the normal production command includes `--build`, using it is acceptable after Step 8 has already passed.

Do not restart or recreate any other compose service.

Do not touch production 8080.

Do not alter port bindings.

---

# 10. Immediate health gate

Immediately verify the new production container:

- running
- healthy
- expected image ID
- expected bind `100.75.214.95:8081 -> 8080/tcp`
- no restart loop
- container logs contain no traceback/fatal startup errors

Check:

- `/healthz`

If the service is unhealthy or repeatedly restarting, rollback immediately.

Do not perform prolonged live debugging while production is degraded.

---

# 11. Production canonical-data proof

Inside the **live production container**, prove Phase 2 canonical data is actually active.

Required:

- `/shared/bubble_shooter_questions.json` exists
- live-container file SHA-256 matches repository source
- `CANONICAL_QUESTIONS_PATH.exists() == True`
- `len(_load_canonical_questions()) == 122`
- schemaVersion = 1
- zero duplicate `hanja + reading`

Explicitly establish:

`Legacy fallback used = NO`

Do not infer this only from successful page rendering.

This is a hard acceptance gate.

---

# 12. Production route verification

Verify external production:

`http://100.75.214.95:8081`

Minimum routes:

- `/`
- `/bubble`
- `/bubble-shooter`
- `/baduk`
- `/baduk/`
- `/games/eduni-baduk`
- `/portal`
- `/healthz`

Expected:

- HTTP 200 where appropriate
- no server error
- no unexpected redirect loop

Record response sizes/statuses.

---

# 13. Production served-source / Phase 2 marker checks

For Bubble Shooter served output verify current shared-logic markers remain present:

- `EDUNIBubbleShooterLogic`
- `eduni-shooter-logic`
- `const L = window.EDUNIBubbleShooterLogic`
- `L.resolveShot`
- `L.isDanger`
- `L.selectTarget`
- `L.pointerToCss`
- `L.isGenerationValid`

Also prove the production process sees canonical question count 122.

For Baduk, verify enough previous production markers to ensure the shared image rebuild did not regress the other game:

- `analyzeAiDanger`
- undo
- hint
- rules
- `aiForcedPasses`
- `finishAiResignation`
- `largeSelfAtariRisk`

---

# 14. Production browser smoke — Bubble Shooter

Use headed Chrome against real production.

Run at minimum:

## Desktop

1280×800

Required:

- page loads
- canvas visible
- no horizontal overflow
- target text appears
- correct hit gives +100
- correct hit removes bubble
- correct hit does not add pressure replacement
- miss/wrong shot gives 0 score change
- miss adds exactly one pressure bubble
- restart works
- restart-race remains clean
- shared logic APIs available
- zero console/page errors

## Mobile

360×800

Required:

- page loads
- canvas visible
- no overflow/clipping that blocks play
- target visible
- at least one valid hit path
- restart usable
- zero console/page errors

Use the proven canvas interaction method from prior Bubble Shooter verification:

`locator.click(position)`

Do not misclassify `page.mouse` dispatch limitations as product failure.

Record actual check counts.

---

# 15. Production Baduk smoke

Because `eduni-game` is a shared 8081 image, verify Baduk remains healthy.

At minimum:

- `/baduk` opens
- 9×9 board visible
- `무르기`
- `힌트`
- `규칙 보기`
- one human move -> exactly one AI response
- undo returns to pre-human decision
- hint does not auto-play
- no console errors

Do not rerun destructive endgame fixtures on production unless necessary.

---

# 16. Stability observation

After browser checks, re-check:

- container health
- container restart count
- recent Docker logs
- route responsiveness
- no traceback
- no runaway callback/timer symptom
- no input freeze

Also re-check production 8080 and confirm it was untouched.

---

# 17. Rollback rule

Rollback immediately if any blocking production regression appears, including:

- unhealthy/restarting container
- 8081 unavailable
- Bubble Shooter canonical count not 122
- live runtime uses fallback
- Bubble Shooter core gameplay broken
- Baduk broken by shared image rebuild
- persistent server exception
- major browser regression

Rollback to the exact pre-deploy production image/config recorded in Step 3.

After rollback, verify:

- 8081 healthy again
- prior routes restored
- old production image active

Do not continue experimenting on degraded production.

Report:

`DEPLOYMENT FAIL — ROLLED BACK`

---

# 18. Android handling

The merged source includes Android Phase 2 changes, but this Prompt 35 deploys only the Web/Docker production service.

Do not:

- adb install
- uninstall app
- clear app data
- replace tablet APK
- mutate physical-device state

You may re-report the latest validated APK artifact/hash from Prompt 34 if still applicable, but do not install it.

Physical Android rollout requires a separate explicit user instruction.

---

# 19. Production report

Create:

`BUBBLE_SHOOTER_PHASE2_PRODUCTION_DEPLOY_REPORT_35.md`

The report must include:

- verdict
- deployment date/time
- source branch
- exact deployed source SHA
- proof both required merge SHAs are ancestors
- pre-deploy container/image/PID/bind/health
- rollback target
- post-deploy container/image/PID/bind/health
- old/new image IDs
- runtime-log before/after metadata
- source canonical JSON SHA-256
- live-container canonical JSON SHA-256
- byte-identical yes/no
- live `CANONICAL_QUESTIONS_PATH.exists()`
- live canonical loader count
- fallback used yes/no
- automated test totals
- route checks
- Bubble Shooter production browser results
- Baduk production smoke
- Docker logs/stability
- production 8080 untouched yes/no
- rollback performed yes/no
- Android device installed yes/no (**must be no**)
- remaining risks

Final verdict must be exactly one of:

- `DEPLOYMENT PASS`
- `DEPLOYMENT FAIL`
- `DEPLOYMENT FAIL — ROLLED BACK`

---

# 20. Commit/push report only

After deployment verification:

- commit only the production deployment report
- push to `feature/eduni-space-mvp`

Do not make product-code changes during this deployment prompt.

If a product defect is discovered:

- rollback if production-impacting
- document it
- do not patch production ad hoc
- leave the product fix for a separate branch/prompt

Do not merge anything in this task.
