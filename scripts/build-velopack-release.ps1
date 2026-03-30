param(
    [string]$Configuration = "Release",
    [string]$Runtime = "win-x64",
    [string]$Framework = "net8.0-windows"
)

$ErrorActionPreference = "Stop"

function Get-ProjectProperty {
    param(
        [xml]$ProjectXml,
        [string]$Name
    )

    return [string]($ProjectXml.Project.PropertyGroup.$Name | Select-Object -First 1)
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$projectFilePath = Join-Path $projectRoot "DropshippingTools.Native\DropshippingTools.Native.csproj"
$releaseConfigPath = Join-Path $projectRoot "release.config.json"
$publishDirectory = Join-Path $projectRoot "out\publish\$Runtime"
$releaseDirectory = Join-Path $projectRoot "out\velopack\$Runtime"
$releaseNotesPath = Join-Path $projectRoot "out\release-notes.md"
$toolDirectory = Join-Path $projectRoot ".tools\vpk"
$toolPath = Join-Path $toolDirectory "vpk.exe"

[xml]$projectXml = Get-Content -LiteralPath $projectFilePath
$version = Get-ProjectProperty $projectXml "Version"
$packId = Get-ProjectProperty $projectXml "VelopackPackId"
$channel = Get-ProjectProperty $projectXml "VelopackChannel"
$veloVersion = Get-ProjectProperty $projectXml "VelopackVersion"
$authors = Get-ProjectProperty $projectXml "Authors"
$title = Get-ProjectProperty $projectXml "Product"
$assemblyName = Get-ProjectProperty $projectXml "AssemblyName"

if ([string]::IsNullOrWhiteSpace($version) -or
    [string]::IsNullOrWhiteSpace($packId) -or
    [string]::IsNullOrWhiteSpace($channel) -or
    [string]::IsNullOrWhiteSpace($veloVersion) -or
    [string]::IsNullOrWhiteSpace($assemblyName)) {
    throw "Missing Velopack or assembly metadata in $projectFilePath"
}

$mainExe = "$assemblyName.exe"

$releaseConfig = Get-Content -LiteralPath $releaseConfigPath -Raw | ConvertFrom-Json
$notes = @($releaseConfig.release.notes)
$markdownLines = @("# $($releaseConfig.release.name)", "")
if ($notes.Count -gt 0) {
    $markdownLines += $notes | ForEach-Object { "- $_" }
}

if (Test-Path -LiteralPath $publishDirectory) {
    Remove-Item -LiteralPath $publishDirectory -Recurse -Force
}

if (Test-Path -LiteralPath $releaseDirectory) {
    Remove-Item -LiteralPath $releaseDirectory -Recurse -Force
}

New-Item -ItemType Directory -Path $publishDirectory -Force | Out-Null
New-Item -ItemType Directory -Path $releaseDirectory -Force | Out-Null
New-Item -ItemType Directory -Path (Split-Path -Parent $releaseNotesPath) -Force | Out-Null

($markdownLines -join [Environment]::NewLine) | Set-Content -LiteralPath $releaseNotesPath -Encoding utf8

if (-not (Test-Path -LiteralPath $toolPath)) {
    New-Item -ItemType Directory -Path $toolDirectory -Force | Out-Null
    dotnet tool install --tool-path $toolDirectory vpk --version $veloVersion
}

dotnet publish $projectFilePath `
    --configuration $Configuration `
    --framework $Framework `
    --runtime $Runtime `
    --self-contained true `
    -p:PublishSingleFile=false `
    -p:PublishReadyToRun=true `
    --output $publishDirectory

& $toolPath pack `
    --packId $packId `
    --packVersion $version `
    --packDir $publishDirectory `
    --mainExe $mainExe `
    --runtime $Runtime `
    --channel $channel `
    --outputDir $releaseDirectory `
    --packAuthors $authors `
    --packTitle $title `
    --releaseNotes $releaseNotesPath

if ($LASTEXITCODE -ne 0) {
    throw "vpk pack failed with exit code $LASTEXITCODE"
}

Write-Output "Velopack release created in $releaseDirectory"
