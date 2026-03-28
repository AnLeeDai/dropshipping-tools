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

export interface UpdateDeferralInfo {
  isDeferred: boolean;
  deferredReason: string | null;
  deferredUntil: string | null;
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

export function getUpdateDeferralInfo(
  availableAtMs: number | null,
  nowMs = Date.now(),
): UpdateDeferralInfo {
  if (!availableAtMs || availableAtMs <= nowMs) {
    return {
      isDeferred: false,
      deferredReason: null,
      deferredUntil: null,
    };
  }

  const remainingSeconds = Math.max(1, Math.ceil((availableAtMs - nowMs) / 1000));

  return {
    isDeferred: true,
    deferredReason:
      remainingSeconds <= 1
        ? "Ứng dụng vừa được cài đặt. Vui lòng đợi khoảng 1 giây rồi kiểm tra lại cập nhật."
        : `Ứng dụng vừa được cài đặt. Vui lòng đợi khoảng ${remainingSeconds} giây rồi kiểm tra lại cập nhật.`,
    deferredUntil: new Date(availableAtMs).toISOString(),
  };
}

export function formatUpdaterErrorMessage(rawMessage: string, repository?: string): string {
  const message = rawMessage.trim();
  const repoLabel = repository ? ` cho repo ${repository}` : "";

  if (/404|not found/i.test(message)) {
    return `Không tìm thấy feed cập nhật (404)${repoLabel}. Hãy kiểm tra GitHub Release đã publish công khai và có đủ file RELEASES, .nupkg, và Setup.exe.`;
  }

  if (/403|forbidden/i.test(message)) {
    return `Máy chủ cập nhật từ chối truy cập${repoLabel}. Kiểm tra lại quyền truy cập repo hoặc giới hạn truy vấn của dịch vụ phát hành.`;
  }

  if (/timed out|timeout/i.test(message)) {
    return "Kiểm tra cập nhật bị hết thời gian chờ. Hãy thử lại sau ít phút.";
  }

  return message;
}
