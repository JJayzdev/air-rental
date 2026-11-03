# Local-only GĐ7 preview. Payment details below are synthetic and must never be reused for a bank.
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
$airNames = @(
    'NEXT_PUBLIC_APP_URL','NEXT_PUBLIC_SUPABASE_URL','NEXT_PUBLIC_SUPABASE_ANON_KEY','SUPABASE_SERVICE_ROLE_KEY',
    'AIR_ENABLE_PAYMENTS','SEPAY_WEBHOOK_SECRET','AIR_BANK_NAME','AIR_BANK_ACCOUNT_NUMBER','AIR_BANK_ACCOUNT_NAME',
    'AIR_ENABLE_ERROR_ALERTS','OPS_ALERT_WEBHOOK_URL',
    'CHAT_RATE_LIMIT_SECRET','CHAT_TRUST_PROXY','AIR_ENABLE_CHAT_LLM','AIR_ENABLE_PHONE_OTP','AIR_ENABLE_IDENTITY_DOCUMENTS',
    'OPENAI_API_KEY','OPENAI_MODEL'
)
$airPrevious = @{}
foreach ($airName in $airNames) { $airPrevious[$airName] = [Environment]::GetEnvironmentVariable($airName, 'Process') }
try {
    $env:NEXT_PUBLIC_APP_URL = 'http://localhost:3011'
    $env:NEXT_PUBLIC_SUPABASE_URL = $airLocal.API_URL
    $env:NEXT_PUBLIC_SUPABASE_ANON_KEY = $airLocal.ANON_KEY
    $env:SUPABASE_SERVICE_ROLE_KEY = $airLocal.SERVICE_ROLE_KEY
    $env:AIR_ENABLE_PAYMENTS = 'true'
    $env:SEPAY_WEBHOOK_SECRET = 'air-local-gd7-webhook-only-55321-3011'
    $env:AIR_ENABLE_ERROR_ALERTS = 'false'
    Remove-Item Env:OPS_ALERT_WEBHOOK_URL -ErrorAction SilentlyContinue
    $env:AIR_BANK_NAME = 'LOCAL TEST BANK'
    $env:AIR_BANK_ACCOUNT_NUMBER = '0000000000'
    $env:AIR_BANK_ACCOUNT_NAME = 'LOCAL TEST ONLY'
    $env:CHAT_RATE_LIMIT_SECRET = 'air-local-gd7-chat-only-55321-3011'
    $env:CHAT_TRUST_PROXY = 'false'
    $env:AIR_ENABLE_CHAT_LLM = 'false'
    $env:AIR_ENABLE_PHONE_OTP = 'false'
    $env:AIR_ENABLE_IDENTITY_DOCUMENTS = 'false'
    Remove-Item Env:OPENAI_API_KEY -ErrorAction SilentlyContinue
    Remove-Item Env:OPENAI_MODEL -ErrorAction SilentlyContinue
    Set-Location -LiteralPath (Join-Path $airRoot 'web')
    if ($FreshCatalog) {
        if (Get-NetTCPConnection -LocalPort 3011 -State Listen -ErrorAction SilentlyContinue) {
            throw 'Stop the A.I.R preview on port 3011 before clearing its generated catalog cache.'
        }
        $airCache = Join-Path $airRoot 'web/.next/cache/fetch-cache'
        if (Test-Path -LiteralPath $airCache) {
            $airResolvedCache = (Resolve-Path -LiteralPath $airCache).Path
            $airExpectedCache = [IO.Path]::GetFullPath($airCache)
            $airNextRoot = [IO.Path]::GetFullPath((Join-Path $airRoot 'web/.next'))
            if ($airResolvedCache -ne $airExpectedCache -or
                -not $airResolvedCache.StartsWith($airNextRoot + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase)) {
                throw 'Unexpected catalog cache path; refusing to remove it.'
            }
            Remove-Item -LiteralPath $airResolvedCache -Recurse -Force
        }
    }
    if ($Build) {
        npm run build
        if ($LASTEXITCODE -ne 0) { throw 'Next.js build failed.' }
    }
    node node_modules/next/dist/bin/next start -p 3011
} finally {
    foreach ($airName in $airNames) {
        if ($null -eq $airPrevious[$airName]) { Remove-Item "Env:$airName" -ErrorAction SilentlyContinue }
        else { [Environment]::SetEnvironmentVariable($airName, $airPrevious[$airName], 'Process') }
    }
}
