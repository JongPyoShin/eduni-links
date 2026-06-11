$ErrorActionPreference = 'Stop'

$gameRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$codexRoot = Split-Path -Parent (Split-Path -Parent $gameRoot)
$quizRoot = Join-Path $codexRoot '2026-06-05\files-mentioned-by-the-user-oracle'
$linksRoot = Join-Path $gameRoot 'eduni-links'

$logDir = Join-Path $gameRoot 'work'
$gameOutputs = Join-Path $gameRoot 'outputs'
$quizOutputs = Join-Path $quizRoot 'outputs'
$quizWork = Join-Path $quizRoot 'work'

New-Item -ItemType Directory -Force -Path `
    $logDir, `
    $gameOutputs, `
    $quizOutputs, `
    $quizWork | Out-Null

$automationLog = Join-Path $logDir 'eduni_startup_automation.log'

function Write-Log($message) {
    $line = "$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss') $message"
    $line | Tee-Object -FilePath $automationLog -Append | Out-Null
}

function Test-Http($url, $timeoutSec = 5) {
    try {
        $response = Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec $timeoutSec
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

function Wait-Http($url, $name, $seconds = 45) {
    for ($i = 0; $i -lt $seconds; $i++) {
        if (Test-Http $url 3) {
            Write-Log "$name is responding at $url"
            return
        }
        Start-Sleep -Seconds 1
    }
    throw "$name is not responding at $url"
}

function Wait-ExternalHttp($url, $name, $seconds = 75) {
    for ($i = 0; $i -lt $seconds; $i++) {
        if (Test-Http $url 8) {
            Write-Log "$name external URL is responding at $url"
            return
        }
        Start-Sleep -Seconds 1
    }
    throw "$name external URL is not healthy at $url"
}

function Stop-PortOwner($port) {
    $connections = Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue
    foreach ($connection in $connections) {
        if ($connection.OwningProcess) {
            Write-Log "Stopping process $($connection.OwningProcess) on port $port"
            Stop-Process -Id $connection.OwningProcess -Force -ErrorAction SilentlyContinue
        }
    }
}

function Stop-EduniCommandWindows {
    $escapedQuizRoot = $quizRoot.Replace('\', '\\')
    $escapedGameRoot = $gameRoot.Replace('\', '\\')
    $processes = Get-CimInstance Win32_Process -Filter "Name = 'cmd.exe'" -ErrorAction SilentlyContinue |
        Where-Object {
            $_.CommandLine -like "*$quizRoot*" -or
            $_.CommandLine -like "*$gameRoot*" -or
            $_.CommandLine -like "*$escapedQuizRoot*" -or
            $_.CommandLine -like "*$escapedGameRoot*"
        }

    foreach ($process in $processes) {
        Write-Log "Stopping old command window $($process.ProcessId)"
        Stop-Process -Id $process.ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Get-CloudflaredPath {
    $cloudflared = Get-Command cloudflared -ErrorAction SilentlyContinue
    if ($cloudflared) {
        return $cloudflared.Source
    }

    $wingetPath = Join-Path $env:LOCALAPPDATA 'Microsoft\WinGet\Packages\Cloudflare.cloudflared_Microsoft.Winget.Source_8wekyb3d8bbwe\cloudflared.exe'
    if (Test-Path -LiteralPath $wingetPath) {
        return $wingetPath
    }

    throw 'cloudflared.exe was not found. Install it with: winget install --id Cloudflare.cloudflared'
}

function Get-PythonPath {
    $python = Get-Command python -ErrorAction SilentlyContinue
    if ($python) {
        return $python.Source
    }
    return 'python.exe'
}

function Quote-CmdArg($value) {
    return '"' + ([string]$value).Replace('"', '\"') + '"'
}

function Start-HiddenPythonServer($title, $root, $port = $null) {
    Write-Log "Starting $title"
    $safeTitle = ($title -replace '[^A-Za-z0-9]+', '_').Trim('_').ToLowerInvariant()
    $stdoutLog = Join-Path $logDir "$safeTitle`_stdout.log"
    $stderrLog = Join-Path $logDir "$safeTitle`_stderr.log"
    Clear-Content -LiteralPath $stdoutLog -ErrorAction SilentlyContinue
    Clear-Content -LiteralPath $stderrLog -ErrorAction SilentlyContinue

    $python = Get-PythonPath
    $systemRoot = if ($env:SystemRoot) { $env:SystemRoot } else { 'C:\Windows' }
    $comSpec = if ($env:ComSpec) { $env:ComSpec } else { Join-Path $systemRoot 'System32\cmd.exe' }

    $commandParts = @("cd /d $(Quote-CmdArg $root)")
    if ($port) {
        $commandParts += "set PORT=$port"
    }
    $commandParts += "$(Quote-CmdArg $python) app.py > $(Quote-CmdArg $stdoutLog) 2> $(Quote-CmdArg $stderrLog)"
    $command = $commandParts -join ' && '

    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $psi.FileName = $comSpec
    $psi.Arguments = "/c $command"
    $psi.WorkingDirectory = $root
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true
    $process = [System.Diagnostics.Process]::Start($psi)
    Write-Log "$title hidden process id: $($process.Id)"
    Write-Log "$title stdout log: $stdoutLog"
    Write-Log "$title stderr log: $stderrLog"
    $process.Dispose()
}

function Start-Tunnel($name, $localUrl, $stdoutLog, $stderrLog) {
    $cloudflaredPath = Get-CloudflaredPath
    Clear-Content -LiteralPath $stdoutLog -ErrorAction SilentlyContinue
    Clear-Content -LiteralPath $stderrLog -ErrorAction SilentlyContinue

    Write-Log "Starting $name tunnel for $localUrl"
    $psi = [System.Diagnostics.ProcessStartInfo]::new()
    $systemRoot = if ($env:SystemRoot) { $env:SystemRoot } else { 'C:\Windows' }
    $comSpec = if ($env:ComSpec) { $env:ComSpec } else { Join-Path $systemRoot 'System32\cmd.exe' }

    $psi.FileName = $comSpec
    $psi.WorkingDirectory = $gameRoot
    $psi.UseShellExecute = $false
    $psi.CreateNoWindow = $true

    $inner = "cd /d $(Quote-CmdArg $gameRoot) && $(Quote-CmdArg $cloudflaredPath) tunnel --url $localUrl --protocol http2 > $(Quote-CmdArg $stdoutLog) 2> $(Quote-CmdArg $stderrLog)"
    $psi.Arguments = "/c $inner"
    $process = [System.Diagnostics.Process]::Start($psi)
    $process.Dispose()

    for ($i = 0; $i -lt 45; $i++) {
        Start-Sleep -Seconds 1
        $log = ''
        if (Test-Path -LiteralPath $stdoutLog) { $log += Get-Content -LiteralPath $stdoutLog -Raw -ErrorAction SilentlyContinue }
        if (Test-Path -LiteralPath $stderrLog) { $log += Get-Content -LiteralPath $stderrLog -Raw -ErrorAction SilentlyContinue }
        $match = [regex]::Match($log, 'https://(?!api\.)[a-z0-9-]+\.trycloudflare\.com')
        if ($match.Success) {
            Write-Log "$name tunnel URL: $($match.Value)"
            return $match.Value
        }
    }

    throw "$name tunnel URL was not found in logs."
}

try {
    Write-Log '===== Eduni startup automation started ====='

    Stop-PortOwner 8080
    Stop-PortOwner 8081
    Stop-EduniCommandWindows
    Get-Process cloudflared -ErrorAction SilentlyContinue | Stop-Process -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 2

    Start-HiddenPythonServer 'Eduni DB Hanja Server' $quizRoot
    Wait-Http 'http://127.0.0.1:8080/hanja' 'DB/Hanja server'

	$quizUrl = Start-Tunnel `
		'DB/Hanja' `
		'http://127.0.0.1:8080' `
		(Join-Path $quizWork 'cloudflared_stdout.log') `
		(Join-Path $quizWork 'cloudflared_stderr.log')
    Wait-ExternalHttp "$quizUrl/hanja" 'DB/Hanja tunnel'

    $accessCodePath = Join-Path $quizOutputs 'quiz_access_code.txt'
    $accessCode = ''
    if (Test-Path -LiteralPath $accessCodePath) {
        $accessCode = (Get-Content -LiteralPath $accessCodePath -Raw).Trim()
    }

    @"
External URL: $quizUrl
Access code: $accessCode
Local URL: http://127.0.0.1:8080
Created at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@ | Set-Content -LiteralPath (Join-Path $quizOutputs 'external_access.txt') -Encoding UTF8

    Start-HiddenPythonServer 'Eduni Tetris Server' $gameRoot 8081
    Wait-Http 'http://127.0.0.1:8081' 'Tetris server'

    $gameUrl = Start-Tunnel `
        'Tetris' `
        'http://127.0.0.1:8081' `
        (Join-Path $logDir 'game_cloudflared_stdout.log') `
        (Join-Path $logDir 'game_cloudflared_stderr.log')
    Wait-ExternalHttp $gameUrl 'Tetris tunnel'

    @"
Game external URL: $gameUrl
Local URL: http://127.0.0.1:8081
Access code: none
Created at: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')
"@ | Set-Content -LiteralPath (Join-Path $gameOutputs 'game_external_access.txt') -Encoding UTF8

    Write-Log 'Updating GitHub Pages link files'
    $updateStdout = Join-Path $logDir 'update_links_stdout.log'
    $updateStderr = Join-Path $logDir 'update_links_stderr.log'
    Clear-Content -LiteralPath $updateStdout -ErrorAction SilentlyContinue
    Clear-Content -LiteralPath $updateStderr -ErrorAction SilentlyContinue
    $updateProcess = Start-Process `
        -FilePath 'powershell' `
        -ArgumentList @('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', (Join-Path $linksRoot 'update_links.ps1')) `
        -WorkingDirectory $linksRoot `
        -WindowStyle Hidden `
        -RedirectStandardOutput $updateStdout `
        -RedirectStandardError $updateStderr `
        -Wait `
        -PassThru

    if (Test-Path -LiteralPath $updateStdout) {
        Get-Content -LiteralPath $updateStdout -ErrorAction SilentlyContinue | ForEach-Object { Write-Log $_ }
    }
    if (Test-Path -LiteralPath $updateStderr) {
        Get-Content -LiteralPath $updateStderr -ErrorAction SilentlyContinue | ForEach-Object { Write-Log $_ }
    }
    if ($updateProcess.ExitCode -ne 0) {
        throw "GitHub Pages update failed with exit code $($updateProcess.ExitCode)"
    }

    Write-Log '===== Eduni startup automation finished ====='
}
catch {
    Write-Log "ERROR: $($_.Exception.Message)"
    throw
}
