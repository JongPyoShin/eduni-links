<#
Install/status/remove the EDUNI GPT bridge's CURRENT-USER scheduled task.
Requires an interactive Windows login using the same DPAPI registration account.
Never use SYSTEM, S4U, or another user for the ChatGPT registration.
#>
[CmdletBinding()]
param(
    [ValidateSet('Install', 'Status', 'Remove')]
    [string]$Action = 'Status',
    [string]$PythonPath = '',
    [string]$ConfigPath = '',
    [ValidatePattern('^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$')]
    [string]$TaskName = 'EDUNI-ChatGPT-Bridge',
    [switch]$ReplaceExistingManagedTask,
    [switch]$NoStart
)

$ErrorActionPreference = 'Stop'
$taskName = $TaskName
$appRoot = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$registration = Join-Path $env:LOCALAPPDATA 'EDUNI\ChatGPT\registration.dpapi'

function Resolve-Python {
    if ($PythonPath) {
        $commandPath = $PythonPath
    }
    else {
        $commandPath = (Get-Command 'python.exe' -CommandType Application -ErrorAction Stop).Source
    }
    $resolved = (& $commandPath -c 'import sys; print(sys.executable)' 2>$null | Select-Object -First 1)
    if ($LASTEXITCODE -ne 0 -or -not $resolved -or -not (Test-Path -LiteralPath $resolved -PathType Leaf)) {
        throw 'A working local Python interpreter is required; use -PythonPath for a specific interpreter.'
    }
    return $resolved.Trim()
}

function Get-ExistingTask {
    return Get-ScheduledTask -TaskName $taskName -ErrorAction SilentlyContinue
}

function Assert-ManagedTask($task) {
    $actions = @($task.Actions)
    $arguments = if ($actions.Count -eq 1) { $actions[0].Arguments } else { '' }
    $sid = ''
    try {
        $sid = ([Security.Principal.NTAccount]$task.Principal.UserId).Translate(
            [Security.Principal.SecurityIdentifier]
        ).Value
    }
    catch {
        # Unknown task identities are never safe to change.
    }
    $knownDescription = $task.Description -in @(
        'EDUNI supervised ChatGPT bridge; managed by install_companion_bridge_task.ps1',
        'EDUNI loopback ChatGPT bridge for current interactive DPAPI user; restart supervisor after failure.'
    )
    $knownAction = $actions.Count -eq 1 -and
        $actions[0].Execute -match '(?i)(^|\\)pythonw?\.exe$' -and
        ($arguments -match '^\s*-m scripts\.companion_bridge_daemon(?: --config-path "[^"]+")? --run$' -or
            $arguments -match '^\s*-m scripts\.run_companion_bridge --task --origin "https://[^"\s]+"$')
    if (-not $knownDescription -or -not $knownAction -or
        $sid -ne [System.Security.Principal.WindowsIdentity]::GetCurrent().User.Value -or
        $task.Principal.LogonType -ne 'Interactive' -or
        $task.Principal.RunLevel -ne 'Limited') {
        throw 'A same-name scheduled task is not the managed bridge for this user; it was not changed.'
    }
}

if ($Action -eq 'Remove') {
    $task = Get-ExistingTask
    if ($task) {
        Assert-ManagedTask $task
        if ($task.State -eq 'Running') {
            Stop-ScheduledTask -TaskName $taskName -ErrorAction Stop
        }
        Unregister-ScheduledTask -TaskName $taskName -Confirm:$false
        Write-Output "Removed scheduled task $taskName."
        Write-Output 'A separately started or previously orphaned bridge is not terminated.'
    }
    else {
        Write-Output 'Companion bridge task not registered.'
    }
    return
}

$configPath = if ($ConfigPath) { $ConfigPath } else { Join-Path $appRoot '.env.companion' }
if (-not (Test-Path -LiteralPath $configPath -PathType Leaf)) {
    throw 'Companion settings file not found; pass -ConfigPath to the existing settings file.'
}
$configPath = (Resolve-Path -LiteralPath $configPath).Path

