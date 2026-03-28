import fs from "node:fs";
import path from "node:path";
import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater, type UpdateDownloadedEvent, type UpdateInfo } from "electron-updater";
import { currentReleaseMetadata, releaseConfig } from "../config/release-config";
import {
  compareVersions,
  formatUpdaterErrorMessage,
  normalizeVersion,
  type ReleaseMetadata,
} from "./update-utils";

interface GitHubReleaseResponse {
  tag_name: string;
  name: string;
  body: string | null;
  published_at: string | null;
  created_at: string | null;
}

export interface UpdateState {
  hasUpdate: boolean;
  currentVersion: string;
  newVersion?: string;
  releaseName?: string;
  releaseNotes?: string;
  releaseDate?: string | null;
  canAutoUpdate: boolean;
  isDownloading: boolean;
  isUpdateReady: boolean;
  isUpdateDeferred: boolean;
  deferredReason: string | null;
  deferredUntil: string | null;
  error: string | null;
  lastCheckedAt: string | null;
}

const RELEASE_LOOKUP_TIMEOUT_MS = 10000;
const UPDATE_CHECK_TIMEOUT_MS = 30000;
const STARTUP_UPDATE_DELAY_MS = 5000;

let mainWindow: BrowserWindow | null = null;
let scheduledCheck: NodeJS.Timeout | null = null;
let autoUpdaterEventsRegistered = false;
let latestReleaseMetadata: ReleaseMetadata | null = currentReleaseMetadata;
let metadataSyncInFlight: Promise<ReleaseMetadata | null> | null = null;
let pendingNativeCheck: Promise<UpdateState> | null = null;
let pendingNativeCheckResolve: ((state: UpdateState) => void) | null = null;
let pendingNativeCheckReject: ((error: Error) => void) | null = null;
let pendingNativeCheckTimeout: NodeJS.Timeout | null = null;

let updateState: UpdateState = {
  hasUpdate: false,
  currentVersion: currentReleaseMetadata.version,
  releaseName: currentReleaseMetadata.releaseName,
  releaseNotes: currentReleaseMetadata.releaseNotes,
  releaseDate: currentReleaseMetadata.releaseDate,
  canAutoUpdate: false,
  isDownloading: false,
  isUpdateReady: false,
  isUpdateDeferred: false,
  deferredReason: null,
  deferredUntil: null,
  error: null,
  lastCheckedAt: null,
};

function getCurrentVersion(): string {
  return normalizeVersion(app.getVersion());
}

function getRepositorySlug(): string {
  const { owner, name } = releaseConfig.repository;
  return `${owner}/${name}`;
}

function getUpdateConfigPath(): string {
  return path.join(process.resourcesPath, "app-update.yml");
}

function canUseNativeAutoUpdate(): boolean {
  return app.isPackaged && process.platform === "win32" && fs.existsSync(getUpdateConfigPath());
}

function updateSnapshot(partialState: Partial<UpdateState>): UpdateState {
  updateState = {
    ...updateState,
    currentVersion: getCurrentVersion(),
    canAutoUpdate: canUseNativeAutoUpdate(),
    ...partialState,
  };

  return updateState;
}

function sendSnapshot(channel: string): void {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  mainWindow.webContents.send(channel, updateState);
}

function getCachedReleaseMetadata(): ReleaseMetadata {
  return latestReleaseMetadata ?? currentReleaseMetadata;
}

function normalizeReleaseDate(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  const parsedDate = new Date(value);
  return Number.isNaN(parsedDate.getTime()) ? null : parsedDate.toISOString();
}

