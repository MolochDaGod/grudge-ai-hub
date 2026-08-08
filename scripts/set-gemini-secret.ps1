# Sync GEMINI_API_KEY from canonical Grudge .env to AI hub Workers.
# Canonical public surface: https://ai.grudge-studio.com
param(
    [string]$EnvFile = "C:\Users\nugye\Documents\1111111\GrudgeBuilder\.env",
    # Primary domain worker + API path worker (both run the same index.js)
    [string[]]$Workers = @("grudge-ai-hub", "grudge-legion-ai")
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
        $v = $_.Substring($i + 1).Trim().Trim('"')
        $map[$k] = $v
    }
    return $map
}

$src = Read-DotEnv $EnvFile
$key = $src["GEMINI_API_KEY"]
if (-not $key -or $key -match 'not_yet_configured|placeholder|changeme') {
    Write-Host "GEMINI_API_KEY is not set in $EnvFile"
    Write-Host "Get a key at https://aistudio.google.com/apikey then add:"
    Write-Host "  GEMINI_API_KEY=AIza..."
    exit 1
}

foreach ($name in $Workers) {
    Write-Host "Setting GEMINI_API_KEY on $name..."
    $key | npx wrangler secret put GEMINI_API_KEY --name $name
}
Write-Host "Done. Canonical UI+API: https://ai.grudge-studio.com"
Write-Host "Redeploy: npm run deploy"
