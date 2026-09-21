# EDUNI — Current Web Showcase Safe Restart (Prompt 36)

## Objective

Restart the currently deployed EDUNI Web service so the user can immediately review everything developed so far in a browser.

This is **not** a new deployment.
This is **not** an Android-device task.
Do not rebuild product code unless the existing production service cannot be safely restarted as-is.

Target service:

`eduni-game`

Target endpoint:

`http://100.75.214.95:8081`

Current known-good production deployment from Prompt 35:

- deployed source SHA: `306bd91023a18e5846b4cbfcb09a8974aeab86f3`
- current report/base branch HEAD: `f995246f0d522e6e2d6034f5eab752326515e04d`
- last known container: `a722c1003c32`
- last known image: `sha256:9a3fafef24d15954f8f42909041270a7de4e005ee5311d4345b9535b6801980a`
- bind: `100.75.214.95:8081 -> 8080/tcp`

Re-verify all live facts before acting.

---

# 1. Read current production evidence

Read:

- root `AGENTS.md`
- `EDUNI_8081_BADUK_BUBBLE_PRODUCTION_DEPLOY_REPORT_31.md`
- `BUBBLE_SHOOTER_PHASE2_PRODUCTION_DEPLOY_REPORT_35.md`
- `docker-compose.yml`

Do not rerun Prompt 35.
Do not rebuild just because this prompt exists.

---

# 2. Identify the current 8081 owner

Before restart, record:

- container name
- container ID
- image ID
- health
- restart count
- port binding
- uptime
- recent logs

Require the actual owner to be the expected `eduni-game`.

Require:

`100.75.214.95:8081 -> 8080/tcp`

Also verify production/external 8080 is not part of this restart operation.

If 8081 ownership is unexpected, stop with:

`RESTART BLOCKED`

Do not kill arbitrary processes or containers.

---

# 3. Restart only the existing EDUNI Web service

Preferred command from the correct compose checkout:

```powershell
docker compose restart eduni-game
```

The intent is to restart the **existing container/service**, not rebuild it.

Do not run:

- `docker compose build`
- `docker compose up --build`
- `docker compose down`
- `docker system prune`
- broad container cleanup
- production 8080 restart
- Android build/install

If `docker compose restart eduni-game` is not appropriate for the actual live owner, use the narrow equivalent `docker restart <confirmed-eduni-game-container>` and explain why.

---

# 4. Health verification after restart

Wait only as required by the existing healthcheck.

Verify:

- container is running
- health = healthy
- RestartCount reflects the expected restart only
- binding remains `100.75.214.95:8081 -> 8080/tcp`
- no restart loop
- recent logs contain no traceback/fatal startup error
- `/healthz` returns HTTP 200

If restart fails, do not rebuild or patch automatically.
Report the blocker.

---

# 5. Verify the current developed features are visible

Check these URLs:

## Main / Portal

`http://100.75.214.95:8081/`

`http://100.75.214.95:8081/portal`

Expected: HTTP 200 and page renders.

## Bubble Shooter

`http://100.75.214.95:8081/bubble-shooter`

Verify:

- page HTTP 200
- canvas visible
- canonical question data active
- live canonical count = 122
- legacy fallback = NO
- `EDUNIBubbleShooterLogic` present
- correct-hit flow works
- miss flow works
- restart button works
- no console errors

Do a short browser smoke only; do not rerun the full deployment suite.

## Baduk

`http://100.75.214.95:8081/baduk`

Verify:

- page HTTP 200
- board visible
- `무르기`
- `힌트`
- `규칙 보기`
- no console errors

No destructive endgame fixture is needed.

---

# 6. User-facing showcase URLs

At the end, explicitly print these for the user:

```text
메인/포털:
http://100.75.214.95:8081/
http://100.75.214.95:8081/portal

버블슈터:
http://100.75.214.95:8081/bubble-shooter

바둑:
http://100.75.214.95:8081/baduk
```

Also state whether each URL is currently reachable.

---

# 7. Do not touch Android

There is no physical Android device for this task.

Do not:

- run `adb install`
- search for a device
- start an emulator
- uninstall anything
- clear app data
- change Android source
- create a new APK unless explicitly asked later

The purpose of Prompt 36 is only to let the user view the current Web implementation.

---

# 8. Final report

No product-code commit is needed.

Do not modify source files.

If no repository file changes occur, do not create a report commit just for the restart.

Final response format:

```text
RESTART PASS

Container: <id>
Image: <image id>
Health: healthy
8081: reachable
8080: untouched

Main/Portal: PASS
Bubble Shooter: PASS
Baduk: PASS

메인/포털:
http://100.75.214.95:8081/
http://100.75.214.95:8081/portal

버블슈터:
http://100.75.214.95:8081/bubble-shooter

바둑:
http://100.75.214.95:8081/baduk
```

If anything fails:

`RESTART BLOCKED`

and clearly state the exact failing check.

Do not deploy, merge, or patch code in this prompt.
