$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$outputs = Join-Path $root 'outputs'
$work = Join-Path $root 'work'
$appUrl = 'http://127.0.0.1:8080'
$statusFile = Join-Path $outputs 'external_access.txt'
$stdoutLog = Join-Path $work 'cloudflared_stdout.log'
$stderrLog = Join-Path $work 'cloudflared_stderr.log'

New-Item -ItemType Directory -Force -Path $outputs, $work | Out-Null

function Test-App {
    try {
        $response = Invoke-WebRequest -Uri $appUrl -UseBasicParsing -TimeoutSec 3
        return $response.StatusCode -eq 200
    }
    catch {
        return $false
    }
}

if (-not (Test-App)) {
    Start-Process -FilePath python -ArgumentList 'app.py' -WorkingDirectory $root -WindowStyle Hidden
    Start-Sleep -Seconds 4
}

if (-not (Test-App)) {
    throw "NiceGUI app is not responding at $appUrl"
}

$cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
if ($cloudflared) {
    $cloudflaredPath = $cloudflared.Source
}
else {
    $cloudflaredPath = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe'
}

if (-not (Test-Path -LiteralPath $cloudflaredPath)) {
    throw "cloudflared.exe was not found. Install it with: winget install --id Cloudflare.cloudflared"
}

Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 1
Clear-Content -LiteralPath $stdoutLog -ErrorAction SilentlyContinue
Clear-Content -LiteralPath $stderrLog -ErrorAction SilentlyContinue

Start-Process `
    -FilePath $cloudflaredPath `
    -ArgumentList 'tunnel --url http://127.0.0.1:8080 --protocol http2' `
    -WorkingDirectory $root `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdoutLog `
    -RedirectStandardError $stderrLog

$publicUrl = $null
for ($i = 0; $i -lt 24; $i++) {
    Start-Sleep -Seconds 1
    $log = ''
    if (Test-Path -LiteralPath $stdoutLog) { $log += Get-Content -LiteralPath $stdoutLog -Raw -ErrorAction SilentlyContinue }
    if (Test-Path -LiteralPath $stderrLog) { $log += Get-Content -LiteralPath $stderrLog -Raw -ErrorAction SilentlyContinue }
    $match = [regex]::Match($log, 'https://(?!api\.)[a-z0-9-]+\.trycloudflare\.com')
    if ($match.Success) {
        $publicUrl = $match.Value
        break
    }
}

if (-not $publicUrl) {
    throw "Cloudflare tunnel URL was not found in $stderrLog"
}

$accessCodePath = Join-Path $outputs 'quiz_access_code.txt'
if (-not (Test-Path -LiteralPath $accessCodePath)) {
    throw "Access code file was not found: $accessCodePath"
}
$accessCode = (Get-Content -LiteralPath $accessCodePath -Raw).Trim()

$content = @"
External URL: $publicUrl
Access code: $accessCode
Local URL: $appUrl
Created at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@

$content | Set-Content -LiteralPath $statusFile -Encoding UTF8
Write-Output $content
Write-Output ""
Write-Output "Saved to: $statusFile"
