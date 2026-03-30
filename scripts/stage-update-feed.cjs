const fs = require("node:fs");
const path = require("node:path");

const projectRoot = path.resolve(__dirname, "..");
const releaseConfig = require(path.join(projectRoot, "release.config.json"));
const buildOutputDir = path.join(projectRoot, "out", "make");
const stagingDir = path.join(projectRoot, "out", "update-feed");

function formatReleaseNotes(notes) {
  return notes.map((note) => `• ${note}`).join("\n");
}

function ensureDirectoryExists(targetDir) {
  fs.mkdirSync(targetDir, {
    recursive: true,
  });
}

function collectFiles(rootDir, matcher) {
  const results = [];
  const queue = [rootDir];

  while (queue.length > 0) {
    const currentDir = queue.shift();
    const entries = fs.readdirSync(currentDir, {
      withFileTypes: true,
    });

    for (const entry of entries) {
      const entryPath = path.join(currentDir, entry.name);

      if (entry.isDirectory()) {
        queue.push(entryPath);
        continue;
      }

      if (matcher(entry.name)) {
        results.push(entryPath);
      }
    }
  }

  return results;
}

function copyArtifacts(filePaths) {
  fs.rmSync(stagingDir, {
    recursive: true,
    force: true,
  });
  ensureDirectoryExists(stagingDir);

  for (const filePath of filePaths) {
    const destinationPath = path.join(stagingDir, path.basename(filePath));
    fs.copyFileSync(filePath, destinationPath);
  }

  const releaseMetadata = {
    version: String(releaseConfig.release.version).replace(/^v/i, "").trim(),
    releaseName: releaseConfig.release.name,
    releaseNotes: formatReleaseNotes(releaseConfig.release.notes),
    releaseDate: releaseConfig.release.publishedAt || null,
  };

  fs.writeFileSync(
    path.join(stagingDir, "release.json"),
    `${JSON.stringify(releaseMetadata, null, 2)}\n`,
    "utf8",
  );
}

function main() {
  if (!fs.existsSync(buildOutputDir)) {
    throw new Error(`Build output directory does not exist: ${buildOutputDir}`);
  }

  const requiredMatchers = [
    {
      label: "Windows installer",
      matcher: (name) => name.endsWith(".exe") && !name.endsWith(".exe.blockmap"),
    },
    {
      label: "Blockmap",
      matcher: (name) => name.endsWith(".exe.blockmap"),
    },
    {
      label: "latest.yml",
      matcher: (name) => name === "latest.yml",
    },
  ];

  const matchedFiles = requiredMatchers.flatMap(({ label, matcher }) => {
    const files = collectFiles(buildOutputDir, matcher);
    if (files.length === 0) {
      throw new Error(`Missing ${label} in ${buildOutputDir}`);
    }

    return files;
  });

  copyArtifacts(matchedFiles);

  process.stdout.write(
    `Staged update feed assets:\n${matchedFiles
      .map((filePath) => `- ${path.relative(projectRoot, filePath).replace(/\\/g, "/")}`)
      .join("\n")}\n`,
  );
}

main();