if ($Action -eq 'Status') {
    $task = Get-ExistingTask
    if ($task) {
        Write-Output "Task: $taskName"
        Write-Output "State: $($task.State)"
        Write-Output "Run as: $($task.Principal.UserId) [$($task.Principal.LogonType)]"
        $info = Get-ScheduledTaskInfo -TaskName $taskName
        Write-Output "Last result: $($info.LastTaskResult)"
        Write-Output "Last run: $($info.LastRunTime)"
    }
    else {
        Write-Output 'Companion bridge task not registered.'
    }
    try {
        $python = Resolve-Python
        Push-Location $appRoot
        try {
            & $python -m scripts.companion_bridge_daemon --config-path "$configPath" --status
        }
        finally {
            Pop-Location
        }
    }
    catch {
        Write-Output 'Bridge status check could not start with the selected Python interpreter.'
    }
    return
}

# Registration contains DPAPI-protected OAuth tokens for a particular Windows user.
# A scheduled task running as SYSTEM, S4U, or another account cannot reliably decrypt it.
$identity = [System.Security.Principal.WindowsIdentity]::GetCurrent()
if ($identity.IsSystem -or -not [Environment]::UserInteractive) {
    throw 'Install must be run while logged in as the Windows account that registered ChatGPT.'
}
if (-not (Test-Path -LiteralPath $registration -PathType Leaf)) {
    throw "ChatGPT registration unavailable under the current account's LOCALAPPDATA. Re-register under this interactive user; do not copy credential files."
}
$python = Resolve-Python
$existingTask = Get-ExistingTask
if ($existingTask) {
    if (-not $ReplaceExistingManagedTask) {
        throw 'Scheduled task already exists. Choose a new -TaskName or explicitly request replacement after verification.'
    }
    Assert-ManagedTask $existingTask
    if ($existingTask.State -eq 'Running') {
        throw 'Stop the existing managed bridge task before upgrading its running action.'
    }
}
Push-Location $appRoot
try {
    & $python -m scripts.companion_bridge_daemon --config-path "$configPath" --check-config
    if ($LASTEXITCODE -ne 0) {
        throw 'Existing companion configuration is invalid or missing.'
    }
    & $python -m scripts.companion_bridge_daemon --config-path "$configPath" --check-registration
    if ($LASTEXITCODE -ne 0) {
        throw 'The current Windows user cannot read or refresh the ChatGPT registration. Task was not installed.'
    }
}
finally {
    Pop-Location
}

$taskAction = New-ScheduledTaskAction -Execute $python -Argument "-m scripts.companion_bridge_daemon --config-path `"$configPath`" --run" -WorkingDirectory $appRoot
$trigger = New-ScheduledTaskTrigger -AtLogOn -User $identity.Name
$principal = New-ScheduledTaskPrincipal -UserId $identity.Name -LogonType Interactive -RunLevel Limited
$settings = New-ScheduledTaskSettingsSet `
    -ExecutionTimeLimit (New-TimeSpan -Seconds 0) `
    -MultipleInstances IgnoreNew `
    -RestartCount 99 `
    -RestartInterval (New-TimeSpan -Minutes 1) `
    -StartWhenAvailable `
    -AllowStartIfOnBatteries `
    -DontStopIfGoingOnBatteries

Register-ScheduledTask -TaskName $taskName -Action $taskAction -Trigger $trigger -Principal $principal -Settings $settings -Description 'EDUNI loopback ChatGPT bridge for current interactive DPAPI user; restart supervisor after failure.' -Force | Out-Null
Write-Output "Installed $taskName for $($identity.Name), Interactive logon only."
Write-Output "Python: $python"
Write-Output 'Bridge binds only to Windows loopback port 8765; existing Docker services are not changed.'
if (-not $NoStart) {
    Start-ScheduledTask -TaskName $taskName
    Write-Output 'Task started; run -Action Status and review the user-local supervisor log.'
}
