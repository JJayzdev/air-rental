# Use -Build to compile with the same public local Supabase settings as the preview.
param([switch]$Build, [switch]$FreshCatalog)
$ErrorActionPreference = 'Stop'
$airRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $airRoot
$airLocal = npx --yes supabase status -o json | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $airLocal.API_URL -ne 'http://127.0.0.1:55321') {
    throw 'Start the A.I.R local Supabase project before running this preview.'
}
$env:NEXT_PUBLIC_APP_URL = 'http://localhost:3011'
$env:NEXT_PUBLIC_SUPABASE_URL = $airLocal.API_URL
$env:NEXT_PUBLIC_SUPABASE_ANON_KEY = $airLocal.ANON_KEY
# No service-role key is needed by the application.
Set-Location -LiteralPath (Join-Path $airRoot 'web')
if ($FreshCatalog) {
    if (Get-NetTCPConnection -LocalPort 3011 -State Listen -ErrorAction SilentlyContinue) {
        throw 'Stop the A.I.R preview on port 3011 before clearing its generated catalog cache.'
    }
    $airCache = Join-Path $airRoot 'web/.next/cache/fetch-cache'
    if (Test-Path -LiteralPath $airCache) {
        $airResolvedCache = (Resolve-Path -LiteralPath $airCache).Path
        $airExpectedCache = [IO.Path]::GetFullPath($airCache)
        if ($airResolvedCache -ne $airExpectedCache -or
            -not $airResolvedCache.StartsWith((Join-Path $airRoot 'web/.next'), [StringComparison]::OrdinalIgnoreCase)) {
            throw 'Unexpected cache path; refusing to remove it.'
        }
        Remove-Item -LiteralPath $airResolvedCache -Recurse -Force
    }
}
if ($Build) {
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'Next.js build failed.' }
}
node node_modules/next/dist/bin/next start -p 3011
