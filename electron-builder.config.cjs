const releaseConfig = require("./release.config.json");

function createAppId(owner, name) {
  const normalizedOwner = owner.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  const normalizedName = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return `com.${normalizedOwner}.${normalizedName}`;
}

function createDefaultFeedUrl(owner, name) {
  return `https://${owner.toLowerCase()}.github.io/${name}/updates/win/x64`;
}

const updateFeedUrl =
  releaseConfig.autoUpdate?.feedUrl ||
  createDefaultFeedUrl(releaseConfig.repository.owner, releaseConfig.repository.name);

module.exports = {
  appId: createAppId(releaseConfig.repository.owner, releaseConfig.repository.name),
  directories: {
    output: "out/make",
  },
  publish: [
    {
      provider: "generic",
      url: updateFeedUrl,
    },
  ],
  win: {
    target: [
      {
        target: "nsis",
        arch: ["x64"],
      },
    ],
  },
  nsis: {
    oneClick: false,
    perMachine: false,
    allowToChangeInstallationDirectory: true,
    allowElevation: true,
    createDesktopShortcut: true,
    createStartMenuShortcut: true,
    shortcutName: "Dropshipping Tools",
    uninstallDisplayName: "Dropshipping Tools",
    artifactName: "${name}-${version}-setup.${ext}",
  },
};
