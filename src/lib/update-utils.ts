export interface ReleaseDescriptor {
  version: string;
  name: string;
  publishedAt: string;
  notes: string[];
}

export interface ReleaseMetadata {
  version: string;
  releaseName: string;
  releaseNotes: string;
  releaseDate: string | null;
}

export function normalizeVersion(version: string): string {
  return version.trim().replace(/^v/i, "").trim();
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

export function hasNewerVersion(candidateVersion: string, currentVersion: string): boolean {
  return compareVersions(candidateVersion, currentVersion) > 0;
}

export function formatReleaseNotes(notes: string[]): string {
  return notes.map((note) => `• ${note}`).join("\n");
}

export function createReleaseMetadata(release: ReleaseDescriptor): ReleaseMetadata {
  const version = normalizeVersion(release.version);
  return {
    version,
    releaseName: release.name.trim() || `v${version}`,
    releaseNotes: formatReleaseNotes(release.notes),
    releaseDate: release.publishedAt || null,
  };
}

export function getKnownUpdateDetails(
  metadata: ReleaseMetadata | null | undefined,
  currentVersion: string,
): {
  newVersion?: string;
  releaseName?: string;
  releaseNotes?: string;
  releaseDate: string | null;
} {
  if (!metadata || !hasNewerVersion(metadata.version, currentVersion)) {
    return {
      newVersion: undefined,
      releaseName: undefined,
      releaseNotes: undefined,
      releaseDate: null,
    };
  }

  return {
    newVersion: metadata.version,
    releaseName: metadata.releaseName,
    releaseNotes: metadata.releaseNotes,
    releaseDate: metadata.releaseDate,
  };
}

export function formatUpdateVersionLabel(version?: string): string {
  return version ? `phiên bản ${version}` : "một bản cập nhật mới";
}
