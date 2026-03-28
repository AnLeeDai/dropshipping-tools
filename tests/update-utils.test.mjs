import test from "node:test";
import assert from "node:assert/strict";
import {
  compareVersions,
  createReleaseMetadata,
  formatReleaseNotes,
  formatUpdateVersionLabel,
  getKnownUpdateDetails,
  hasNewerVersion,
  normalizeVersion,
} from "../src/lib/update-utils.ts";

test("normalizeVersion strips the v prefix and whitespace", () => {
  assert.equal(normalizeVersion(" v1.2.3 "), "1.2.3");
});

test("compareVersions handles semver and prerelease precedence", () => {
  assert.equal(compareVersions("1.2.0", "1.1.9"), 1);
  assert.equal(compareVersions("1.2.0-beta.2", "1.2.0-beta.10"), -1);
  assert.equal(compareVersions("1.2.0", "1.2.0-beta.10"), 1);
  assert.equal(compareVersions("1.2.0", "1.2.0"), 0);
});

test("createReleaseMetadata formats release information for the UI", () => {
  const metadata = createReleaseMetadata({
    version: "v2.0.0",
    name: "Stable Release",
    publishedAt: "2026-03-28",
    notes: ["Fix updater edge cases", "Improve release gating"],
  });

  assert.deepEqual(metadata, {
    version: "2.0.0",
    releaseName: "Stable Release",
    releaseNotes: "• Fix updater edge cases\n• Improve release gating",
    releaseDate: "2026-03-28",
  });
});

test("getKnownUpdateDetails only exposes metadata for newer releases", () => {
  const metadata = createReleaseMetadata({
    version: "1.5.0",
    name: "Stable Release",
    publishedAt: "2026-03-28",
    notes: ["Ready"],
  });

  assert.equal(hasNewerVersion(metadata.version, "1.4.9"), true);
  assert.deepEqual(getKnownUpdateDetails(metadata, "1.4.9"), {
    newVersion: "1.5.0",
    releaseName: "Stable Release",
    releaseNotes: "• Ready",
    releaseDate: "2026-03-28",
  });

  assert.deepEqual(getKnownUpdateDetails(metadata, "1.5.0"), {
    newVersion: undefined,
    releaseName: undefined,
    releaseNotes: undefined,
    releaseDate: null,
  });
});

test("format helpers keep fallback copy human readable", () => {
  assert.equal(formatReleaseNotes(["One", "Two"]), "• One\n• Two");
  assert.equal(formatUpdateVersionLabel("2.1.0"), "phiên bản 2.1.0");
  assert.equal(formatUpdateVersionLabel(), "một bản cập nhật mới");
});
