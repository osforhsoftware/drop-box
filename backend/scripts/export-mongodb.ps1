# Export local MongoDB database for VPS migration.
# Requires MongoDB Database Tools in tools/mongodb-database-tools (see setup-mongodb-tools.ps1).

$ErrorActionPreference = "Stop"

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$envFile = Join-Path $repoRoot "backend\.env"
$toolsBin = Join-Path $repoRoot "tools\mongodb-database-tools\mongodb-database-tools-windows-x86_64-100.17.0\bin"
$mongodump = Join-Path $toolsBin "mongodump.exe"

if (-not (Test-Path $mongodump)) {
    Write-Error "mongodump not found. Run: powershell -File backend\scripts\setup-mongodb-tools.ps1"
}

if (-not (Test-Path $envFile)) {
    Write-Error "Missing backend\.env"
}

$mongoUrl = $null
$dbName = $null
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^\s*MONGO_URL=(.+)$') { $mongoUrl = $matches[1].Trim() }
    if ($_ -match '^\s*DB_NAME=(.+)$') { $dbName = $matches[1].Trim() }
}

if (-not $mongoUrl -or -not $dbName) {
    Write-Error "backend\.env must define MONGO_URL and DB_NAME"
}

$timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
$outDir = Join-Path $repoRoot "backups\mongodb-$timestamp"

New-Item -ItemType Directory -Force -Path $outDir | Out-Null

Write-Host "Exporting database '$dbName' from $mongoUrl"
Write-Host "Output: $outDir"

& $mongodump --uri="$mongoUrl" --db=$dbName --out=$outDir

Write-Host ""
Write-Host "Done. Copy this folder to your VPS, then run restore-mongodb.ps1 there (or mongorestore)."
Write-Host "Also copy backend\uploads\ for images."
