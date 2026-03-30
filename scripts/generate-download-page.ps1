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
$updateFeedDirectory = Join-Path $projectRoot "out\update-feed"
$siteOutputDirectory = Join-Path $projectRoot "out\pages-site"

if (-not (Test-Path -LiteralPath $updateFeedDirectory)) {
    throw "Thư mục nguồn cấp cập nhật không tồn tại: $updateFeedDirectory"
}

[xml]$projectXml = Get-Content -LiteralPath $projectFilePath
$version = [string]($projectXml.Project.PropertyGroup.Version | Select-Object -First 1)

if ([string]::IsNullOrWhiteSpace($version)) {
    throw "Thiếu phiên bản trong $projectFilePath"
}

$releaseConfig = Get-Content -LiteralPath $releaseConfigPath -Raw | ConvertFrom-Json
$exe = Get-ChildItem -LiteralPath $updateFeedDirectory -Filter *.exe -File | Select-Object -First 1

if ($null -eq $exe) {
    throw "Không tìm thấy tệp .exe nào trong $updateFeedDirectory"
}

$feedPath = [string]$releaseConfig.site.updateFeedPath
$downloadPath = "./$($feedPath.Trim('/'))/$($exe.Name)"
$releaseNotesHtml = @($releaseConfig.release.notes | ForEach-Object { "              <li>$(Escape-Html $_)</li>" }) -join "`n"

$html = @"
<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Tải xuống Bộ công cụ Dropshipping</title>
    <style>
      :root {
        --bg: #f5f5f5;
        --panel: #ffffff;
        --text: #1f1f1f;
        --muted: #5c5c5c;
        --line: #d8d8d8;
        --accent: #0067c0;
        --accent-dark: #004e92;
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Segoe UI", Tahoma, sans-serif;
        color: var(--text);
        background: linear-gradient(180deg, #eef5fb 0%, var(--bg) 100%);
        display: grid;
        place-items: center;
        padding: 24px;
      }

      main {
        width: min(860px, 100%);
        background: var(--panel);
        border: 1px solid var(--line);
        border-radius: 18px;
        box-shadow: 0 24px 60px rgba(0, 0, 0, 0.08);
        overflow: hidden;
      }

      .hero {
        padding: 32px;
        border-bottom: 1px solid var(--line);
      }

      h1 {
        margin: 0 0 12px;
        font-size: clamp(32px, 5vw, 48px);
      }

      .lead {
        margin: 0;
        max-width: 680px;
        color: var(--muted);
        line-height: 1.6;
      }

      .cta {
        margin-top: 24px;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 50px;
        padding: 0 22px;
        border-radius: 12px;
        text-decoration: none;
        font-weight: 700;
        background: linear-gradient(180deg, var(--accent) 0%, var(--accent-dark) 100%);
        color: #ffffff;
      }

      .meta,
      .notes {
        padding: 24px 32px 32px;
      }

      .meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 16px;
      }

      .card {
        border: 1px solid var(--line);
        border-radius: 14px;
        padding: 16px;
        background: #fcfcfc;
      }

      .label {
        font-size: 12px;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .value {
        margin-top: 8px;
        font-size: 18px;
        font-weight: 700;
      }

      h2 {
        margin: 0 0 14px;
        font-size: 24px;
      }

      ul {
        margin: 0;
        padding-left: 20px;
        color: var(--muted);
        line-height: 1.7;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="hero">
        <h1>Bộ công cụ Dropshipping</h1>
        <p class="lead">Tải bản Windows .exe mới nhất.</p>
        <div class="cta">
          <a class="button" href="$(Escape-Html $downloadPath)">Tải tệp .exe</a>
        </div>
      </section>

      <section class="meta">
        <div class="meta-grid">
          <div class="card">
            <div class="label">Phiên bản</div>
            <div class="value">$(Escape-Html $version)</div>
          </div>
          <div class="card">
            <div class="label">Bản phát hành</div>
            <div class="value">$(Escape-Html ([string]$releaseConfig.release.name))</div>
          </div>
          <div class="card">
            <div class="label">Ngày phát hành</div>
            <div class="value">$(Escape-Html ([string]$releaseConfig.release.publishedAt))</div>
          </div>
        </div>
      </section>

      <section class="notes">
        <h2>Ghi chú phát hành</h2>
        <ul>
$releaseNotesHtml
        </ul>
      </section>
    </main>
  </body>
</html>
"@

if (Test-Path -LiteralPath $siteOutputDirectory) {
    Remove-Item -LiteralPath $siteOutputDirectory -Recurse -Force
}

New-Item -ItemType Directory -Path $siteOutputDirectory -Force | Out-Null
$html | Set-Content -LiteralPath (Join-Path $siteOutputDirectory "index.html") -Encoding utf8

Write-Output "Đã tạo trang tải xuống cho $($exe.Name)"
