param(
    [switch]$Once,
    [int]$IntervalSeconds = 300
)

$ErrorActionPreference = 'Stop'

$root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$startupScript = Join-Path $root 'scripts\start_eduni_services.ps1'
$logDir = Join-Path $root 'work'
$watchLog = Join-Path $logDir 'eduni_watchdog.log'
$quizStatus = 'C:\Users\jongp\Documents\Codex\2026-06-05\files-mentioned-by-the-user-oracle\outputs\external_access.txt'
$gameStatus = Join-Path $root 'outputs\game_external_access.txt'

New-Item -ItemType Directory -Force -Path $logDir | Out-Null

function Write-WatchLog($message) {
    "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $message" | Tee-Object -FilePath $watchLog -Append | Out-Null
}

function Read-TunnelUrl($path) {
    if (-not (Test-Path -LiteralPath $path)) {
        return $null
    }
    $content = Get-Content -LiteralPath $path -Raw -ErrorAction SilentlyContinue
    $match = [regex]::Match($content, 'https://(?!api\.)[a-z0-9-]+\.trycloudflare\.com')
    if ($match.Success) {
        return $match.Value
    }
    return $null
}

function Test-Url($url) {
    if (-not $url) {
        return $false
    }
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 20
        if ($response.StatusCode -ne 200) {
            return $false
        }
        if ($response.Content -match 'Error 1033|Cloudflare Tunnel error') {
            return $false
        }
        return $true
    }
    catch {
        return $false
    }
}

function Start-EduniAutomation {
    Write-WatchLog 'Running Eduni service automation.'
    $process = Start-Process `
        -FilePath 'powershell' `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', $startupScript) `
        -WorkingDirectory $root `
        -WindowStyle Hidden `
        -Wait `
        -PassThru

    Write-WatchLog "Automation finished with exit code $($process.ExitCode)."
    return $process.ExitCode -eq 0
}

function Test-AllServices {
    $quizUrl = Read-TunnelUrl $quizStatus
    $gameUrl = Read-TunnelUrl $gameStatus

    $localQuizOk = Test-Url 'http://127.0.0.1:8080/hanja'
    $localGameOk = Test-Url 'http://127.0.0.1:8081'
    $quizOk = Test-Url "$quizUrl/hanja"
    $gameOk = Test-Url $gameUrl

    Write-WatchLog "Health localQuiz=$localQuizOk localGame=$localGameOk quiz=$quizOk game=$gameOk quizUrl=$quizUrl gameUrl=$gameUrl"
    return $localQuizOk -and $localGameOk -and $quizOk -and $gameOk
}

Write-WatchLog '===== Eduni watchdog started ====='
$failureCount = 0
$firstRun = $true

do {
    if (-not (Test-AllServices)) {
        $failureCount += 1
        Write-WatchLog "Health check failed count=$failureCount."

        if ($firstRun -or $failureCount -ge 2) {
            Write-WatchLog 'Refreshing services, tunnels, and GitHub Pages links.'

            $restartOk = Start-EduniAutomation

            if ($restartOk -and (Test-AllServices)) {
                Write-WatchLog 'Recovery succeeded.'
                $failureCount = 0
            }
            else {
                Write-WatchLog 'Recovery failed. Will retry on next cycle.'
                $failureCount = 1
            }
        }
    }
    else {
        $failureCount = 0
    }

    $firstRun = $false

    if ($Once) {
        break
    }

    Start-Sleep -Seconds $IntervalSeconds
} while ($true)

Write-WatchLog '===== Eduni watchdog stopped ====='
