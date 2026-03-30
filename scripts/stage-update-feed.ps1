$ErrorActionPreference = "Stop"

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$publishDirectory = Join-Path $projectRoot "out\publish\win-x64"
$stagingDirectory = Join-Path $projectRoot "out\update-feed"
$releaseConfigPath = Join-Path $projectRoot "release.config.json"
$projectFilePath = Join-Path $projectRoot "DropshippingTools.Native\DropshippingTools.Native.csproj"

if (-not (Test-Path -LiteralPath $publishDirectory)) {
    throw "Publish directory does not exist: $publishDirectory"
}

[xml]$projectXml = Get-Content -LiteralPath $projectFilePath
$version = [string]($projectXml.Project.PropertyGroup.Version | Select-Object -First 1)

if ([string]::IsNullOrWhiteSpace($version)) {
    throw "Version is missing in $projectFilePath"
}

$releaseConfig = Get-Content -LiteralPath $releaseConfigPath -Raw | ConvertFrom-Json
$exe = Get-ChildItem -LiteralPath $publishDirectory -Filter *.exe -File | Select-Object -First 1

if ($null -eq $exe) {
    throw "No .exe file was found in $publishDirectory"
}

if (Test-Path -LiteralPath $stagingDirectory) {
    Remove-Item -LiteralPath $stagingDirectory -Recurse -Force
}

New-Item -ItemType Directory -Path $stagingDirectory -Force | Out-Null
Copy-Item -LiteralPath $exe.FullName -Destination (Join-Path $stagingDirectory $exe.Name) -Force

$releaseNotes = @($releaseConfig.release.notes | ForEach-Object { "* $_" }) -join "`n"
$releaseMetadata = [ordered]@{
    version = $version
    releaseName = [string]$releaseConfig.release.name
    releaseNotes = $releaseNotes
    releaseDate = [string]$releaseConfig.release.publishedAt
    downloadUrl = "./$($exe.Name)"
}

$releaseMetadata | ConvertTo-Json -Depth 5 | Set-Content -LiteralPath (Join-Path $stagingDirectory "release.json") -Encoding utf8

Write-Output "Staged update feed:"
Write-Output "- $($exe.Name)"
Write-Output "- release.json"
