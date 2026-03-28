import test from "node:test";
import assert from "node:assert/strict";
import {
  compareVersions,
  createReleaseMetadata,
  formatUpdaterErrorMessage,
  formatReleaseNotes,
  formatUpdateVersionLabel,
  getUpdateDeferralInfo,
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

test("getUpdateDeferralInfo returns a non-error wait state during first-run cooldown", () => {
  const now = Date.UTC(2026, 2, 28, 10, 0, 0);
  const deferred = getUpdateDeferralInfo(now + 4500, now);

  assert.equal(deferred.isDeferred, true);
  assert.match(deferred.deferredReason ?? "", /4|5/);
  assert.equal(deferred.deferredUntil, new Date(now + 4500).toISOString());

  assert.deepEqual(getUpdateDeferralInfo(now - 1, now), {
    isDeferred: false,
    deferredReason: null,
    deferredUntil: null,
  });
});

test("formatUpdaterErrorMessage compresses native 404 update failures into actionable text", () => {
  const formatted = formatUpdaterErrorMessage(
    "Command failed: 4294967295 System.AggregateException ... (404) Not Found ... Squirrel.Update.Program",
    "AnLeeDai/dropshipping-tools",
  );

  assert.match(formatted, /Không tìm thấy feed cập nhật/);
  assert.match(formatted, /AnLeeDai\/dropshipping-tools/);
  assert.match(formatted, /RELEASES/);
});
