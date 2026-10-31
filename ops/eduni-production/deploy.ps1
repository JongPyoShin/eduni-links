param(
  [switch]$Apply,
  [switch]$DryRun,
  [string]$HostConfigDir = $env:EDUNI_HOST_CONFIG_DIR
)
$ErrorActionPreference = 'Stop'
function Assert($condition, $message) { if (-not $condition) { throw $message } }
if ([string]::IsNullOrWhiteSpace($HostConfigDir)) {
  throw 'Set EDUNI_HOST_CONFIG_DIR to the external host configuration directory or pass -HostConfigDir.'
}
if (-not (Test-Path -LiteralPath $HostConfigDir -PathType Container)) {
  throw 'External host configuration directory not found.'
}
$HostConfigDir = (Resolve-Path -LiteralPath $HostConfigDir).Path
$repoRoot = (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot '..\..')).Path
$sourceRoot = Join-Path $repoRoot 'nice-gui-1-1-7'
$activePointerPath = Join-Path $HostConfigDir 'release.json'
Assert (Test-Path -LiteralPath $activePointerPath -PathType Leaf) 'External release pointer missing'
$activePointer = Get-Content -Raw $activePointerPath | ConvertFrom-Json
$releaseFile = if ([IO.Path]::IsPathRooted([string]$activePointer.release_path)) { [string]$activePointer.release_path } else { Join-Path $HostConfigDir $activePointer.release_path }
$releaseFile = [IO.Path]::GetFullPath($releaseFile)
$release = Get-Content -Raw $releaseFile | ConvertFrom-Json
$compose = Join-Path $HostConfigDir 'compose.yml'
$relayCompose = Join-Path $HostConfigDir 'relay.compose.yml'
$dbEnvFile = if ([IO.Path]::IsPathRooted([string]$release.env_file)) { [string]$release.env_file } else { Join-Path $HostConfigDir $release.env_file }
$companionEnvFile = if ([IO.Path]::IsPathRooted([string]$release.companion_env_file)) { [string]$release.companion_env_file } else { Join-Path $HostConfigDir $release.companion_env_file }
function DockerJson([string[]]$arguments) {
  $text = & docker @arguments
  Assert ($LASTEXITCODE -eq 0) "Docker command failed: $($arguments[0])"
  return $text | ConvertFrom-Json
}
function Inspect([string]$name) { return (DockerJson @('inspect', $name))[0] }
function DbSnapshot {
  $sql = @'
SELECT format('SELECT %L || ''='' || count(*) FROM %I.%I;', schemaname||'.'||tablename, schemaname, tablename) FROM pg_tables WHERE schemaname NOT IN ('pg_catalog','information_schema') ORDER BY schemaname, tablename \gexec
'@
  $out = $sql | & docker exec -i eduni-postgres psql -U eduni -d eduni -At -v ON_ERROR_STOP=1
  Assert ($LASTEXITCODE -eq 0) 'Could not read PostgreSQL database/table counts'
  return ($out -join "`n")
}
function CheckRoutes([bool]$CheckAI) {
  $base = 'http://127.0.0.1:8081'
  try { $homeResponse = Invoke-WebRequest -Uri "$base/" -UseBasicParsing -MaximumRedirection 0 -TimeoutSec 8 }
  catch { $homeResponse = $_.Exception.Response }
  Assert ($homeResponse.StatusCode -eq 307 -and $homeResponse.Headers.Location -eq '/portal') 'Home route no longer redirects to the retained portal'
  $health = Invoke-WebRequest -Uri "$base/healthz" -UseBasicParsing -TimeoutSec 8
  Assert ($health.StatusCode -eq 200) 'App health route failed'
  foreach ($feature in $release.features) {
    $r = Invoke-WebRequest -Uri "$base$($feature.path)" -UseBasicParsing -TimeoutSec 8
    Assert ($r.StatusCode -eq 200) "Retained feature failed: $($feature.path)"
    if ($feature.marker) { Assert ($r.Content.Contains($feature.marker)) "Retained feature content marker missing: $($feature.path)" }
    if ($feature.source_file) {
      $source = Get-Content -Raw (Join-Path $sourceRoot $feature.source_file)
      Assert ($source.Contains($feature.source_marker)) "Retained feature source marker missing: $($feature.path)"
    }
  }
  $ready = Invoke-RestMethod -Uri $release.relay.ready_url -TimeoutSec 5
  Assert ($ready.status -eq 'ready') 'AI relay readiness failed'
  if ($CheckAI) {
    $body = @{ prompt = 'Reply with a short greeting.'; context = @{ activity = 'general'; question = ''; choices = @(); selected = '' } } | ConvertTo-Json -Depth 4 -Compress
    $chat = Invoke-RestMethod -Uri "$($release.ai.origin)/ai/companion/chat" -Method Post -ContentType 'application/json' -Headers @{ Origin = $release.ai.origin; 'X-Requested-With' = 'XMLHttpRequest' } -Body $body -TimeoutSec 45
    Assert ($chat.ok -eq $true -and -not [string]::IsNullOrWhiteSpace($chat.answer)) 'AI companion returned no answer'
  }
}
function PortSignature($inspect) {
  $values = foreach ($pair in $inspect.HostConfig.PortBindings.PSObject.Properties) {
    foreach ($binding in $pair.Value) { "$($binding.HostIp):$($binding.HostPort)->$($pair.Name)" }
  }
  return (@($values | Sort-Object) -join ';')
}
function MountSignature($inspect) {
  return (@($inspect.Mounts | ForEach-Object { "$($_.Type):$($_.Name):$($_.Destination):$($_.RW)" } | Sort-Object) -join ';')
}
function EnvMap($inspect) {
  $map = @{}
  foreach ($entry in $inspect.Config.Env) { $parts = $entry.Split('=', 2); $map[$parts[0]] = if ($parts.Count -gt 1) { $parts[1] } else { '' } }
  return $map
}
function NormalizePath([string]$path) { return [IO.Path]::GetFullPath($path).TrimEnd('\').ToLowerInvariant() }
function ComposePortSignature($ports) {
  $values = foreach ($port in $ports) { "$($port.host_ip):$($port.published)->$($port.target)/$($port.protocol)" }
  return (@($values | Sort-Object) -join ';')
}
function WaitHealthy {
  $until = [DateTime]::UtcNow.AddSeconds(45)
  do {
    $i = Inspect 'eduni-game'
    if ($i.State.Status -eq 'running' -and $i.State.Health.Status -eq 'healthy') { return $i }
    Start-Sleep -Seconds 3
  } while ([DateTime]::UtcNow -lt $until)
  throw 'App did not become healthy within 45 seconds'
}
function AssertSameServices([string]$beforeDb) {
  foreach ($name in $release.unrelated_container_ids.PSObject.Properties.Name) {
    Assert ((Inspect $name).Id -eq $release.unrelated_container_ids.$name) "$name container changed"
  }
  Assert ((DbSnapshot) -ceq $beforeDb) 'PostgreSQL table/database counts changed'
}

Assert (Test-Path -LiteralPath $compose) 'Canonical Compose file missing'
Assert (Test-Path -LiteralPath $relayCompose) 'Relay reference Compose file missing'
Assert (Test-Path -LiteralPath $dbEnvFile) 'Existing database env file missing'
Assert (Test-Path -LiteralPath $companionEnvFile) 'Existing companion env file missing'
$built = (DockerJson @('image','inspect',$release.app.image_tag))[0]
Assert ($built.Id -eq $release.app.image_id) 'Local release tag does not match the pinned image ID'
$relayBuilt = (DockerJson @('image','inspect',$release.relay.image_tag))[0]
Assert ($relayBuilt.Id -eq $release.relay.image_id) 'Canonical relay image tag does not match its pinned ID'
$cfgText = & docker compose -p $release.project --project-directory $HostConfigDir --env-file $dbEnvFile -f $compose config --format json
Assert ($LASTEXITCODE -eq 0) 'Compose validation failed'
$cfg = $cfgText | ConvertFrom-Json
$service = $cfg.services.'eduni-game'
Assert ($service.image -eq $release.app.image_tag) 'Unexpected Compose app image'
Assert ((ComposePortSignature $service.ports) -eq $release.app.port_signature) 'Compose ports differ from the retained baseline'
Assert ($cfg.volumes.eduni_data.external -and $cfg.volumes.eduni_data.name -eq $release.data.volume) 'Compose does not use the existing data volume'
Assert ($cfg.networks.existing_eduni.external -and $cfg.networks.existing_eduni.name -eq $release.network.name) 'Compose does not use the existing network'
$net = (DockerJson @('network','inspect',$release.network.name))[0]
Assert ($net.Id -eq $release.network.id) 'External network identity changed'
$relayCfgText = & docker compose -p eduni-relay-reference --project-directory $HostConfigDir --profile manual-reference-only --env-file $dbEnvFile --env-file $companionEnvFile -f $relayCompose config --format json
Assert ($LASTEXITCODE -eq 0) 'Relay reference Compose validation failed'
$relayService = ($relayCfgText | ConvertFrom-Json).services.'eduni-gpt-relay'
Assert ($relayService.image -eq $release.relay.image_tag) 'Unexpected relay reference image'
Assert ((ComposePortSignature $relayService.ports) -eq $release.relay.port_signature) 'Relay reference port mapping changed'
$relayVolume = @($relayService.volumes | Where-Object { $_.target -eq $release.relay.key_mount.container_path -and $_.source -eq $release.relay.key_mount.host_path -and $_.read_only })
Assert ($relayVolume.Count -eq 1) 'Relay read-only key mount changed'
$relayLive = Inspect 'eduni-gpt-relay'
$relayRuntimeEnv = EnvMap $relayLive
$relayConfigEnv = @{}
foreach ($entry in $relayService.environment.PSObject.Properties) {
  if ($entry.Name -like 'EDUNI_*' -or $entry.Name -eq 'PORT') { $relayConfigEnv[$entry.Name] = [string]$entry.Value }
}
foreach ($key in @($relayRuntimeEnv.Keys | Where-Object { $_ -like 'EDUNI_*' -or $_ -eq 'PORT' })) {
  Assert ($relayConfigEnv.ContainsKey($key) -and $relayConfigEnv[$key] -ceq $relayRuntimeEnv[$key]) "Relay environment mismatch: $key (values suppressed)"
}
Assert (Test-Path -LiteralPath $release.relay.key_mount.host_path) 'Existing relay key mount missing'
if ($DryRun) { Write-Output 'DRY RUN PASS: app/relay pinned IDs, one app Compose file, external volume/network, relay references and env interpolation verified; no production endpoints called.'; exit 0 }

$before = Inspect 'eduni-game'
$pgBefore = Inspect 'eduni-postgres'
$relayBefore = Inspect 'eduni-gpt-relay'
Assert ($before.Image -eq $release.app.previous_image_id -or $before.Image -eq $release.app.image_id) 'Running app image drift; re-audit required'
Assert ($before.State.Status -eq 'running' -and $before.State.Health.Status -eq 'healthy') 'Current app is not healthy'
Assert ($before.Config.Labels.'com.docker.compose.project' -eq $release.project) 'Unexpected running project'
if ($before.Image -eq $release.app.previous_image_id) {
  Assert ((NormalizePath $before.Config.Labels.'com.docker.compose.project.config_files') -eq (NormalizePath $release.app.previous_compose_file)) 'Running app Compose provenance changed'
} else {
  Assert ((NormalizePath $before.Config.Labels.'com.docker.compose.project.config_files') -eq (NormalizePath $compose)) 'Target app image uses unexpected Compose provenance'
}
Assert ($pgBefore.Id -eq $release.unrelated_container_ids.'eduni-postgres') 'Postgres identity drift'
Assert ($relayBefore.Id -eq $release.unrelated_container_ids.'eduni-gpt-relay' -and $relayBefore.Image -eq $release.relay.image_id) 'Relay identity or image drift'
Assert ((MountSignature $before) -eq $release.app.mount_signature) 'Running app volume drift'
Assert ((PortSignature $before) -eq $release.app.port_signature) 'Running app port drift'
$liveEnv = EnvMap $before
$composeEnv = @{}
foreach ($entry in $service.environment.PSObject.Properties) {
  if ($entry.Name -like 'EDUNI_*' -or $entry.Name -eq 'PORT') { $composeEnv[$entry.Name] = [string]$entry.Value }
}
foreach ($key in @($liveEnv.Keys | Where-Object { $_ -like 'EDUNI_*' -or $_ -eq 'PORT' })) {
  Assert ($composeEnv.ContainsKey($key) -and $liveEnv[$key] -ceq $composeEnv[$key]) "Compose environment mismatch: $key (values suppressed)"
}
$dbBefore = DbSnapshot
CheckRoutes $true
if (-not $Apply -or $before.Image -eq $release.app.image_id) {
  $mode = if ($before.Image -eq $release.app.image_id) { 'release already current; no-op' } else { 'no deployment performed' }
  Write-Output "PREFLIGHT PASS: all feature markers, AI relay and bounded AI response verified; $mode."
  exit 0
}

$composeArgs = @('compose','-p',$release.project,'--project-directory',$HostConfigDir,'--env-file',$dbEnvFile,'-f',$compose)
$oldImageId = $before.Image
try {
  & docker @composeArgs up -d --no-deps --no-build --force-recreate eduni-game
  Assert ($LASTEXITCODE -eq 0) 'App replacement command failed'
  $after = WaitHealthy
  Assert ($after.Image -eq $release.app.image_id -and $after.State.Status -eq 'running') 'New app image did not start'
  Assert ((MountSignature $after) -eq $release.app.mount_signature) 'App data mount changed'
  Assert ((PortSignature $after) -eq $release.app.port_signature) 'App port bindings changed'
  $afterEnv = EnvMap $after
  foreach ($key in $liveEnv.Keys) { Assert ($afterEnv.ContainsKey($key) -and $afterEnv[$key] -ceq $liveEnv[$key]) "App environment changed: $key (values suppressed)" }
  AssertSameServices $dbBefore
  CheckRoutes $true
  Write-Output "DEPLOY PASS: app container $($after.Id), image $($after.Image); data, ports, PostgreSQL counts, relay and AI verified."
} catch {
  $failure = $_.Exception.Message
  if ($oldImageId -ne $release.app.image_id) {
    $rollbackFailure = $null
    $tagFailure = $null
    try {
    & docker tag $oldImageId $release.app.image_tag
    Assert ($LASTEXITCODE -eq 0) 'Rollback could not restore the pinned prior app image tag'
    & docker @composeArgs up -d --no-deps --no-build --force-recreate eduni-game
    Assert ($LASTEXITCODE -eq 0) 'Rollback Compose command failed'
    $rolledBack = WaitHealthy
    Assert ($rolledBack.Image -eq $oldImageId) 'Rollback restored the wrong image'
    Assert ((MountSignature $rolledBack) -eq $release.app.mount_signature) 'Rollback data mount changed'
    Assert ((PortSignature $rolledBack) -eq $release.app.port_signature) 'Rollback port bindings changed'
    AssertSameServices $dbBefore
    CheckRoutes $true
    } catch { $rollbackFailure = $_.Exception.Message }
    finally {
    & docker tag $release.app.image_id $release.app.image_tag
      if ($LASTEXITCODE -ne 0) { $tagFailure = 'Could not restore target image tag after rollback' }
    }
    if ($rollbackFailure -or $tagFailure) { throw "Deployment failed ($failure); rollback validation failed: $rollbackFailure $tagFailure" }
    throw "Deployment failed ($failure); prior image rollback and retained routes were verified"
  }
  throw "Deployment failed while target image was already running; no prior image rollback is available: $failure"
}
