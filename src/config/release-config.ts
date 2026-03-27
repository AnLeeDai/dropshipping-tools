import rawReleaseConfig from "../../release.config.json";

export interface ReleaseConfig {
  repository: {
    owner: string;
    name: string;
  };
  autoUpdate: {
    checkIntervalMinutes: number;
  };
  release: {
    version: string;
    name: string;
    publishedAt: string;
    notes: string[];
  };
}

export const releaseConfig = rawReleaseConfig as ReleaseConfig;

export const currentRelease = releaseConfig.release;

export function normalizeVersion(version: string): string {
  return version.replace(/^v/i, "").trim();
}

function splitVersion(version: string) {
  const [core, prerelease = ""] = normalizeVersion(version).split("-");
  return {
    core: core.split(".").map((segment) => Number.parseInt(segment, 10) || 0),
    prerelease,
  };
}

export function compareVersions(leftVersion: string, rightVersion: string): number {
  const left = splitVersion(leftVersion);
  const right = splitVersion(rightVersion);
  const size = Math.max(left.core.length, right.core.length);

  for (let index = 0; index < size; index += 1) {
    const leftPart = left.core[index] ?? 0;
    const rightPart = right.core[index] ?? 0;

    if (leftPart > rightPart) {
      return 1;
    }

    if (leftPart < rightPart) {
      return -1;
    }
  }

  if (left.prerelease === right.prerelease) {
    return 0;
  }

  if (!left.prerelease) {
    return 1;
  }

  if (!right.prerelease) {
    return -1;
  }

  return left.prerelease.localeCompare(right.prerelease, undefined, {
    numeric: true,
    sensitivity: "base",
  });
}

export function formatReleaseNotes(notes: string[]): string {
  return notes.map((note) => `• ${note}`).join("\n");
}
