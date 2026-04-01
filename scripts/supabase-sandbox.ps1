param(
  [Parameter(Mandatory = $true)]
  [string]$DbUrl,

  [string]$UserId,
  [string]$UserEmail,
  [string]$RestaurantName = "Koi Raboti Sandbox",
  [string]$AdminName = "Sandbox Owner",
  [int]$Months = 6,
  [int]$EmployeeCount = 18,
  [switch]$ResetDatabase,
  [switch]$ReplaceExistingData
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

function Invoke-PsqlFile {
  param(
    [Parameter(Mandatory = $true)]
    [string]$PsqlPath,

    [Parameter(Mandatory = $true)]
    [string]$FilePath
  )

  Write-Host "Applying $FilePath"
  & $PsqlPath "-v" "ON_ERROR_STOP=1" "--dbname=$DbUrl" "--file=$FilePath"
  if ($LASTEXITCODE -ne 0) {
    throw "psql failed while applying $FilePath."
  }
}

function Escape-SqlLiteral {
  param(
    [AllowNull()]
    [string]$Value
  )

  if ($null -eq $Value -or $Value.Trim().Length -eq 0) {
    return "null"
  }

  return "'" + ($Value -replace "'", "''") + "'"
}

$repoRoot = Split-Path -Parent $PSScriptRoot
$psql = Get-ToolPath -CommandName "psql"

$sqlFiles = @()

if ($ResetDatabase) {
  $sqlFiles += (Join-Path $repoRoot "supabase\reset_all.sql")
}

$sqlFiles += @(
  (Join-Path $repoRoot "supabase\schema_current.sql"),
  (Join-Path $repoRoot "supabase\seed_large.sql")
)

foreach ($file in $sqlFiles) {
  if (-not (Test-Path $file)) {
    throw "Missing SQL file: $file"
  }

  Invoke-PsqlFile -PsqlPath $psql -FilePath $file
}

if ($UserId -and $UserEmail) {
  $seedSql = @"
select public.seed_koi_raboti_sandbox(
  p_user_id := '$UserId'::uuid,
  p_user_email := $(Escape-SqlLiteral $UserEmail),
  p_restaurant_name := $(Escape-SqlLiteral $RestaurantName),
  p_admin_full_name := $(Escape-SqlLiteral $AdminName),
  p_months := $Months,
  p_employee_count := $EmployeeCount,
  p_replace_existing_data := $([bool]$ReplaceExistingData).ToString().ToLowerInvariant()
);
"@

  Write-Host "Seeding sandbox data for auth user $UserId"
  & $psql "-v" "ON_ERROR_STOP=1" "--dbname=$DbUrl" "--command=$seedSql"
  if ($LASTEXITCODE -ne 0) {
    throw "psql failed while seeding sandbox data."
  }

  Write-Host "Sandbox seed completed."
  exit 0
}

Write-Host "Schema and helper functions are ready."
Write-Host "Create or pick a Supabase auth user, then run:"
Write-Host "  select public.seed_koi_raboti_sandbox("
Write-Host "    p_user_id := 'YOUR_AUTH_USER_UUID',"
Write-Host "    p_user_email := 'owner@example.com',"
Write-Host "    p_restaurant_name := 'Koi Raboti Sandbox',"
Write-Host "    p_admin_full_name := 'Sandbox Owner',"
Write-Host "    p_months := 6,"
Write-Host "    p_employee_count := 18,"
Write-Host "    p_replace_existing_data := false"
Write-Host "  );"
