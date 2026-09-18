# EDUNI Single Server Integration Report

- START HEAD: `64847ddfce0f5f7b4155b3b406e56ccd5d0f12d3`
- Implementation HEAD: follow-up rebuild verification on latest `feature/eduni-space-mvp`
- Family server: `nice-gui-1-1-7/app.py`
- Hanja portal URL: `http://100.75.214.95:8080/hanja` -> `/hanja`

## Structure

Hanja registration, quiz loading, grading, compatibility save API, and `/healthz` now live in `nice-gui-1-1-7/portal_app/hanja.py`, imported by the family process. Quiz source data is copied from the legacy outputs directory into the persistent `/data/hanja` volume on first container start; answer files are written there. The legacy Oracle app remains in the repository but is not started by the EDUNI compose service.

## Docker

`docker-compose.yml` defines exactly one application service, `eduni-game`, with `restart: unless-stopped`, `127.0.0.1:8081:8080`, `/data` persistent volume, and an HTTP `/healthz` check. The container was built and reported `healthy`; restart policy inspection reported `unless-stopped`.

## Verification

- Compose config: PASS
- Docker build/up: PASS
- Routes `/`, `/bubble`, `/bubble-shooter`, `/portal`, `/portal/world/math`, `/portal/parent`, `/link`, `/omok`, `/jungle`, `/hanja`, `/healthz`: HTTP 200
- Save API: PASS (`ok:true`, 1/30 answered); answer file present after container restart
- Container restart and health recovery: PASS
- Portal accessibility tree: Hanja card points to same-origin `/hanja`; headed browser visibly showed portal, `/hanja` showed the access-code screen, and `/` visibly showed the block puzzle
- Single app service/process tree: Compose has one `eduni-game` service running `python app.py`
- Windows Docker Desktop reboot: not performed; auto-start is CONFIG PASS only

## Remaining risk

An earlier headed browser blank was caused by the Hanja markup using a conflicting `id="app"` inside NiceGUI. Removing that duplicate id and rebuilding fixed the screen; the headed browser now visibly renders the Hanja access-code screen. Entering the access code was not performed because it is a credential-like secret; API save/restart persistence was verified separately.
