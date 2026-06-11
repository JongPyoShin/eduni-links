$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$docker = 'C:\Program Files\Docker\Docker\resources\bin\docker.exe'
$dockerDesktop = 'C:\Program Files\Docker\Docker\Docker Desktop.exe'

if (-not (Test-Path -LiteralPath $docker)) {
    throw 'Docker CLI was not found. Install Docker Desktop first.'
}

try {
    & $docker info --format '{{.ServerVersion}}' | Out-Null
}
catch {
    Start-Process -FilePath $dockerDesktop
    for ($i = 0; $i -lt 60; $i++) {
        Start-Sleep -Seconds 5
        & $docker info --format '{{.ServerVersion}}' *> $null
        if ($LASTEXITCODE -eq 0) {
            break
        }
    }
}

& $docker compose --project-directory $root up -d

for ($i = 0; $i -lt 60; $i++) {
    try {
        $response = Invoke-WebRequest -Uri 'http://127.0.0.1:8090' -UseBasicParsing -TimeoutSec 5
        if ($response.StatusCode -in 200, 302) {
            Write-Host 'Nextcloud is ready: http://127.0.0.1:8090'
            exit 0
        }
    }
    catch {
        Start-Sleep -Seconds 5
    }
}

Write-Host 'Nextcloud containers started, but the web page is not ready yet.'
Write-Host 'Check Docker Desktop and retry http://127.0.0.1:8090'

