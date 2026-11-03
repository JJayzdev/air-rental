# Dedicated local GĐ6 preview. Secrets remain only in this process environment.
param([switch]$Build, [switch]$FreshCatalog)
$ErrorActionPreference = 'Stop'
$airRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $airRoot
$airLabels = docker inspect supabase_db_air-rental --format '{{json .Config.Labels}}' | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $airLabels.'com.supabase.cli.project' -ne 'air-rental' -or
    [IO.Path]::GetFullPath($airLabels.'com.supabase.cli.workdir') -ne [IO.Path]::GetFullPath($airRoot)) {
    throw 'Only the dedicated A.I.R local stack may be used.'
}
$airLocal = npx --yes supabase status -o json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $airLocal.API_URL -ne 'http://127.0.0.1:55321' -or -not $airLocal.SERVICE_ROLE_KEY) {
    throw 'Local A.I.R API credentials unavailable.'
}
$env:SUPABASE_SERVICE_ROLE_KEY = $airLocal.SERVICE_ROLE_KEY
# A local-only HMAC key, never reused for a deployment.
$env:CHAT_RATE_LIMIT_SECRET = 'air-local-gd6-acceptance-only-55321-3011'
$env:CHAT_TRUST_PROXY = 'false'
$env:AIR_ENABLE_CHAT_LLM = 'false'
Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
& (Join-Path $PSScriptRoot 'start-gd2-preview.ps1') -Build:$Build -FreshCatalog:$FreshCatalog
