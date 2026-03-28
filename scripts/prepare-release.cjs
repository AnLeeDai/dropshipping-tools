const fs = require("node:fs");
const path = require("node:path");

const rootDir = process.cwd();
const releaseConfigPath = path.join(rootDir, "release.config.json");
const packageJsonPath = path.join(rootDir, "package.json");
const packageLockPath = path.join(rootDir, "package-lock.json");
const notesFilePath = path.join(rootDir, ".release-notes.md");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

function normalizeVersion(version) {
  return String(version ?? "").replace(/^v/i, "").trim();
}

function assertReleaseConfig(config) {
  const version = normalizeVersion(config?.release?.version);
  if (!version) {
    throw new Error("release.config.json is missing release.version");
  }

  if (!Array.isArray(config?.release?.notes) || config.release.notes.length === 0) {
    throw new Error("release.config.json must contain at least one release note");
  }

  return version;
}

function buildReleaseBody(config, version) {
  const releaseDate = config.release.publishedAt || new Date().toISOString().slice(0, 10);
  const notes = config.release.notes.map((note) => `- ${note}`).join("\n");

  return [
    `# ${config.release.name}`,
    "",
    `Phiên bản: \`${version}\``,
    `Ngày phát hành: ${releaseDate}`,
    "",
    "## Cập nhật",
    notes,
    "",
  ].join("\n");
}

function updatePackageManifest(packageJson, config, version) {
  packageJson.version = version;
  packageJson.description = "Desktop tools for dropshipping workflows";
  packageJson.repository = {
    type: "git",
    url: `https://github.com/${config.repository.owner}/${config.repository.name}.git`,
  };
  packageJson.homepage = `https://github.com/${config.repository.owner}/${config.repository.name}`;
}

function updateLockfile(packageLock, version) {
  packageLock.version = version;

  if (packageLock.packages && packageLock.packages[""]) {
    packageLock.packages[""].version = version;
  }
}

function writeGitHubOutput(outputs) {
  if (!process.env.GITHUB_OUTPUT) {
    return;
  }

  const lines = Object.entries(outputs).map(([key, value]) => `${key}=${value}`);
  fs.appendFileSync(process.env.GITHUB_OUTPUT, `${lines.join("\n")}\n`, "utf8");
}

function main() {
  const releaseConfig = readJson(releaseConfigPath);
  const packageJson = readJson(packageJsonPath);
  const packageLock = readJson(packageLockPath);
  const version = assertReleaseConfig(releaseConfig);
  const releaseName = `v${version} · ${releaseConfig.release.name}`;
  const releaseNotes = buildReleaseBody(releaseConfig, version);
  const relativeNotesFile = path.relative(rootDir, notesFilePath).replace(/\\/g, "/");

  updatePackageManifest(packageJson, releaseConfig, version);
  updateLockfile(packageLock, version);

  writeJson(packageJsonPath, packageJson);
  writeJson(packageLockPath, packageLock);
  fs.writeFileSync(notesFilePath, releaseNotes, "utf8");

  writeGitHubOutput({
    version,
    tag: `v${version}`,
    release_name: releaseName,
    notes_file: relativeNotesFile,
  });

  process.stdout.write(`Prepared release ${version}\n`);
}

main();