function normalizeReleaseNotes(releaseNotes: UpdateInfo["releaseNotes"] | undefined | null): string | undefined {
  if (!releaseNotes) {
    return undefined;
  }

  if (typeof releaseNotes === "string") {
    const normalized = releaseNotes.trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  const normalized = releaseNotes
    .map((entry) => entry.note?.trim())
    .filter((entry): entry is string => Boolean(entry))
    .join("\n\n")
    .trim();

  return normalized.length > 0 ? normalized : undefined;
}

function createReleaseMetadataFromUpdateInfo(info: Partial<UpdateInfo> | null | undefined): ReleaseMetadata | null {
  const version = info?.version?.trim();
  if (!version) {
    return null;
  }

  const normalizedVersion = normalizeVersion(version);

  return {
    version: normalizedVersion,
    releaseName: info.releaseName?.trim() || `v${normalizedVersion}`,
    releaseNotes: normalizeReleaseNotes(info.releaseNotes) || currentReleaseMetadata.releaseNotes,
    releaseDate: normalizeReleaseDate(info.releaseDate) || currentReleaseMetadata.releaseDate,
  };
}

function buildStateFromMetadata(
  metadata: ReleaseMetadata,
  partialState: Partial<UpdateState>,
): UpdateState {
  const hasUpdate = compareVersions(metadata.version, getCurrentVersion()) > 0;

  return updateSnapshot({
    releaseName: metadata.releaseName,
    releaseNotes: metadata.releaseNotes,
    releaseDate: metadata.releaseDate,
    newVersion: hasUpdate ? metadata.version : undefined,
    ...partialState,
  });
}

function clearPendingNativeCheck(): void {
  if (pendingNativeCheckTimeout) {
    clearTimeout(pendingNativeCheckTimeout);
    pendingNativeCheckTimeout = null;
  }

  pendingNativeCheck = null;
  pendingNativeCheckResolve = null;
  pendingNativeCheckReject = null;
}

function resolveNativeCheck(state: UpdateState): void {
  const resolve = pendingNativeCheckResolve;
  clearPendingNativeCheck();
  resolve?.(state);
}

function rejectNativeCheck(error: Error): void {
  const reject = pendingNativeCheckReject;
  clearPendingNativeCheck();
  reject?.(error);
}

function createReleaseLookupError(error: unknown): Error {
  if (error instanceof Error && error.name === "AbortError") {
    return new Error("Timed out while loading release metadata from GitHub Releases.");
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("Unknown release metadata error");
}

async function fetchLatestReleaseMetadata(): Promise<ReleaseMetadata> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), RELEASE_LOOKUP_TIMEOUT_MS);
  const { owner, name } = releaseConfig.repository;

  try {
    const response = await fetch(`https://api.github.com/repos/${owner}/${name}/releases/latest`, {
      headers: {
        Accept: "application/vnd.github+json",
        "User-Agent": app.getName(),
      },
      signal: controller.signal,
    });

    if (!response.ok) {
      if (response.status === 403) {
        throw new Error("GitHub Releases metadata is temporarily unavailable. Try again in a few minutes.");
      }

      if (response.status === 404) {
        throw new Error("No published GitHub Release was found for this repository.");
      }

      throw new Error(`GitHub release lookup failed with status ${response.status}`);
    }

    const payload = (await response.json()) as GitHubReleaseResponse;
    const releaseNotes =
      payload.body && payload.body.trim().length > 0
        ? payload.body.trim()
        : currentReleaseMetadata.releaseNotes;

    return {
      version: normalizeVersion(payload.tag_name || payload.name || currentReleaseMetadata.version),
      releaseName: payload.name?.trim() || `v${normalizeVersion(payload.tag_name || currentReleaseMetadata.version)}`,
      releaseNotes,
      releaseDate: payload.published_at || payload.created_at || currentReleaseMetadata.releaseDate,
    };
  } catch (error) {
    throw createReleaseLookupError(error);
  } finally {
    clearTimeout(timeout);
  }
}

async function syncLatestReleaseMetadata(
  emitChannel?: "update:available" | "update:downloaded",
): Promise<ReleaseMetadata | null> {
  if (metadataSyncInFlight) {
    return metadataSyncInFlight;
  }

  const request = fetchLatestReleaseMetadata()
    .then((metadata) => {
      latestReleaseMetadata = metadata;
      buildStateFromMetadata(metadata, {});

      if (emitChannel) {
        sendSnapshot(emitChannel);
      }

      return metadata;
    })
    .catch((error) => {
      const message = error instanceof Error ? error.message : "Unknown release metadata error";
      console.warn("Release metadata sync failed:", message);
      return null;
    })
    .finally(() => {
      if (metadataSyncInFlight === request) {
        metadataSyncInFlight = null;
      }
    });

  metadataSyncInFlight = request;
  return request;
}

