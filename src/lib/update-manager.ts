import { app, autoUpdater, BrowserWindow, ipcMain } from "electron";
import { currentReleaseMetadata, releaseConfig } from "../config/release-config";
import {
  compareVersions,
  getKnownUpdateDetails,
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
  error: string | null;
  lastCheckedAt: string | null;
}

const RELEASE_LOOKUP_TIMEOUT_MS = 10000;
const NATIVE_UPDATE_TIMEOUT_MS = 30000;

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
  error: null,
  lastCheckedAt: null,
};

function getCurrentVersion(): string {
  return normalizeVersion(app.getVersion());
}

function canUseNativeAutoUpdate(): boolean {
  return app.isPackaged && (process.platform === "win32" || process.platform === "darwin");
}

function buildFeedUrl(): string {
  const { owner, name } = releaseConfig.repository;
  return `https://update.electronjs.org/${owner}/${name}/${process.platform}-${process.arch}/${app.getVersion()}`;
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

function applyReleaseMetadata(metadata: ReleaseMetadata): UpdateState {
  const details = getKnownUpdateDetails(metadata, getCurrentVersion());

  return updateSnapshot({
    releaseName: metadata.releaseName,
    releaseNotes: metadata.releaseNotes,
    releaseDate: metadata.releaseDate,
    newVersion: details.newVersion ?? (updateState.hasUpdate ? updateState.newVersion : undefined),
  });
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

async function syncLatestReleaseMetadata(emitChannel?: "update:available" | "update:downloaded"): Promise<ReleaseMetadata | null> {
  if (metadataSyncInFlight) {
    return metadataSyncInFlight;
  }

  const request = fetchLatestReleaseMetadata()
    .then((metadata) => {
      latestReleaseMetadata = metadata;
      applyReleaseMetadata(metadata);

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
    throw new Error("Auto update is only available in packaged Windows and macOS builds.");
  }

  if (process.platform === "win32" && process.argv.includes("--squirrel-firstrun")) {
    throw new Error("Updates are unavailable during the first launch after install. Wait a few seconds and try again.");
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
    rejectNativeCheck(new Error("Timed out while waiting for the native update service."));
  }, NATIVE_UPDATE_TIMEOUT_MS);

  try {
    autoUpdater.checkForUpdates();
  } catch (error) {
    const nativeError = error instanceof Error ? error : new Error("Unknown update error");
    rejectNativeCheck(nativeError);
    return Promise.reject(nativeError);
  }

  return currentPromise;
}

async function refreshUpdateState(options?: {
  triggerBackgroundDownload?: boolean;
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
      const nativeState = await runNativeUpdateCheck();

      if (nativeState.hasUpdate || nativeState.isUpdateReady) {
        await syncLatestReleaseMetadata();
      }

      return updateState;
    }

    const releaseMetadata = await fetchLatestReleaseMetadata();
    latestReleaseMetadata = releaseMetadata;
    const hasUpdate = compareVersions(releaseMetadata.version, getCurrentVersion()) > 0;

    updateSnapshot({
      hasUpdate,
      newVersion: hasUpdate ? releaseMetadata.version : undefined,
      releaseName: releaseMetadata.releaseName,
      releaseNotes: releaseMetadata.releaseNotes,
      releaseDate: releaseMetadata.releaseDate,
      isDownloading: false,
      isUpdateReady: false,
      error: null,
      lastCheckedAt: checkedAt,
    });

    return updateState;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown update error";

    updateSnapshot({
      error: message,
      lastCheckedAt: checkedAt,
      isDownloading: false,
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

  autoUpdater.on("update-available", () => {
    const metadata = getCachedReleaseMetadata();
    const details = getKnownUpdateDetails(metadata, getCurrentVersion());

    updateSnapshot({
      hasUpdate: true,
      newVersion: details.newVersion,
      releaseName: details.releaseName,
      releaseNotes: details.releaseNotes,
      releaseDate: details.releaseDate,
      isDownloading: true,
      isUpdateReady: false,
      error: null,
    });

    sendSnapshot("update:available");
    resolveNativeCheck(updateState);
    void syncLatestReleaseMetadata("update:available");
  });

  autoUpdater.on("update-not-available", () => {
    latestReleaseMetadata = currentReleaseMetadata;

    updateSnapshot({
      hasUpdate: false,
      newVersion: undefined,
      releaseName: currentReleaseMetadata.releaseName,
      releaseNotes: currentReleaseMetadata.releaseNotes,
      releaseDate: currentReleaseMetadata.releaseDate,
      isDownloading: false,
      isUpdateReady: false,
      error: null,
    });

    sendSnapshot("update:not-available");
    resolveNativeCheck(updateState);
  });

  autoUpdater.on("update-downloaded", (...args: unknown[]) => {
    const metadata = getCachedReleaseMetadata();
    const details = getKnownUpdateDetails(metadata, getCurrentVersion());
    const [, releaseNotes, releaseName, releaseDate] = args as [
      unknown,
      string | undefined,
      string | undefined,
      string | Date | undefined,
    ];

    updateSnapshot({
      hasUpdate: true,
      newVersion: details.newVersion ?? updateState.newVersion,
      releaseName: releaseName?.trim() || details.releaseName || updateState.releaseName,
      releaseNotes: releaseNotes?.trim() || details.releaseNotes || updateState.releaseNotes,
      releaseDate: normalizeReleaseDate(releaseDate) || details.releaseDate || updateState.releaseDate || null,
      isDownloading: false,
      isUpdateReady: true,
      error: null,
    });

    sendSnapshot("update:downloaded");
    resolveNativeCheck(updateState);
    void syncLatestReleaseMetadata("update:downloaded");
  });

  autoUpdater.on("error", (error) => {
    const message = error instanceof Error ? error.message : "Unknown update error";

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
  });

  if (!canUseNativeAutoUpdate()) {
    console.log("Native auto-update is disabled in development or on an unsupported platform.");
    return;
  }

  autoUpdater.setFeedURL({
    url: buildFeedUrl(),
  });

  registerAutoUpdaterEvents();

  const initialDelay = process.argv.includes("--squirrel-firstrun") ? 15000 : 5000;
  setTimeout(() => {
    void refreshUpdateState({
      triggerBackgroundDownload: true,
      emitErrors: false,
    });
  }, initialDelay);

  const intervalMs = releaseConfig.autoUpdate.checkIntervalMinutes * 60 * 1000;
  if (!scheduledCheck) {
    scheduledCheck = setInterval(() => {
      void refreshUpdateState({
        triggerBackgroundDownload: true,
        emitErrors: false,
      });
    }, intervalMs);
  }
}

export function setupUpdateHandlers(): void {
  ipcMain.handle("updater:check-for-updates", async () => {
    return refreshUpdateState({
      triggerBackgroundDownload: true,
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
