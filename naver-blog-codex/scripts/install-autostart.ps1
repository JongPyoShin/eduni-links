$ErrorActionPreference = 'Stop'
$HelperRoot = Split-Path -Parent $PSScriptRoot
$StartScript = Join-Path $PSScriptRoot 'start-watch-on-logon.ps1'
$RequiredFiles = @(
  (Join-Path $HelperRoot 'eduni-origin.json'),
  (Join-Path $HelperRoot 'watch-settings.json'),
  (Join-Path $HelperRoot 'node_modules\playwright\package.json'),
  (Join-Path $HelperRoot 'naver-profile')
)
foreach ($Path in $RequiredFiles) {
  if (-not (Test-Path -LiteralPath $Path)) {
    throw "Required local setup is missing: $Path. Run npm install, npm run watch:configure, and npm run login first."
  }
}
$Node = Get-Command node.exe -ErrorAction Stop
$TaskName = 'EDUNI Reading Blog Watcher'
$CurrentUser = [System.Security.Principal.WindowsIdentity]::GetCurrent().Name
$PowerShell = Join-Path $PSHOME 'powershell.exe'
$Arguments = '-NoProfile -ExecutionPolicy Bypass -WindowStyle Minimized -File "' + $StartScript + '"'
$Existing = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if ($Existing) {
  $ExistingAction = $Existing.Actions | Select-Object -First 1
  if ($ExistingAction.Execute -ne $PowerShell -or $ExistingAction.Arguments -notlike ('*' + $StartScript + '*')) {
    throw "A different scheduled task named '$TaskName' already exists. It was left unchanged."
  }
}
$Action = New-ScheduledTaskAction -Execute $PowerShell -Argument $Arguments -WorkingDirectory $HelperRoot
$Trigger = New-ScheduledTaskTrigger -AtLogOn -User $CurrentUser
$Principal = New-ScheduledTaskPrincipal -UserId $CurrentUser -LogonType Interactive -RunLevel Limited
$Settings = New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -StartWhenAvailable -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries
Register-ScheduledTask -TaskName $TaskName -Action $Action -Trigger $Trigger -Principal $Principal -Settings $Settings -Description 'Starts the local EDUNI reading-record watcher in the signed-in Windows session.' -Force | Out-Null
Write-Host "Registered '$TaskName' for $CurrentUser at Windows sign-in. The PowerShell window starts minimized so its prompts remain available."
