# GĐ3 local-only wrapper; credentials stay in the preview process environment.
param([switch]$Build, [switch]$FreshCatalog, [switch]$EnableIdentityTest, [switch]$EnablePhoneOtp)
$ErrorActionPreference = 'Stop'
$airRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $airRoot
$airLabels = docker inspect supabase_db_air-rental --format '{{json .Config.Labels}}' | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $airLabels.'com.supabase.cli.project' -ne 'air-rental' -or
    [IO.Path]::GetFullPath($airLabels.'com.supabase.cli.workdir') -ne [IO.Path]::GetFullPath($airRoot)) {
    throw 'Start the dedicated A.I.R Supabase stack in this repository first.'
}
$env:AIR_ENABLE_IDENTITY_DOCUMENTS = if ($EnableIdentityTest) { 'true' } else { 'false' }
$env:AIR_ENABLE_PHONE_OTP = if ($EnablePhoneOtp) { 'true' } else { 'false' }
Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
if ($EnableIdentityTest) {
    $airLocal = npx --yes supabase status -o json | ConvertFrom-Json
    if ($LASTEXITCODE -ne 0 -or $airLocal.API_URL -ne 'http://127.0.0.1:55321' -or -not $airLocal.SERVICE_ROLE_KEY) {
        throw 'Only the dedicated local A.I.R credentials can be used by this test helper.'
    }
    $env:SUPABASE_SERVICE_ROLE_KEY = $airLocal.SERVICE_ROLE_KEY
}
& (Join-Path $PSScriptRoot 'start-gd2-preview.ps1') -Build:$Build -FreshCatalog:$FreshCatalog
