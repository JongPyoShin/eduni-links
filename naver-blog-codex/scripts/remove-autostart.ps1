$ErrorActionPreference = 'Stop'
$StartScript = Join-Path $PSScriptRoot 'start-watch-on-logon.ps1'
$TaskName = 'EDUNI Reading Blog Watcher'
$Task = Get-ScheduledTask -TaskName $TaskName -ErrorAction SilentlyContinue
if (-not $Task) {
  Write-Host "'$TaskName' is not registered."
  exit 0
}
$Action = $Task.Actions | Select-Object -First 1
if ($Action.Arguments -notlike ('*' + $StartScript + '*')) {
  throw "The task '$TaskName' points somewhere else; it was left unchanged."
}
if ($Task.State -eq 'Running') { Stop-ScheduledTask -TaskName $TaskName }
$WatchScript = Join-Path (Split-Path -Parent $PSScriptRoot) 'src\watch.js'
$NodeProcesses = Get-CimInstance Win32_Process -Filter "Name = 'node.exe'" | Where-Object { $_.CommandLine -and $_.CommandLine.Contains($WatchScript) }
foreach ($Process in $NodeProcesses) { Stop-Process -Id $Process.ProcessId -Force }
Unregister-ScheduledTask -TaskName $TaskName -Confirm:$false
Write-Host "Removed '$TaskName' and its watcher processes. Local drafts and login profile were left untouched."
