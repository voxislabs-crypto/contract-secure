# File: Backup-ContractSecure.ps1
# Description: Creates a zip backup of F:\contractsecure excluding node_modules folders

# Source and destination
$Source = "F:\contractsecure"
$Date = Get-Date -Format "yyyy-MM-dd_HH-mm-ss"
$DestinationDir = "F:\Backups"
$ZipPath = Join-Path $DestinationDir "contractsecure_backup_$Date.zip"

# Make sure destination folder exists
if (!(Test-Path $DestinationDir)) {
    New-Item -ItemType Directory -Path $DestinationDir | Out-Null
}

# Create a temporary staging folder for filtered files
$TempDir = Join-Path $env:TEMP "contractsecure_temp_$Date"
if (Test-Path $TempDir) {
    Remove-Item $TempDir -Recurse -Force
}
New-Item -ItemType Directory -Path $TempDir | Out-Null

# Copy everything except node_modules into staging
robocopy $Source $TempDir /MIR /XD node_modules /R:2 /W:2

# Compress the staging folder into a zip
Compress-Archive -Path "$TempDir\*" -DestinationPath $ZipPath

# Clean up temp folder
Remove-Item $TempDir -Recurse -Force

Write-Host "Backup complete. Zip created at $ZipPath"
