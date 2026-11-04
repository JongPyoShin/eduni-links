$ErrorActionPreference = 'Stop'
$HelperRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $HelperRoot
$Node = (Get-Command node.exe -ErrorAction Stop).Source
& $Node (Join-Path $HelperRoot 'src\watch.js')
$ExitCode = $LASTEXITCODE
if ($ExitCode -ne 0) {
  Write-Host "EDUNI blog watcher exited with code $ExitCode."
  [void](Read-Host 'Press Enter to close this window')
}
exit $ExitCode
