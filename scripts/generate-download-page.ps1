$ErrorActionPreference = "Stop"

function Escape-Html {
    param([string]$Value)

    if ($null -eq $Value) {
        return ""
    }

    return $Value.Replace("&", "&amp;").Replace("<", "&lt;").Replace(">", "&gt;").Replace('"', "&quot;").Replace("'", "&#39;")
}

$projectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$releaseConfigPath = Join-Path $projectRoot "release.config.json"
$projectFilePath = Join-Path $projectRoot "DropshippingTools.Native\DropshippingTools.Native.csproj"
$releaseDirectory = Join-Path $projectRoot "out\velopack\win-x64"
$siteOutputDirectory = Join-Path $projectRoot "out\pages-site"

if (-not (Test-Path -LiteralPath $releaseDirectory)) {
    throw "Velopack release directory not found: $releaseDirectory"
}

[xml]$projectXml = Get-Content -LiteralPath $projectFilePath
$version = [string]($projectXml.Project.PropertyGroup.Version | Select-Object -First 1)

if ([string]::IsNullOrWhiteSpace($version)) {
    throw "Missing version in $projectFilePath"
}

$releaseConfig = Get-Content -LiteralPath $releaseConfigPath -Raw | ConvertFrom-Json
$feedPath = [string]$releaseConfig.site.updateFeedPath

if ([string]::IsNullOrWhiteSpace($feedPath)) {
    throw "Missing site.updateFeedPath in $releaseConfigPath"
}

$setupFile = Get-ChildItem -LiteralPath $releaseDirectory -Filter *Setup.exe -File | Sort-Object LastWriteTimeUtc -Descending | Select-Object -First 1
if ($null -eq $setupFile) {
    throw "No setup executable was found in $releaseDirectory"
}

$downloadPath = "./$($feedPath.Trim('/'))/$($setupFile.Name)"
$escapedDownloadPath = Escape-Html $downloadPath
$escapedVersion = Escape-Html $version

$lines = @(
    '<!DOCTYPE html>',
    '<html lang="vi">',
    '  <head>',
    '    <meta charset="UTF-8" />',
    '    <meta name="viewport" content="width=device-width, initial-scale=1.0" />',
    '    <title>Download Dropshipping Tools</title>',
    '    <style>',
    '      :root {',
    '        --bg: #eef2f6;',
    '        --panel: #ffffff;',
    '        --line: #d7dde5;',
    '        --text: #1f2933;',
    '        --muted: #5b6875;',
    '        --accent: #0f62fe;',
    '      }',
    '      * { box-sizing: border-box; }',
    '      body {',
    '        margin: 0;',
    '        min-height: 100vh;',
    '        display: grid;',
    '        place-items: center;',
    '        padding: 24px;',
    '        font-family: "Segoe UI", Tahoma, sans-serif;',
    '        background: var(--bg);',
    '        color: var(--text);',
    '      }',
    '      main {',
    '        width: min(480px, 100%);',
    '        padding: 32px;',
    '        background: var(--panel);',
    '        border: 1px solid var(--line);',
    '        border-radius: 18px;',
    '        box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);',
    '        text-align: center;',
    '      }',
    '      h1 {',
    '        margin: 0 0 10px;',
    '        font-size: 32px;',
    '      }',
    '      p {',
    '        margin: 0 0 20px;',
    '        color: var(--muted);',
    '        line-height: 1.6;',
    '      }',
    '      .button {',
    '        display: inline-flex;',
    '        align-items: center;',
    '        justify-content: center;',
    '        min-height: 48px;',
    '        padding: 0 22px;',
    '        border-radius: 12px;',
    '        background: var(--accent);',
    '        color: #ffffff;',
    '        text-decoration: none;',
    '        font-weight: 700;',
    '      }',
    '      .meta {',
    '        margin-top: 14px;',
    '        font-size: 14px;',
    '        color: var(--muted);',
    '      }',
    '    </style>',
    '  </head>',
    '  <body>',
    '    <main>',
    '      <h1>Dropshipping Tools</h1>',
    '      <p>Install once with setup. Future updates happen inside the app.</p>',
    "      <a class=`"button`" href=`"$escapedDownloadPath`">Download setup</a>",
    "      <div class=`"meta`">Version $escapedVersion</div>",
    '    </main>',
    '  </body>',
    '</html>'
)

$html = $lines -join [Environment]::NewLine

if (Test-Path -LiteralPath $siteOutputDirectory) {
    Remove-Item -LiteralPath $siteOutputDirectory -Recurse -Force
}

New-Item -ItemType Directory -Path $siteOutputDirectory -Force | Out-Null
$html | Set-Content -LiteralPath (Join-Path $siteOutputDirectory "index.html") -Encoding utf8

Write-Output "Download page created for $($setupFile.Name)"
