# Local Nextcloud

Home Wi-Fi only Nextcloud setup for this desktop.

## Planned Address

Use this from phones on the same Wi-Fi:

```text
http://172.16.11.220:8090
```

If the PC IP changes, update `NEXTCLOUD_TRUSTED_DOMAINS` in `.env` and use the new IP.

## Storage

The compose file uses:

```text
D:/NextcloudData
```

## Start

Copy `.env.example` to `.env`, replace both password values, then run:

```powershell
cd C:\Users\jongp\Documents\Codex\2026-06-06\nice-gui-1-1-7\nextcloud-local
docker compose up -d
```

Open:

```text
http://172.16.11.220:8090
```

Create the first admin account in the browser.

## Stop

```powershell
docker compose down
```
