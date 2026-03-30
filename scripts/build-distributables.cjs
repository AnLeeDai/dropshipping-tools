const path = require("node:path");
const fs = require("node:fs");
const { spawnSync } = require("node:child_process");
const packageJson = require("../package.json");

const isPublish = process.argv.includes("--publish");
const isWindows = process.platform === "win32";
const projectRoot = path.resolve(__dirname, "..");

function resolvePackageBin(packageName, binName) {
  const manifestPath = require.resolve(`${packageName}/package.json`, {
    paths: [projectRoot],
  });
  const manifest = require(manifestPath);
  const packageDir = path.dirname(manifestPath);
  const bin =
    typeof manifest.bin === "string"
      ? manifest.bin
      : manifest.bin[binName || Object.keys(manifest.bin)[0]];

  return path.join(packageDir, bin);
}

function runNodeScript(scriptPath, args) {
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: projectRoot,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function clearOutputDir(relativeDir) {
  const targetDir = path.resolve(projectRoot, relativeDir);
  const outputRoot = path.resolve(projectRoot, "out");

  if (targetDir !== outputRoot && !targetDir.startsWith(`${outputRoot}${path.sep}`)) {
    throw new Error(`Refusing to remove path outside the out directory: ${targetDir}`);
  }

  fs.rmSync(targetDir, {
    recursive: true,
    force: true,
  });
}

if (!isWindows) {
  runNodeScript(resolvePackageBin("@electron-forge/cli", "electron-forge"), [
    isPublish ? "publish" : "make",
  ]);
  process.exit(0);
}

const arch = "x64";
const prepackagedDir = path.join("out", `${packageJson.name}-win32-${arch}`);

clearOutputDir(path.join("out", "make"));

runNodeScript(resolvePackageBin("@electron-forge/cli", "electron-forge"), [
  "package",
  "--platform",
  "win32",
  "--arch",
  arch,
]);
runNodeScript(resolvePackageBin("electron-builder", "electron-builder"), [
  "--win",
  "nsis",
  "--x64",
  "--prepackaged",
  prepackagedDir,
  "--config",
  "electron-builder.config.cjs",
  "--publish",
  isPublish ? "always" : "never",
]);
