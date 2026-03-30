const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const releaseConfig = require(path.join(projectRoot, "release.config.json"));
const updateFeedDir = path.join(projectRoot, "out", "update-feed");
const siteOutputDir = path.join(projectRoot, "out", "pages-site");

function findSetupExeName() {
  if (!fs.existsSync(updateFeedDir)) {
    throw new Error(`Update feed staging directory does not exist: ${updateFeedDir}`);
  }

  const candidates = fs
    .readdirSync(updateFeedDir, {
      withFileTypes: true,
    })
    .filter((entry) => entry.isFile())
    .map((entry) => entry.name)
    .filter((name) => name.endsWith(".exe") && !name.endsWith(".exe.blockmap"));

  if (candidates.length === 0) {
    throw new Error(`No setup.exe file found in ${updateFeedDir}`);
  }

  return candidates[0];
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function buildReleaseNotesHtml(notes) {
  return notes.map((note) => `<li>${escapeHtml(note)}</li>`).join("\n");
}

function buildDownloadPage({ downloadPath, version, releaseName, publishedAt, notes }) {
  const title = `${releaseName} | Tải Dropshipping Tools`;

  return `<!DOCTYPE html>
<html lang="vi">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>${escapeHtml(title)}</title>
    <style>
      :root {
        --bg: #f4efe6;
        --surface: rgba(255, 250, 242, 0.92);
        --surface-strong: #fffdf8;
        --text: #1f1a16;
        --muted: #6a5b52;
        --line: rgba(63, 46, 34, 0.12);
        --accent: #b44f2a;
        --accent-strong: #8f3b1c;
        --shadow: 0 28px 70px rgba(73, 48, 29, 0.16);
      }

      * {
        box-sizing: border-box;
      }

      body {
        margin: 0;
        min-height: 100vh;
        font-family: "Aptos", "Trebuchet MS", "Segoe UI", sans-serif;
        color: var(--text);
        background:
          radial-gradient(circle at top left, rgba(241, 175, 116, 0.48), transparent 32%),
          radial-gradient(circle at bottom right, rgba(214, 125, 86, 0.28), transparent 30%),
          linear-gradient(160deg, #f8f2ea 0%, #efe5d8 48%, #e9ddce 100%);
        display: grid;
        place-items: center;
        padding: 32px 20px;
      }

      .shell {
        width: min(920px, 100%);
      }

      .panel {
        background: var(--surface);
        border: 1px solid var(--line);
        border-radius: 28px;
        box-shadow: var(--shadow);
        overflow: hidden;
        backdrop-filter: blur(14px);
      }

      .hero {
        padding: 32px;
        background:
          linear-gradient(140deg, rgba(255, 255, 255, 0.86), rgba(255, 247, 237, 0.68)),
          linear-gradient(120deg, rgba(180, 79, 42, 0.12), rgba(143, 59, 28, 0));
      }

      .eyebrow {
        display: inline-flex;
        align-items: center;
        gap: 10px;
        padding: 8px 14px;
        border-radius: 999px;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        background: rgba(180, 79, 42, 0.1);
        color: var(--accent-strong);
      }

      h1 {
        margin: 18px 0 10px;
        font-size: clamp(36px, 6vw, 62px);
        line-height: 0.94;
        letter-spacing: -0.04em;
      }

      .lead {
        max-width: 640px;
        margin: 0;
        font-size: 18px;
        line-height: 1.6;
        color: var(--muted);
      }

      .cta-row {
        display: flex;
        flex-wrap: wrap;
        gap: 14px;
        margin-top: 28px;
      }

      .button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        min-height: 54px;
        padding: 0 22px;
        border-radius: 18px;
        border: 1px solid transparent;
        text-decoration: none;
        font-weight: 700;
        transition: transform 160ms ease, box-shadow 160ms ease, background 160ms ease;
      }

      .button:hover {
        transform: translateY(-1px);
      }

      .button-primary {
        background: linear-gradient(135deg, var(--accent), #c86c3c);
        color: #fffaf6;
        box-shadow: 0 16px 30px rgba(180, 79, 42, 0.24);
      }

      .button-secondary {
        border-color: var(--line);
        background: rgba(255, 255, 255, 0.68);
        color: var(--text);
      }

      .meta-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
        gap: 14px;
        padding: 0 32px 32px;
      }

      .meta-card {
        padding: 18px 18px 20px;
        border-radius: 20px;
        background: var(--surface-strong);
        border: 1px solid var(--line);
      }

      .meta-label {
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
      }

      .meta-value {
        margin-top: 10px;
        font-size: 18px;
        font-weight: 700;
      }

      .notes {
        padding: 0 32px 32px;
      }

      .notes-card {
        padding: 24px;
        border-radius: 24px;
        border: 1px solid var(--line);
        background: rgba(255, 253, 248, 0.82);
      }

      .notes h2 {
        margin: 0 0 14px;
        font-size: 22px;
      }

      .notes ul {
        margin: 0;
        padding-left: 20px;
        color: var(--muted);
        line-height: 1.7;
      }

      .notes li + li {
        margin-top: 10px;
      }

      .footnote {
        margin-top: 16px;
        font-size: 14px;
        color: var(--muted);
      }

      .footnote a {
        color: var(--accent-strong);
      }

      @media (max-width: 640px) {
        .hero,
        .meta-grid,
        .notes {
          padding-left: 20px;
          padding-right: 20px;
        }

        .hero {
          padding-top: 24px;
        }
      }
    </style>
  </head>
  <body>
    <main class="shell">
      <section class="panel">
        <div class="hero">
          <div class="eyebrow">Dropshipping Tools</div>
          <h1>Tải bản cài đặt mới nhất</h1>
          <p class="lead">
            Trang này chỉ dành cho người dùng cuối. Nhấn nút bên dưới để tải trực tiếp file cài đặt
            Windows mới nhất.
          </p>
          <div class="cta-row">
            <a class="button button-primary" href="${escapeHtml(downloadPath)}">Tải setup.exe</a>
          </div>
        </div>

        <div class="meta-grid">
          <div class="meta-card">
            <div class="meta-label">Phiên bản</div>
            <div class="meta-value">${escapeHtml(version)}</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">Bản phát hành</div>
            <div class="meta-value">${escapeHtml(releaseName)}</div>
          </div>
          <div class="meta-card">
            <div class="meta-label">Ngày phát hành</div>
            <div class="meta-value">${escapeHtml(publishedAt)}</div>
          </div>
        </div>

        <div class="notes">
          <div class="notes-card">
            <h2>Điểm mới</h2>
            <ul>
${buildReleaseNotesHtml(notes)}
            </ul>
            <p class="footnote">
              Sau khi cài, các bản cập nhật tiếp theo sẽ tự tải trong ứng dụng và chỉ cần khởi động lại để áp dụng.
            </p>
          </div>
        </div>
      </section>
    </main>
  </body>
</html>
`;
}

function main() {
  const version = String(releaseConfig.release.version).replace(/^v/i, "").trim();
  const exeName = findSetupExeName();
  const html = buildDownloadPage({
    downloadPath: `./updates/win/x64/${encodeURIComponent(exeName)}`,
    version,
    releaseName: releaseConfig.release.name,
    publishedAt: releaseConfig.release.publishedAt,
    notes: releaseConfig.release.notes,
  });

  fs.rmSync(siteOutputDir, {
    recursive: true,
    force: true,
  });
  fs.mkdirSync(siteOutputDir, {
    recursive: true,
  });
  fs.writeFileSync(path.join(siteOutputDir, "index.html"), html, "utf8");

  process.stdout.write(`Generated download page for ${exeName}\n`);
}

main();
