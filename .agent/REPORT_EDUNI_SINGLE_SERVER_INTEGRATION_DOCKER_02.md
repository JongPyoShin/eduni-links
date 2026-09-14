# EDUNI Single Server Integration Report

- START HEAD: `64847ddfce0f5f7b4155b3b406e56ccd5d0f12d3`
- Implementation HEAD: recorded at commit time
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
- Portal accessibility tree: Hanja card points to same-origin `/hanja`
- Single app service/process tree: Compose has one `eduni-game` service running `python app.py`
- Windows Docker Desktop reboot: not performed; auto-start is CONFIG PASS only

## Remaining risk

The headed browser screenshot backend rendered a blank surface despite the `/hanja` HTML being present in the HTTP response, so the final visual click-through and browser console-error check remains pending. The compact Hanja UI should receive one additional headed-browser pass before declaring full PASS.
