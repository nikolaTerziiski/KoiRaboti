param(
  [Parameter(Mandatory = $true)]
  [ValidateSet("dump", "restore", "clone")]
  [string]$Mode,

  [string]$SourceDbUrl,
  [string]$TargetDbUrl,
  [string]$BackupFile,
  [string]$OutputDir = ".\backups",
  [switch]$IncludeProfiles
)

$ErrorActionPreference = "Stop"

function Get-ToolPath {
  param(
    [Parameter(Mandatory = $true)]
    [string]$CommandName
  )

  $command = Get-Command $CommandName -ErrorAction SilentlyContinue
  if (-not $command) {
    throw "Required tool '$CommandName' was not found in PATH. Install PostgreSQL client tools first."
  }

  return $command.Source
}

function Resolve-BackupFilePath {
  if ($BackupFile) {
    if (Test-Path $BackupFile) {
      return (Resolve-Path -LiteralPath $BackupFile).Path
    }

    return Join-Path (Get-Location) $BackupFile
  }

  $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
  if (-not (Test-Path $OutputDir)) {
    New-Item -ItemType Directory -Path $OutputDir | Out-Null
  }

  return Join-Path $OutputDir "koi-raboti-public-$timestamp.sql"
}

$pgDump = Get-ToolPath -CommandName "pg_dump"
$psql = Get-ToolPath -CommandName "psql"

switch ($Mode) {
  "dump" {
    if (-not $SourceDbUrl) {
      throw "SourceDbUrl is required for dump mode."
    }

    $resolvedBackupFile = Resolve-BackupFilePath
    $dumpArgs = @(
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-privileges",
      "--encoding=UTF8",
      "--schema=public",
      "--file=$resolvedBackupFile",
      $SourceDbUrl
    )

    if (-not $IncludeProfiles) {
      $dumpArgs = @("--exclude-table=public.profiles") + $dumpArgs
    }

    Write-Host "Writing backup to $resolvedBackupFile"
    & $pgDump @dumpArgs
    if ($LASTEXITCODE -ne 0) {
      throw "pg_dump failed."
    }

    if (-not $IncludeProfiles) {
      Write-Host "Backup completed without public.profiles."
      Write-Host "After restoring into a fresh Supabase project, attach a new auth user to a restaurant with public.attach_user_to_restaurant(...)."
    } else {
      Write-Host "Backup completed with public.profiles included."
      Write-Host "Restoring this into another Supabase project requires matching auth.users rows."
    }
  }

  "restore" {
    if (-not $TargetDbUrl) {
      throw "TargetDbUrl is required for restore mode."
    }

    if (-not $BackupFile) {
      throw "BackupFile is required for restore mode."
    }

    $resolvedBackupFile = Resolve-BackupFilePath
    if (-not (Test-Path $resolvedBackupFile)) {
      throw "Backup file not found: $resolvedBackupFile"
    }

    Write-Host "Restoring $resolvedBackupFile into target database"
    & $psql "-v" "ON_ERROR_STOP=1" "--dbname=$TargetDbUrl" "--file=$resolvedBackupFile"
    if ($LASTEXITCODE -ne 0) {
      throw "psql restore failed."
    }

    Write-Host "Restore completed."
  }

  "clone" {
    if (-not $SourceDbUrl) {
      throw "SourceDbUrl is required for clone mode."
    }

    if (-not $TargetDbUrl) {
      throw "TargetDbUrl is required for clone mode."
    }

    $resolvedBackupFile = Resolve-BackupFilePath
    $dumpArgs = @(
      "--clean",
      "--if-exists",
      "--no-owner",
      "--no-privileges",
      "--encoding=UTF8",
      "--schema=public",
      "--file=$resolvedBackupFile",
      $SourceDbUrl
    )

    if (-not $IncludeProfiles) {
      $dumpArgs = @("--exclude-table=public.profiles") + $dumpArgs
    }

    Write-Host "Dumping source database to $resolvedBackupFile"
    & $pgDump @dumpArgs
    if ($LASTEXITCODE -ne 0) {
      throw "pg_dump failed during clone."
    }

    Write-Host "Restoring backup into target database"
    & $psql "-v" "ON_ERROR_STOP=1" "--dbname=$TargetDbUrl" "--file=$resolvedBackupFile"
    if ($LASTEXITCODE -ne 0) {
      throw "psql failed during clone restore."
    }

    Write-Host "Clone completed."
    if (-not $IncludeProfiles) {
      Write-Host "public.profiles was skipped intentionally. Attach a target auth user to one of the restored restaurants before signing in."
    }
  }
}