function ensureNativeCheckAvailable(): void {
  if (!canUseNativeAutoUpdate()) {
    throw new Error("Auto update is only available in packaged Windows installer builds.");
  }
}

function runNativeUpdateCheck(): Promise<UpdateState> {
  ensureNativeCheckAvailable();

  if (updateState.isDownloading || updateState.isUpdateReady) {
    return Promise.resolve(getUpdaterState());
  }

  if (pendingNativeCheck) {
    return pendingNativeCheck;
  }

  pendingNativeCheck = new Promise<UpdateState>((resolve, reject) => {
    pendingNativeCheckResolve = resolve;
    pendingNativeCheckReject = reject;
  });

  const currentPromise = pendingNativeCheck;
  pendingNativeCheckTimeout = setTimeout(() => {
    rejectNativeCheck(new Error("Timed out while waiting for the update service."));
  }, UPDATE_CHECK_TIMEOUT_MS);

  try {
    void autoUpdater.checkForUpdates().catch((error) => {
      const updateError = error instanceof Error ? error : new Error("Unknown update error");
      rejectNativeCheck(updateError);
    });
  } catch (error) {
    const updateError = error instanceof Error ? error : new Error("Unknown update error");
    rejectNativeCheck(updateError);
    return Promise.reject(updateError);
  }

  return currentPromise;
}

async function refreshUpdateState(options?: {
  emitErrors?: boolean;
}): Promise<UpdateState> {
  const emitErrors = options?.emitErrors ?? true;
  const checkedAt = new Date().toISOString();

  updateSnapshot({
    error: null,
    lastCheckedAt: checkedAt,
  });

  try {
    if (canUseNativeAutoUpdate()) {
      updateSnapshot({
        isUpdateDeferred: false,
        deferredReason: null,
        deferredUntil: null,
      });

      const nativeState = await runNativeUpdateCheck();

      if (nativeState.hasUpdate || nativeState.isUpdateReady) {
        await syncLatestReleaseMetadata();
      }

      return updateState;
    }

    const releaseMetadata = await fetchLatestReleaseMetadata();
    latestReleaseMetadata = releaseMetadata;

    return buildStateFromMetadata(releaseMetadata, {
      hasUpdate: compareVersions(releaseMetadata.version, getCurrentVersion()) > 0,
      isDownloading: false,
      isUpdateReady: false,
      isUpdateDeferred: false,
      deferredReason: null,
      deferredUntil: null,
      error: null,
      lastCheckedAt: checkedAt,
    });
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "Unknown update error";
    const message = formatUpdaterErrorMessage(rawMessage, getRepositorySlug());

    updateSnapshot({
      error: message,
      lastCheckedAt: checkedAt,
      isDownloading: false,
      isUpdateDeferred: false,
      deferredReason: null,
      deferredUntil: null,
    });

    if (emitErrors) {
      sendSnapshot("update:error");
      throw new Error(message);
    }

    console.error("Silent update check failed:", message);
    return updateState;
  }
}

