# Put ELEVEN_LABS_API on Legion workers. Key from ~/.gruda/secrets.env (never git).
param(
    [string]$EnvFile = "$env:USERPROFILE\.gruda\secrets.env",
    [string[]]$Workers = @("grudge-ai-hub", "grudge-legion-ai")
)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot/..
$key = $null
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*ELEVEN_LABS_API=(.+)$') { $key = $Matches[1].Trim().Trim('"').Trim("'") }
}
if (-not $key) { throw "ELEVEN_LABS_API missing in $EnvFile" }
foreach ($name in $Workers) {
    Write-Host "Setting ELEVEN_LABS_API on $name (len=$($key.Length))..."
    $key | npx wrangler secret put ELEVEN_LABS_API --name $name
}
Write-Host "Light TTS: POST /v1/audio/tts (JWT, 4/min, 20/day, 280 chars). Secret not printed."
