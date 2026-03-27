import { app, autoUpdater, BrowserWindow, ipcMain } from "electron";
import {
  compareVersions,
  currentRelease,
  formatReleaseNotes,
  normalizeVersion,
  releaseConfig,
} from "../config/release-config";

interface GitHubReleaseResponse {
  tag_name: string;
  name: string;
  body: string | null;
  published_at: string | null;
  created_at: string | null;
}

interface ReleaseMetadata {
  version: string;
  releaseName: string;
  releaseNotes: string;
  releaseDate: string | null;
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

let mainWindow: BrowserWindow | null = null;
let scheduledCheck: NodeJS.Timeout | null = null;
let autoUpdaterEventsRegistered = false;
let latestReleaseMetadata: ReleaseMetadata | null = {
  version: currentRelease.version,
  releaseName: currentRelease.name,
  releaseNotes: formatReleaseNotes(currentRelease.notes),
  releaseDate: currentRelease.publishedAt,
};

let updateState: UpdateState = {
  hasUpdate: false,
  currentVersion: currentRelease.version,
  releaseName: currentRelease.name,
  releaseNotes: formatReleaseNotes(currentRelease.notes),
  releaseDate: currentRelease.publishedAt,
  canAutoUpdate: false,
  isDownloading: false,
  isUpdateReady: false,
  error: null,
  lastCheckedAt: null,
};

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
    currentVersion: app.getVersion(),
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
  return (
    latestReleaseMetadata ?? {
      version: currentRelease.version,
      releaseName: currentRelease.name,
      releaseNotes: formatReleaseNotes(currentRelease.notes),
      releaseDate: currentRelease.publishedAt,
    }
  );
}

async function fetchLatestReleaseMetadata(): Promise<ReleaseMetadata> {
  const { owner, name } = releaseConfig.repository;
  const response = await fetch(`https://api.github.com/repos/${owner}/${name}/releases/latest`, {
    headers: {
      Accept: "application/vnd.github+json",
      "User-Agent": app.getName(),
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub release lookup failed with status ${response.status}`);
  }

  const payload = (await response.json()) as GitHubReleaseResponse;
  const releaseNotes =
    payload.body && payload.body.trim().length > 0
      ? payload.body.trim()
      : formatReleaseNotes(currentRelease.notes);

  latestReleaseMetadata = {
    version: normalizeVersion(payload.tag_name || payload.name || currentRelease.version),
    releaseName: payload.name?.trim() || `v${normalizeVersion(payload.tag_name)}`,
    releaseNotes,
    releaseDate: payload.published_at || payload.created_at || currentRelease.publishedAt,
  };

  return latestReleaseMetadata;
}

async function refreshUpdateState(options?: {
  triggerBackgroundDownload?: boolean;
  emitErrors?: boolean;
}): Promise<UpdateState> {
  const triggerBackgroundDownload = options?.triggerBackgroundDownload ?? false;
  const emitErrors = options?.emitErrors ?? true;
  const checkedAt = new Date().toISOString();

  updateSnapshot({
    currentVersion: app.getVersion(),
    error: null,
    lastCheckedAt: checkedAt,
  });

  try {
    const releaseMetadata = await fetchLatestReleaseMetadata();
    const hasUpdate = compareVersions(releaseMetadata.version, app.getVersion()) > 0;
    const shouldStartNativeDownload =
      hasUpdate && triggerBackgroundDownload && canUseNativeAutoUpdate();

    updateSnapshot({
      hasUpdate,
      newVersion: hasUpdate ? releaseMetadata.version : undefined,
      releaseName: releaseMetadata.releaseName,
      releaseNotes: releaseMetadata.releaseNotes,
      releaseDate: releaseMetadata.releaseDate,
      isDownloading: shouldStartNativeDownload ? true : false,
      isUpdateReady: hasUpdate ? updateState.isUpdateReady : false,
      error: null,
      lastCheckedAt: checkedAt,
    });

    if (hasUpdate && shouldStartNativeDownload) {
      autoUpdater.checkForUpdates();
    }

    if (!hasUpdate) {
      updateSnapshot({
        isDownloading: false,
        isUpdateReady: false,
      });
    }

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
    } else {
      console.error("Silent update check failed:", message);
      return updateState;
    }

    throw new Error(message);
  }
}

function registerAutoUpdaterEvents(): void {
  if (autoUpdaterEventsRegistered) {
    return;
  }

  autoUpdaterEventsRegistered = true;

  autoUpdater.on("update-available", () => {
    const metadata = getCachedReleaseMetadata();

    updateSnapshot({
      hasUpdate: true,
      newVersion: metadata.version,
      releaseName: metadata.releaseName,
      releaseNotes: metadata.releaseNotes,
      releaseDate: metadata.releaseDate,
      isDownloading: true,
      isUpdateReady: false,
      error: null,
    });

    sendSnapshot("update:available");
  });

  autoUpdater.on("update-not-available", () => {
    updateSnapshot({
      hasUpdate: false,
      newVersion: undefined,
      isDownloading: false,
      isUpdateReady: false,
      error: null,
    });

    sendSnapshot("update:not-available");
  });

  autoUpdater.on("update-downloaded", (...args: unknown[]) => {
    const metadata = getCachedReleaseMetadata();
    const [, releaseNotes, releaseName, releaseDate] = args as [
      unknown,
      string | undefined,
      string | undefined,
      string | undefined,
    ];

    updateSnapshot({
      hasUpdate: true,
      newVersion: metadata.version,
      releaseName: releaseName?.trim() || metadata.releaseName,
      releaseNotes: releaseNotes?.trim() || metadata.releaseNotes,
      releaseDate: releaseDate || metadata.releaseDate,
      isDownloading: false,
      isUpdateReady: true,
      error: null,
    });

    sendSnapshot("update:downloaded");
  });

  autoUpdater.on("error", (error) => {
    const message = error instanceof Error ? error.message : "Unknown update error";

    updateSnapshot({
      error: message,
      isDownloading: false,
    });

    sendSnapshot("update:error");
  });
}

export function initializeUpdater(window: BrowserWindow): void {
  mainWindow = window;

  updateSnapshot({
    currentVersion: app.getVersion(),
    releaseName: currentRelease.name,
    releaseNotes: formatReleaseNotes(currentRelease.notes),
    releaseDate: currentRelease.publishedAt,
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
}
