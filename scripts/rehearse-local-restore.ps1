# Rehearse a full local DB archive in a unique throwaway DB inside the verified repo container.
# Never changes the active postgres database. Temp DB is dropped only after its ownership marker matches.
param([Parameter(Mandatory = $true)][string]$BackupPath)
$ErrorActionPreference = 'Stop'
$airRoot = Split-Path -Parent $PSScriptRoot
Set-Location -LiteralPath $airRoot
$airLabels = docker inspect supabase_db_air-rental --format '{{json .Config.Labels}}' | ConvertFrom-Json
if ($LASTEXITCODE -ne 0 -or $airLabels.'com.supabase.cli.project' -ne 'air-rental' -or
    [IO.Path]::GetFullPath($airLabels.'com.supabase.cli.workdir') -ne [IO.Path]::GetFullPath($airRoot)) {
    throw 'Only the dedicated A.I.R local stack may be used.'
}
$airBackupDirectory = (Resolve-Path -LiteralPath (Join-Path $airRoot '.local-backups')).Path
$airResolvedBackup = (Resolve-Path -LiteralPath $BackupPath).Path
if (-not $airResolvedBackup.StartsWith($airBackupDirectory + [IO.Path]::DirectorySeparatorChar, [StringComparison]::OrdinalIgnoreCase) -or
    [IO.Path]::GetExtension($airResolvedBackup) -ne '.dump' -or
    [IO.Path]::GetFileName($airResolvedBackup) -notmatch '^air-local-[0-9]{8}-[0-9]{6}\.dump$') {
    throw 'Restore rehearsal accepts only a generated database archive inside .local-backups.'
}
$airToken = [guid]::NewGuid().ToString('N')
$airDatabase = 'air_gd7_restore_' + $airToken
$airMarker = 'air-gd7-restore:' + $airToken
$airRemoteArchive = '/tmp/' + $airDatabase + '.dump'
$airRestoreLog = Join-Path $airBackupDirectory ('air-restore-' + $airToken + '.log')
$airCreated = $false
try {
    docker cp $airResolvedBackup "supabase_db_air-rental:$airRemoteArchive" | Out-Null
    if ($LASTEXITCODE -ne 0) { throw 'Could not stage the archive for restore.' }
    docker exec supabase_db_air-rental pg_restore --list $airRemoteArchive *> $null
    if ($LASTEXITCODE -ne 0) { throw 'Archive integrity check failed.' }
    $airExisting = docker exec supabase_db_air-rental psql -U postgres -d postgres -XAtq -c "select count(*) from pg_database where datname='$airDatabase'"
    if ($LASTEXITCODE -ne 0 -or $airExisting.Trim() -ne '0') { throw 'Unique restore database name already exists; refusing to reuse it.' }
    docker exec supabase_db_air-rental createdb -U supabase_admin -T template0 $airDatabase
    if ($LASTEXITCODE -ne 0) { throw 'Could not create isolated restore database.' }
    $airCreated = $true
    docker exec supabase_db_air-rental psql -U supabase_admin -d postgres -XAtq -c "comment on database $airDatabase is '$airMarker'"
    if ($LASTEXITCODE -ne 0) { throw 'Could not mark the isolated restore database.' }
    # The local supabase_admin role is the cluster superuser and already has the required role memberships.
    # Restore as it so ownership, ACL, and default-privilege entries are replayed intact.
    docker exec supabase_db_air-rental pg_restore -U supabase_admin -d $airDatabase --exit-on-error $airRemoteArchive *> $airRestoreLog
    $airRestoreExit = $LASTEXITCODE
    if ($airRestoreExit -ne 0) {
        throw "Restore into the isolated database failed. Private diagnostics retained at $airRestoreLog; they were not printed because PostgreSQL errors can include data."
    }
    Remove-Item -LiteralPath $airRestoreLog -Force -ErrorAction SilentlyContinue

    $airSourcePolicyCount = docker exec supabase_db_air-rental psql -U postgres -d postgres -XAtq -c "select count(*) from pg_policies where schemaname in ('public','auth','storage')"
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect source RLS policies.' }
    $airRestoredPolicyCount = docker exec supabase_db_air-rental psql -U postgres -d $airDatabase -XAtq -c "select count(*) from pg_policies where schemaname in ('public','auth','storage')"
    if ($LASTEXITCODE -ne 0 -or $airSourcePolicyCount.Trim() -ne $airRestoredPolicyCount.Trim()) { throw 'Restored RLS policy count did not match.' }
    $airSourceAclCount = docker exec supabase_db_air-rental psql -U postgres -d postgres -XAtq -c "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth','storage') and c.relacl is not null"
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect source ACLs.' }
    $airRestoredAclCount = docker exec supabase_db_air-rental psql -U postgres -d $airDatabase -XAtq -c "select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname in ('public','auth','storage') and c.relacl is not null"
    if ($LASTEXITCODE -ne 0 -or $airSourceAclCount.Trim() -ne $airRestoredAclCount.Trim()) { throw 'Restored ACL count did not match.' }
    $airSourceCounts = docker exec supabase_db_air-rental psql -U postgres -d postgres -XAtq -c "select (select count(*) from public.orders)||':'||(select count(*) from public.payments)||':'||(select count(*) from auth.users)||':'||(select count(*) from storage.objects)"
    if ($LASTEXITCODE -ne 0) { throw 'Could not inspect source representative row counts.' }
    $airRestoredCounts = docker exec supabase_db_air-rental psql -U postgres -d $airDatabase -XAtq -c "select (select count(*) from public.orders)||':'||(select count(*) from public.payments)||':'||(select count(*) from auth.users)||':'||(select count(*) from storage.objects)"
    if ($LASTEXITCODE -ne 0 -or $airSourceCounts.Trim() -ne $airRestoredCounts.Trim()) { throw 'Restored representative row counts did not match.' }
    $airOwnerGrant = docker exec supabase_db_air-rental psql -U postgres -d $airDatabase -XAtq -c "select has_table_privilege('authenticated','public.orders','SELECT')"
    if ($LASTEXITCODE -ne 0 -or $airOwnerGrant.Trim() -ne 't') { throw 'Restored authenticated order read grant did not pass verification.' }
    $airPaymentGrant = docker exec supabase_db_air-rental psql -U postgres -d $airDatabase -XAtq -c "select has_table_privilege('authenticated','public.payments','SELECT')"
    if ($LASTEXITCODE -ne 0 -or $airPaymentGrant.Trim() -ne 't') {
        throw 'Restored authenticated read grants did not pass verification.'
    }
    Write-Output 'PASS isolated restore: RLS/ACL counts, representative row counts, and authenticated read grants match.'
    Write-Output 'Storage object metadata was restored; object bytes live outside PostgreSQL and were not included.'
} finally {
    if ($airCreated) {
        $airDatabaseMarker = docker exec supabase_db_air-rental psql -U postgres -d postgres -XAtq -c "select shobj_description(oid,'pg_database') from pg_database where datname='$airDatabase'"
        if ($LASTEXITCODE -ne 0 -or $airDatabase -notmatch '^air_gd7_restore_[0-9a-f]{32}$' -or $airDatabaseMarker.Trim() -ne $airMarker) {
            throw 'Temporary database ownership marker did not match; it was left untouched for manual review.'
        }
        docker exec supabase_db_air-rental dropdb -U supabase_admin --if-exists $airDatabase
        if ($LASTEXITCODE -ne 0) { throw 'Could not remove the verified throwaway restore database.' }
    }
    docker exec supabase_db_air-rental rm -f $airRemoteArchive | Out-Null
}
