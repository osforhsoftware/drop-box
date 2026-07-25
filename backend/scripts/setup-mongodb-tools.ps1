# Download MongoDB Database Tools (mongodump, mongorestore, etc.) into tools/mongodb-database-tools
# Source: https://www.mongodb.com/try/download/database-tools

$ErrorActionPreference = "Stop"

$version = "100.17.0"
$repoRoot = Resolve-Path (Join-Path $PSScriptRoot "..\..")
$destDir = Join-Path $repoRoot "tools\mongodb-database-tools"
$zipPath = Join-Path $env:TEMP "mongodb-database-tools-windows-x86_64-$version.zip"
$url = "https://fastdl.mongodb.org/tools/db/mongodb-database-tools-windows-x86_64-$version.zip"
$binDir = Join-Path $destDir "mongodb-database-tools-windows-x86_64-$version\bin"
$mongodump = Join-Path $binDir "mongodump.exe"

if (Test-Path $mongodump) {
    & $mongodump --version
    Write-Host "MongoDB Database Tools already installed at: $binDir"
    exit 0
}

New-Item -ItemType Directory -Force -Path $destDir | Out-Null

Write-Host "Downloading MongoDB Database Tools $version ..."
Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing

Write-Host "Extracting to $destDir ..."
Expand-Archive -Path $zipPath -DestinationPath $destDir -Force
Remove-Item $zipPath -Force

& $mongodump --version
Write-Host ""
Write-Host "Installed. Export your DB with:"
Write-Host "  powershell -File backend\scripts\export-mongodb.ps1"
