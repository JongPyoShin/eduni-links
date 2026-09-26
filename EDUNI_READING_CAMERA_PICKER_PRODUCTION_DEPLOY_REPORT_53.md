# EDUNI Reading Camera Picker — Production Deploy Report 53

## Final verdict

`EDUNI CAMERA PICKER DEPLOY PASS — MOBILE ACCEPTANCE PENDING`

## Source and worktree

- Repository: `JongPyoShin/eduni-links`
- Deployment worktree: `D:\Codex\Worktrees\eduni-camera-deploy-53b` (clean, detached)
- Remote branch HEAD used: `112a4fff0f16d28af1e8992d6ff259f9cdc2a715`
- Approved product merge: `7e8155ea137a5490cc87966ca96fc1bcb329acec` (PR #73)
- Verified implementation candidate: `6771e6d58e985fbc28d6158af0ae870f0fb47d0c`
- The candidate is an ancestor of the approved merge; the two changed product/test files in the merge match the verified candidate.
- The only commits after the product merge are documentation-only Prompt 53 (`5e5f74c57108874d3edfd94ec6ae837773735087`) and Prompt 53B (`112a4fff0f16d28af1e8992d6ff259f9cdc2a715`). No later product, test, runtime, Compose, or deployment-script change was present.
- `git diff --check`: PASS.
- The original `prototype/jungle-web-canvas-poc` checkout remained on HEAD `f3f9b5303d8d6881c54045126a31a295e127e89f`; its initial untracked status was unchanged.

## Existing secret and Compose preflight

- Reused the existing non-empty `EDUNI_POSTGRES_PASSWORD` from the ignored `.env` at `D:\Codex\Worktrees\eduni-space-mvp\.env`; value was not displayed, copied, regenerated, or changed.
- Compose config was rendered using that file without printing the rendered configuration or secret.
- Project: `eduni-space-mvp`.
- App publication: `100.75.214.95:8081` → container `18081`.
- PostgreSQL: internal `5432`, no host publication.
- Existing app volume: `eduni-space-mvp_eduni_data` → `/data`.
- Existing PostgreSQL volume: `eduni-space-mvp_eduni_postgres_data` → `/var/lib/postgresql/data`.
- No host-8080 reference was found in rendered Compose configuration.

## Pre-deploy runtime and backup

- Docker context: `desktop-linux`.
- Before deployment, `eduni-game` and `eduni-postgres` were running and healthy in Compose project `eduni-space-mvp`.
- Previous app image ID: `sha256:03068fa03021965bd54395f1ca5928f67903f02e66fa0eb6879dc6cb7042ed3f`.
- Rollback image tag created and verified against the previous image: `eduni-game:rollback-camera-picker-53-20260926`.
- Both existing named data volumes were mounted before deployment.
- Read-only pre-deploy data snapshot: SQLite `integrity_check=ok`, 20,480 bytes, `child_profile=1`, `activity_session=0`; PostgreSQL `reading_record=0`; Reading Journal files=0.
- Consistent SQLite online backup and Reading Journal directory copy are outside Git at `D:\Codex\Backups\eduni-camera-picker-deploy-53-20260926T062408Z`.
- The backed-up SQLite snapshot independently passed `integrity_check=ok` and retained the same child/activity counts. The Reading Journal backup directory contains 0 files / 0 bytes.

## Deployment and runtime

- Deployed only `eduni-game` with `docker compose --env-file <existing production .env> -p eduni-space-mvp up -d --build eduni-game`.
- Build/deploy: PASS.
- New app image ID: `sha256:7190dd317299122b54d09bc2a9fb3fc2c33ed6dc770ba42f87e9dbcf06e050d0`.
- New `eduni-game` container: `2d1bf91a9081645e62342b4153dcfae97b029100ddf883c5064355b2821a2e92`; running/healthy.
- `eduni-postgres` was not recreated; container `c52cbca3028ef900ecedc132b6f2e35bcf73518b6b3f79bfb7a056a9ea176ebc` remained running/healthy.
- After deployment, app and PostgreSQL volume identities were unchanged; PostgreSQL `5432/tcp` remained unpublished.
- Scoped app logs examined: no traceback, critical/fatal, startup-failure, or failed-start matches.

## Production HTTP and markup acceptance

All requests below used production host port 8081 only.

| Path | Result |
|---|---|
| `/healthz` | HTTP 200 |
| `/portal` | HTTP 200 |
| `/reading` | HTTP 200 |
| `/reading/api/health` | HTTP 200; `ok=true`, storage `postgresql` |
| `/ai/health` | HTTP 200; provider disabled and unconfigured, expected |
| `/bubble` | HTTP 200 |
| `/bubble-shooter` | HTTP 200 |

Production `/reading` response checks:

- `카메라로 촬영` and `갤러리에서 선택` are present.
- Dedicated `cameraInput` accepts images and has `capture="environment"`.
- Distinct `galleryInput` accepts JPEG/PNG/WEBP and has no `capture` attribute.
- No legacy `coverInput` element ID or standalone reference exists. The earlier substring-only check matched the plural helper `clearCoverInputs`, not a legacy control.

## Existing data and safety

- Post-deploy SQLite: `integrity_check=ok`, `child_profile=1`, `activity_session=0`.
- PostgreSQL Reading Journal storage is healthy; `reading_record=0` before and after.
- Reading Journal cover/file count remained 0 before and after. No fake production record or image was created.
- Host 8080 was not queried, contacted, bound, stopped, or killed.
- `start_eduni_services.ps1` and `watch_eduni_services.ps1` were not run.
- No unrelated container, volume, PostgreSQL resource, or production data was modified. No prune or volume deletion was run.
- The previous app image and external backup remain available for rollback; rollback was not needed.

## Mobile acceptance and remaining risk

`PHYSICAL MOBILE CAMERA: PENDING USER ACCEPTANCE`

Server deployment and markup are accepted. A physical Android/iOS check remains: open `http://100.75.214.95:8081/reading`, tap `📷 카메라로 촬영`, take a photo and confirm it returns to preview, then verify `🖼️ 갤러리에서 선택` remains a separate path. `capture="environment"` is a browser/platform hint and does not guarantee every browser opens the rear camera directly.
