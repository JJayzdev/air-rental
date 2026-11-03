# Full local PostgreSQL database archive from this repository's Supabase DB only.
# The archive can contain customer/order/authentication data: keep it private and off Git.
param([string]$FileName = 'air-local-' + (Get-Date -Format 'yyyyMMdd-HHmmss') + '.dump')
$ErrorActionPreference = 'Stop'
$airRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $airRoot
if ([IO.Path]::GetFileName($FileName) -ne $FileName -or $FileName -notmatch '^air-local-[0-9]{8}-[0-9]{6}\.dump$') {
    throw 'Use a filename like air-local-20261102-153000.dump; paths and arbitrary names are refused.'
}
$airLabels = docker inspect supabase_db_air-rental --format '{{json .Config.Labels}}' | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $airLabels.'com.supabase.cli.project' -ne 'air-rental' -or
    [IO.Path]::GetFullPath($airLabels.'com.supabase.cli.workdir') -ne [IO.Path]::GetFullPath($airRoot)) {
    throw 'Only the dedicated A.I.R local stack may be backed up.'
}
$airOutputDirectory = Join-Path $airRoot '.local-backups'
if (-not (Test-Path -LiteralPath $airOutputDirectory)) {
    New-Item -ItemType Directory -Path $airOutputDirectory | Out-Null
}
$airResolvedOutputDirectory = (Resolve-Path -LiteralPath $airOutputDirectory).Path
if ($airResolvedOutputDirectory -ne [IO.Path]::GetFullPath($airOutputDirectory)) {
    throw 'Unexpected output directory; refusing to write the backup.'
}
$airOutputFile = Join-Path $airResolvedOutputDirectory $FileName
if (Test-Path -LiteralPath $airOutputFile) { throw 'Refusing to overwrite an existing backup.' }
$airRemoteFile = '/tmp/air-gd7-' + [guid]::NewGuid().ToString('N') + '.dump'
docker exec supabase_db_air-rental pg_dump -Fc -U postgres -d postgres -f $airRemoteFile
if ($LASTEXITCODE -ne 0) { throw 'The local database dump failed.' }
docker cp "supabase_db_air-rental:$airRemoteFile" $airOutputFile
if ($LASTEXITCODE -ne 0) {
    docker exec supabase_db_air-rental rm -f $airRemoteFile | Out-Null
    throw 'Could not copy the local database dump into the guarded backup directory.'
}
docker exec supabase_db_air-rental rm -f $airRemoteFile | Out-Null
if ($LASTEXITCODE -ne 0 -or (Get-Item -LiteralPath $airOutputFile).Length -lt 100) {
    Remove-Item -LiteralPath $airOutputFile -Force -ErrorAction SilentlyContinue
    throw 'The local database dump failed or is unexpectedly small.'
}
$airVerifyFile = '/tmp/air-gd7-verify-' + [guid]::NewGuid().ToString('N') + '.dump'
docker cp $airOutputFile "supabase_db_air-rental:$airVerifyFile" | Out-Null
if ($LASTEXITCODE -ne 0) { throw 'Could not stage the archive for integrity validation.' }
docker exec supabase_db_air-rental pg_restore --list $airVerifyFile *> $null
$airRestoreListExit = $LASTEXITCODE
docker exec supabase_db_air-rental rm -f $airVerifyFile | Out-Null
if ($airRestoreListExit -ne 0) { throw 'The resulting database archive did not pass pg_restore integrity listing.' }
Write-Output "Created private local database archive: $airOutputFile"
