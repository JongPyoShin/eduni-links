$deployPath = Join-Path $PSScriptRoot '..\deploy.ps1'
$tokens = $null
$parseErrors = $null
$deployAst = [System.Management.Automation.Language.Parser]::ParseFile((Resolve-Path $deployPath), [ref]$tokens, [ref]$parseErrors)
if ($parseErrors.Count) { throw ($parseErrors | Out-String) }

function Assert($condition, $message) { if (-not $condition) { throw $message } }
$recoveryFunctions = $deployAst.FindAll({
  param($node)
  $node -is [System.Management.Automation.Language.FunctionDefinitionAst] -and
    $node.Name -in @('EffectivePortSignature', 'NeedsMissingPortRecovery')
}, $true)
if ($recoveryFunctions.Count -ne 2) { throw "Expected two recovery functions, got $($recoveryFunctions.Count)" }
foreach ($functionAst in $recoveryFunctions) { Invoke-Expression $functionAst.Extent.Text }
$noOpGuard = $deployAst.FindAll({
  param($node)
  $node -is [System.Management.Automation.Language.IfStatementAst] -and $node.Extent.Text.Contains('release already current; no-op')
}, $true) | Select-Object -First 1
if ($null -eq $noOpGuard) { throw 'Could not find the deployment no-op guard' }
$script:NoOpGuardExpression = $noOpGuard.Clauses[0].Item1.Extent.Text

$script:ExpectedPortSignature = '100.75.214.95:8081->18081/tcp;127.0.0.1:8081->18081/tcp'
$script:NormalInspect = [pscustomobject]@{ NetworkSettings = [pscustomobject]@{ Ports = [pscustomobject]@{
  '18081/tcp' = @(
    [pscustomobject]@{ HostIp = '100.75.214.95'; HostPort = '8081' },
    [pscustomobject]@{ HostIp = '127.0.0.1'; HostPort = '8081' }
  )
} } }
$script:MissingInspect = [pscustomobject]@{ NetworkSettings = [pscustomobject]@{ Ports = [pscustomobject]@{ '18081/tcp' = @() } } }
$script:PartialInspect = [pscustomobject]@{ NetworkSettings = [pscustomobject]@{ Ports = [pscustomobject]@{
  '18081/tcp' = @([pscustomobject]@{ HostIp = '127.0.0.1'; HostPort = '8081' })
} } }
$script:MismatchedInspect = [pscustomobject]@{ NetworkSettings = [pscustomobject]@{ Ports = [pscustomobject]@{
  '18081/tcp' = @([pscustomobject]@{ HostIp = '127.0.0.1'; HostPort = '8082' })
} } }

Describe 'EDUNI published port recovery predicate' {
  It 'keeps the exact published mapping on the normal path' {
    (EffectivePortSignature $script:NormalInspect) | Should Be $script:ExpectedPortSignature
    (NeedsMissingPortRecovery $script:NormalInspect $script:ExpectedPortSignature $false) | Should Be $false
  }

  It 'allows recovery for zero published bindings only with Apply' {
    (EffectivePortSignature $script:MissingInspect) | Should Be ''
    (NeedsMissingPortRecovery $script:MissingInspect $script:ExpectedPortSignature $true) | Should Be $true
  }

  It 'recreates the same image when recovering ports but keeps the normal same-image no-op' {
    $Apply = $true
    $before = [pscustomobject]@{ Image = 'same-image' }
    $release = [pscustomobject]@{ app = [pscustomobject]@{ image_id = 'same-image' } }
    $recoverMissingPublishedPorts = $true
    (Invoke-Expression $script:NoOpGuardExpression) | Should Be $false

    $recoverMissingPublishedPorts = $false
    (Invoke-Expression $script:NoOpGuardExpression) | Should Be $true
  }

  It 'rejects zero published bindings without Apply' {
    $failure = $null
    try { $null = NeedsMissingPortRecovery $script:MissingInspect $script:ExpectedPortSignature $false }
    catch { $failure = $_.Exception.Message }
    $failure | Should Be 'Running app has no effective published ports; recovery requires deploy.ps1 -Apply'
  }

  It 'fails closed for partial and mismatched published bindings' {
    foreach ($inspect in @($script:PartialInspect, $script:MismatchedInspect)) {
      $failure = $null
      try { $null = NeedsMissingPortRecovery $inspect $script:ExpectedPortSignature $true }
      catch { $failure = $_.Exception.Message }
      $failure | Should Be 'Running app effective port bindings differ from the release manifest; recovery refused'
    }
  }
}