function registerAutoUpdaterEvents(): void {
  if (autoUpdaterEventsRegistered) {
    return;
  }

  autoUpdaterEventsRegistered = true;

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    const metadata = createReleaseMetadataFromUpdateInfo(info) ?? getCachedReleaseMetadata();
    latestReleaseMetadata = metadata;

    const state = buildStateFromMetadata(metadata, {
      hasUpdate: true,
      isDownloading: true,
      isUpdateReady: false,
      isUpdateDeferred: false,
      deferredReason: null,
      deferredUntil: null,
      error: null,
    });

    sendSnapshot("update:available");
    resolveNativeCheck(state);
    void syncLatestReleaseMetadata("update:available");
  });

  autoUpdater.on("download-progress", () => {
    if (updateState.isUpdateReady) {
      return;
    }

    updateSnapshot({
      hasUpdate: true,
      isDownloading: true,
      error: null,
    });
  });

  autoUpdater.on("update-not-available", (info: UpdateInfo) => {
    const metadata = createReleaseMetadataFromUpdateInfo(info) ?? currentReleaseMetadata;
    latestReleaseMetadata = metadata;

    const state = buildStateFromMetadata(metadata, {
      hasUpdate: false,
      newVersion: undefined,
      isDownloading: false,
      isUpdateReady: false,
      isUpdateDeferred: false,
      deferredReason: null,
      deferredUntil: null,
      error: null,
    });

    sendSnapshot("update:not-available");
    resolveNativeCheck(state);
  });

  autoUpdater.on("update-downloaded", (info: UpdateDownloadedEvent) => {
    const metadata = createReleaseMetadataFromUpdateInfo(info) ?? getCachedReleaseMetadata();
    latestReleaseMetadata = metadata;

    const state = buildStateFromMetadata(metadata, {
      hasUpdate: true,
      isDownloading: false,
      isUpdateReady: true,
      isUpdateDeferred: false,
      deferredReason: null,
      deferredUntil: null,
      error: null,
    });

    sendSnapshot("update:downloaded");
    resolveNativeCheck(state);
    void syncLatestReleaseMetadata("update:downloaded");
  });

  autoUpdater.on("error", (error) => {
    const rawMessage = error instanceof Error ? error.message : "Unknown update error";
    const message = formatUpdaterErrorMessage(rawMessage, getRepositorySlug());

    console.error("Native auto-update failed", {
      configPath: getUpdateConfigPath(),
      repository: getRepositorySlug(),
      rawMessage,
    });

    updateSnapshot({
      error: message,
      isDownloading: false,
    });

    sendSnapshot("update:error");
    rejectNativeCheck(new Error(message));
  });
}

export function initializeUpdater(window: BrowserWindow): void {
  mainWindow = window;
  latestReleaseMetadata = currentReleaseMetadata;

  updateSnapshot({
    currentVersion: getCurrentVersion(),
    releaseName: currentReleaseMetadata.releaseName,
    releaseNotes: currentReleaseMetadata.releaseNotes,
    releaseDate: currentReleaseMetadata.releaseDate,
    isUpdateDeferred: false,
    deferredReason: null,
    deferredUntil: null,
  });

  if (!canUseNativeAutoUpdate()) {
    console.log("Auto-update is disabled in development or in builds without app-update.yml.");
    return;
  }

  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = false;

  registerAutoUpdaterEvents();

  setTimeout(() => {
    void refreshUpdateState({
      emitErrors: false,
    });
  }, STARTUP_UPDATE_DELAY_MS);

  const intervalMs = releaseConfig.autoUpdate.checkIntervalMinutes * 60 * 1000;
  if (!scheduledCheck) {
    scheduledCheck = setInterval(() => {
      void refreshUpdateState({
        emitErrors: false,
      });
    }, intervalMs);
  }
}

export function setupUpdateHandlers(): void {
  ipcMain.handle("updater:check-for-updates", async () => {
    return refreshUpdateState({
      emitErrors: true,
    });
  });

  ipcMain.handle("updater:quit-and-install", async () => {
    if (!canUseNativeAutoUpdate()) {
      throw new Error("Auto update is only available in packaged builds.");
    }

    if (!updateState.isUpdateReady) {
      throw new Error("Update is not ready to install yet.");
    }

    setImmediate(() => {
      autoUpdater.quitAndInstall();
    });

    return { success: true };
  });

  ipcMain.handle("updater:get-version", () => app.getVersion());
  ipcMain.handle("updater:get-state", () => getUpdaterState());
}

export function getUpdaterState(): UpdateState {
  return updateSnapshot({});
}

export function disposeUpdater(): void {
  if (scheduledCheck) {
    clearInterval(scheduledCheck);
    scheduledCheck = null;
  }

  clearPendingNativeCheck();
}
