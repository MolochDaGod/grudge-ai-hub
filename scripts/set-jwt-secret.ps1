# Sync JWT_SECRET from canonical Grudge .env to BOTH AI hub Workers.
# Required so Bearer Grudge ID JWT works on /v1/* (served by grudge-legion-ai).
param(
    [string]$EnvFile = "F:\GitHub\GrudgeBuilder\.env",
    [string[]]$Workers = @("grudge-legion-ai", "grudge-ai-hub")
)

$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot/..

function Read-DotEnv([string]$Path) {
    $map = @{}
    if (-not (Test-Path $Path)) { throw "Env file not found: $Path" }
    Get-Content $Path | ForEach-Object {
        if ($_ -match '^\s*#' -or $_ -notmatch '=') { return }
        $i = $_.IndexOf('=')
        $k = $_.Substring(0, $i).Trim()
        $v = $_.Substring($i + 1).Trim().Trim('"').Trim("'")
        $map[$k] = $v
    }
    return $map
}

$src = Read-DotEnv $EnvFile
$jwt = $src["JWT_SECRET"]
if (-not $jwt -or $jwt.Length -lt 8) {
    Write-Host "JWT_SECRET is missing or too short in $EnvFile"
    exit 1
}

foreach ($name in $Workers) {
    Write-Host "Setting JWT_SECRET on $name (len=$($jwt.Length))..."
    $jwt | npx wrangler secret put JWT_SECRET --name $name
}
Write-Host "Done. JWT auth works on https://ai.grudge-studio.com/v1/*"
Write-Host "Health: GET /health should show providers.grudge_jwt = configured"
