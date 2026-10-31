# EDUNI production release policy

- Build a complete portal image from a clean, recorded source commit. Do not release from a dirty worktree or from a baseline missing retained features.
- Keep the retained-feature manifest with each release. Preflight confirms every listed route and response marker after startup; a feature-specific image must not replace the portal.
- Retained routes and response markers for this source baseline:
  - `GET /` redirects with status 307 to `/portal`.
  - `/portal` — `수학`; `/portal/games` — `EDUNI GAME PORTAL`.
  - `/reading` — `독서기록`; `/jungle` — `Jungle Adventure`; `/jungle-3d` — `정글 새탐험`; `/survival` — `서바이벌`.
  - `/link` — `EDUNI Link`; `/omok` — `EDUNI 오목`; `/sudoku` — `EDUNI 스도쿠`.
  - `/portal/english/phonics` — `소리톡 파닉스`; `/portal/math/playfactory` — `가족 수학 보드게임`.
  - `/blockpuzzle` — `id="manual-tetris-root"`; `/bubble` — `id="bubble-root"`; `/bubble-shooter` — `id="hanja-shooter-root"`.
  - `/baduk` — `EDUNI 바둑`; `/space` — `EDUNI 공간탐험`; `/hanja` — `한자`; `/facto` — `팩토대회준비`.
  - `/games/eduni-jungle` — `정글 새탐험으로 이동`; `/games/eduni-link` — `의준 링크로 이동`; `/games/eduni-omok` — `EDUNI 오목으로 이동`; `/games/eduni-baduk` — `EDUNI 바둑으로 이동`; `/games/eduni-space` — `EDUNI 공간탐험으로 이동`.
- Build from the repository root with `docker build -f nice-gui-1-1-7/Dockerfile --build-arg VCS_REF=<source-commit> -t <immutable-image-ref> .`. Pin the released image by digest. Build in an isolated clean checkout before deployment; production replacement must never invoke a build.
- Store the active Compose file, release pointer/manifest and secret environment files outside the Git worktree in a host-owned configuration directory. Set `EDUNI_HOST_CONFIG_DIR` (or pass `-HostConfigDir`) to that directory for `deploy.ps1` and `preflight.ps1`; supply the `.env` with Compose `--env-file` and set `EDUNI_CONTAINER_ENV_FILE` to the external container environment file. `compose.template.yml` and `production.env.template` are portable templates only; never put credentials or host release manifests in Git. `preflight.ps1` is read-only by default; `deploy.ps1 -Apply` requires an explicit operator action.
- Apply an app-only replacement with `--no-deps`; preserve `/data`, PostgreSQL, relay, ports, environment and unrelated services. Data migrations require a separate reviewed procedure and rollback plan.
- Production Compose is the sole service lifecycle path. `nice-gui-1-1-7/scripts/start_eduni_services.ps1` and `watch_eduni_services.ps1` are retired fail-closed stubs; do not invoke or restore their former process-control behavior.
- Default operation is read-only preflight. Any apply path must repeat all drift checks immediately before replacement and retain a rollback image.

## Windows AI bridge provenance

- The host-side `companion_bridge_daemon.py`, `eduni_chatgpt_bridge.py`, `run_companion_bridge.py`, and `manage_companion_bridge_task.ps1` sources were copied from the active current-user task worktree at `D:\Codex\Worktrees\eduni-companion-pr85-verify\nice-gui-1-1-7\scripts`. This repository copy is source only; it does not change or re-register the task.
- Keep the existing scheduled task bound to its host-owned worktree until a separately reviewed migration. Do not copy its `.env.companion`, token-sync key, DPAPI registration, or task state into this repository.
- For a future source relocation, set `EDUNI_AI_HOST_TOKEN_SYNC_KEY_FILE` in the host process environment before the bridge module is imported, pointing it at the existing external token-sync key. Without that variable, the bridge keeps the default `nice-gui-1-1-7/.companion-token-sync-key` location. Pass the external companion settings file with `manage_companion_bridge_task.ps1 -ConfigPath <host-config-path>`.
- The Windows bridge remains a host-side scheduled task; building this source does not launch or re-register it. The portal contacts the separately supervised host bridge through its externally configured URL.
