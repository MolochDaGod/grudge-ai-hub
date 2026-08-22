# Put COHERE_API_KEY on Legion workers. Base URL is wrangler [vars] (not secret).
# Key source: ~/.gruda/gruda.env (never git).
param(
    [string]$EnvFile = "$env:USERPROFILE\.gruda\gruda.env",
    [string[]]$Workers = @("grudge-ai-hub", "grudge-legion-ai")
)
$ErrorActionPreference = "Stop"
Set-Location $PSScriptRoot/..
$key = $null
Get-Content $EnvFile | ForEach-Object {
    if ($_ -match '^\s*COHERE_API_KEY=(.+)$') { $key = $Matches[1].Trim().Trim('"') }
}
if (-not $key) { throw "COHERE_API_KEY missing in $EnvFile" }
foreach ($name in $Workers) {
    Write-Host "Setting COHERE_API_KEY on $name..."
    $key | npx wrangler secret put COHERE_API_KEY --name $name
}
Write-Host "Dedicated: https://api.grudge-s010rs.cloud.cohere.com  id=grudge-s010rs"
Write-Host "Redeploy: npm run deploy"
