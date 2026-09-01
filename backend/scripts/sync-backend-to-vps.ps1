# Sync backend API files from this PC to the VPS (backend only — no frontend).
# Prerequisite: SSH key access to the VPS (ssh user@145.223.23.47 must work).
#
# Usage:
#   .\sync-backend-to-vps.ps1
#   .\sync-backend-to-vps.ps1 -SshUser ubuntu -RemoteDir /var/www/casebox

param(
  [string]$SshHost = "145.223.23.47",
  [string]$SshUser = "root",
  [string]$RemoteDir = "/var/www/casebox"
)

$ErrorActionPreference = "Stop"
$BackendRoot = Split-Path $PSScriptRoot -Parent

$exclude = @(
  "node_modules",
  ".env",
  "uploads",
  ".git"
)

Write-Host "Syncing backend to ${SshUser}@${SshHost}:${RemoteDir} ..."

if (Get-Command rsync -ErrorAction SilentlyContinue) {
  $excludeArgs = $exclude | ForEach-Object { "--exclude=$_" }
  & rsync -avz --delete `
    @excludeArgs `
    "$BackendRoot/" `
    "${SshUser}@${SshHost}:${RemoteDir}/"
} else {
  Write-Host "rsync not found — using scp (slower, no delete)."
  $staging = Join-Path $env:TEMP "casebox-backend-deploy"
  if (Test-Path $staging) { Remove-Item $staging -Recurse -Force }
  New-Item -ItemType Directory -Path $staging | Out-Null
  robocopy $BackendRoot $staging /E /XD node_modules uploads .git /XF .env /NFL /NDL /NJH /NJS /nc /ns /np | Out-Null
  scp -r "$staging/*" "${SshUser}@${SshHost}:${RemoteDir}/"
  Remove-Item $staging -Recurse -Force
}

Write-Host "Running deploy on VPS..."
ssh "${SshUser}@${SshHost}" "bash ${RemoteDir}/scripts/deploy-vps.sh"

Write-Host "Done. API: https://145-223-23-47.sslip.io"
