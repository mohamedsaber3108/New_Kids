<#
Run TWO independent evidence passes on EACH of two authorized websites (4 bounded scans),
use the first pass's uninspected/pending routes to seed the second pass,
and optionally continue remaining followup route batches.
No deployment, no Git mutation and no auth/robots bypass.
#>
param(
  [string]$ReferenceUrl = 'https://www.prodigygame.com/main-en',
  [string]$TargetUrl = 'https://kids.usamif.com',
  [string]$OutputRoot = "$env:USERPROFILE\Documents\SiteReconData\Kiro-DoublePass",
  [ValidateRange(2,200)][int]$MaxPages = 200,
  [ValidateRange(0,8)][int]$MaxDepth = 8,
  [ValidateRange(100,10000)][int]$DelayMs = 1000,
  [switch]$IHavePermission,
  [switch]$SavePublicAssets,
  [switch]$ArchivePublicSource,
  [switch]$ContinueFollowupBatches
)
$ErrorActionPreference = 'Stop'
if (-not $IHavePermission) {
  throw 'Permission confirmation required: use -IHavePermission only when authorized to inspect BOTH sites. Respect robots.txt, licenses, and rate limits.'
}
$toolkit = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $toolkit 'package.json'))) { throw 'Could not find toolkit package.json.' }
if (-not (Test-Path (Join-Path $toolkit 'node_modules\playwright'))) {
  throw 'Install dependencies first in the toolkit directory: npm install ; npx playwright install chromium'
}
$siteConfigs = @(
  @{ Name = 'reference'; URL = $ReferenceUrl },
  @{ Name = 'target'; URL = $TargetUrl }
)
New-Item -ItemType Directory -Path $OutputRoot -Force | Out-Null
Push-Location $toolkit
try {
  foreach ($site in $siteConfigs) {
    $siteName = $site.Name
    $siteUrl = $site.URL
    $batchesDir = Join-Path $OutputRoot "$siteName-followup-batches"
    for ($pass = 1; $pass -le 2; $pass++) {
      $label = '{0}-pass-{1:D2}' -f $siteName,$pass
      $outDir = Join-Path $OutputRoot $label
      Write-Host "START $label | $siteUrl | Output $outDir"
      $scanArgs = @(
        'run','scan','--','--url',$siteUrl,'--out',$outDir,
        '--max-pages',"$MaxPages",'--max-depth',"$MaxDepth",'--timeout','60000',
        '--delay',"$DelayMs",'--structural-map','--oss-intelligence',
        '--interactions','--motion','--save-html'
      )
      if ($pass -eq 2) {
        $firstBatch = Join-Path $batchesDir 'routes-001.txt'
        if (Test-Path $firstBatch) { $scanArgs += @('--routes-file',$firstBatch) }
      }
      if ($SavePublicAssets) { $scanArgs += @('--download-assets','--max-assets','200') }
      if ($ArchivePublicSource) { $scanArgs += @('--archive-public-source','--max-source-files','150') }
      & npm @scanArgs
      if ($LASTEXITCODE -ne 0) { throw "Scan $label failed with exit code $LASTEXITCODE. See console notes; do not claim it succeeded." }
      if (-not (Test-Path (Join-Path $outDir 'evidence.json'))) { throw "Scan $label did not produce evidence.json" }
      & node 'scripts/kiro-build-page-briefs.mjs' '--reference' $outDir '--out' (Join-Path $outDir 'KIRO_PAGE_BRIEFS')
      if ($LASTEXITCODE -ne 0) { throw "Could not generate page briefs for $label" }
      if ($pass -eq 1) {
        & node 'scripts/kiro-build-followup-batches.mjs' '--reference' $outDir '--out' $batchesDir '--batch-size' "$($MaxPages-1)"
        if ($LASTEXITCODE -ne 0) { throw "Could not generate followup batches for $label" }
      }
      Write-Host "COMPLETED $label | Review QUALITY_GATES.md for gaps; do not assume full-site coverage."
    }
    if ($ContinueFollowupBatches) {
      $batchFiles = @(Get-ChildItem -LiteralPath $batchesDir -Filter 'routes-*.txt' -File | Sort-Object Name | Select-Object -Skip 1)
      foreach ($batch in $batchFiles) {
        $batchId = [System.IO.Path]::GetFileNameWithoutExtension($batch.Name)
        $outDir = Join-Path $OutputRoot "$siteName-followup-$batchId"
        $scanArgs = @('run','scan','--','--url',$siteUrl,'--out',$outDir,'--max-pages',"$MaxPages",'--max-depth',"$MaxDepth",'--timeout','60000','--delay',"$DelayMs",'--routes-file',$batch.FullName,'--structural-map','--oss-intelligence','--interactions','--motion','--save-html')
        if ($SavePublicAssets) { $scanArgs += @('--download-assets','--max-assets','200') }
        if ($ArchivePublicSource) { $scanArgs += @('--archive-public-source','--max-source-files','150') }
        & npm @scanArgs
        if ($LASTEXITCODE -ne 0) { throw "Followup scan failed at $siteName $batchId" }
        & node 'scripts/kiro-build-page-briefs.mjs' '--reference' $outDir '--out' (Join-Path $outDir 'KIRO_PAGE_BRIEFS')
        if ($LASTEXITCODE -ne 0) { throw "Page briefs failed at $siteName $batchId" }
      }
    }
  }
  Write-Host 'All REQUESTED bounded scans finished. Review individual QUALITY_GATES.md files; full route coverage is NOT guaranteed.'
} finally {
  Pop-Location
}
