# EDUNI ChatGPT bridge: Windows logon auto-start and recovery

## Purpose

Keep the **existing** `eduni_chatgpt_bridge.py` on `127.0.0.1:8765` available for the Docker `eduni-game` portal. No new inference proxy, authentication mechanism, Docker container, or port is introduced.

The original manual launcher and portal `/ai/companion/chat` contract are unchanged. Runtime secrets stay in the original ignored `.env.companion` and the current Windows user's DPAPI registration. Do not use Windows SYSTEM, a different user, or the Task Scheduler S4U/"run whether user is logged on or not" option; they may be unable to decrypt this registration.

## Files

- `nice-gui-1-1-7/scripts/companion_bridge_daemon.py`: checks existing settings and current-user registration, starts the existing bridge, monitors a key-authenticated malformed request (expected HTTP 400), and restarts an owned worker on crash or repeated health failure. The health probe **never calls the model**.
- `nice-gui-1-1-7/scripts/manage_companion_bridge_task.ps1`: installs a task named `EDUNI-ChatGPT-Bridge` under the **currently logged-on Windows user** using `Interactive` logon, no elevation, an absolute Python executable and working directory, a logon trigger, unlimited execution duration, no overlapping scheduler instances, and restart on supervisor failure.
- `nice-gui-1-1-7/tests/test_companion_bridge_daemon.py`: focused configuration, non-model health probe, DPAPI preflight, no-process-stealing and launch tests.

## Install on the existing Windows PC

Perform this only from the checkout that contains the added scripts and the already working **ignored** `.env.companion`. A newly created Git worktree does not automatically contain ignored runtime files. Do not commit, copy into a repository, or print credential files.

Open normal (non-admin) PowerShell in the same logged-in Windows account that registered ChatGPT. From the repo checkout:

```powershell
cd D:\Codex\Worktrees\eduni-ai-companion\nice-gui-1-1-7
python -m scripts.companion_bridge_daemon --check-config
python -m scripts.companion_bridge_daemon --check-registration
.\scripts\manage_companion_bridge_task.ps1 -Action Install
.\scripts\manage_companion_bridge_task.ps1 -Action Status
```

If `python` resolves to an unexpected interpreter, supply `-PythonPath 'C:\path\to\python.exe'` to the PowerShell management script. Installer resolves the actual Python executable and stores an absolute path in the task.

If the companion settings do not exist, use the existing **manual** setup from the correct Windows user first:

```powershell
python -m scripts.run_companion_bridge --supervised --origin https://k12.tail8b64d5.ts.net:8443
```

Stop the manual launcher after it has saved valid settings. The saved key must match the bridge key supplied to the running Docker app; if app and bridge use different keys, **do not regenerate one side independently**. The installer never changes the key or recreates Docker.

If PowerShell execution policy blocks the management script, resolve via the organization's permitted signed-script workflow. The scheduled task runs **Python directly**, not `powershell -ExecutionPolicy Bypass`.

## Operating checks

```powershell
.\scripts\manage_companion_bridge_task.ps1 -Action Status
python -m scripts.companion_bridge_daemon --status
Get-Content "$env:LOCALAPPDATA\EDUNI\ChatGPT\companion_supervisor.log" -Tail 50
Get-ScheduledTask -TaskName EDUNI-ChatGPT-Bridge | Select-Object State
```

The logs contain lifecycle/registration **categories only**, not prompts, response text, tokens or key values. They rotate (about 500 KB each, three backups). Port 8765 only binds to `127.0.0.1`. Supervisor detects an authenticated existing bridge and monitors without killing/replacing it. If an unknown listener owns 8765, it **does not terminate that process**.

To unregister the task, use `.\scripts\manage_companion_bridge_task.ps1 -Action Remove`. Removing/stopping a task does not forcibly terminate an unrelated or previously orphaned bridge. If needed, stop only a positively identified EDUNI bridge process, never arbitrary port owners.

## Required acceptance on Windows (not yet claimed)

1. Install and check `Run as` is the ChatGPT registration user and `LogonType` is `Interactive`. Verify `--check-registration` succeeds without any secret output.
2. After login/relogin, task reaches Running and `--status` reports healthy on 8765. If another manual bridge is already running, confirm the task adopts it instead of creating a second bridge.
3. Stop **only the identified bridge child process** and confirm the task recovers and status becomes healthy. Then stop **only the supervisor process** and confirm Task Scheduler restarts it.
4. Reboot/re-login and verify the real HTTPS portal can still receive a supervised, **synthetic** question reply through the existing Docker portal. Check portal and unrelated routes remain stable, including no host 8080 operations.
5. Check task log, rotation, repeated process failure backoff, wrong-Windows-account rejection, no credential disclosures, and no Docker or PostgreSQL mutations.

The supervisor cannot repair an expired/revoked ChatGPT registration, a network outage, or a removed `.env.companion`; it logs the condition and retries every 30 seconds. `--check-registration` may refresh tokens using the existing authorized account.

## Scope and limitations

This is a Windows host deployment change; GitHub code review alone **does not install a scheduled task or prove reboot recovery**. Runtime installation and true GPT conversation acceptance require that PC. Do not merge or deploy solely on code review; keep the existing family supervised-trial/privacy restrictions. All request paths and provider-side conditions stay unchanged.
