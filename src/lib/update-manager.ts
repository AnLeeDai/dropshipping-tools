import { ipcMain, BrowserWindow } from "electron";
import { autoUpdater, UpdateInfo } from "electron-updater";

interface UpdateState {
  hasUpdate: boolean;
  currentVersion: string;
  newVersion?: string;
  updateInfo?: UpdateInfo;
}

let mainWindow: BrowserWindow | null = null;
let downloadingUpdate = false;

export function initializeUpdater(window: BrowserWindow): void {
  mainWindow = window;

  // Configure auto-updater to use GitHub releases
  autoUpdater.setFeedURL({
    provider: "github",
    owner: "AnLeeDai",
    repo: "dropshipping-tools",
  });

  // Enable automatic downloads
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  console.log("Updater initialized with GitHub feedURL");
  console.log("AutoDownload:", autoUpdater.autoDownload);
  console.log("AutoInstallOnAppQuit:", autoUpdater.autoInstallOnAppQuit);

  // Initial check for updates
  autoUpdater.checkForUpdates().catch(err => {
    console.error("Initial update check failed:", err);
  });

  // Check for updates every hour
  setInterval(() => {
    autoUpdater.checkForUpdates().catch(err => {
      console.error("Periodic update check failed:", err);
    });
  }, 60 * 60 * 1000);

  // Events
  autoUpdater.on("update-available", (info: UpdateInfo) => {
    console.log("Update available:", info.version);
    console.log("Auto-download enabled, download will start automatically...");
    downloadingUpdate = true;
    if (mainWindow) {
      mainWindow.webContents.send("update:available", {
        hasUpdate: true,
        currentVersion: autoUpdater.currentVersion.version,
        newVersion: info.version,
        releaseNotes: info.releaseNotes,
      });
    }
  });

  autoUpdater.on("update-downloaded", () => {
    console.log("Update downloaded successfully and ready to install");
    downloadingUpdate = false;
    if (mainWindow) {
      mainWindow.webContents.send("update:downloaded");
    }
  });

  autoUpdater.on("update-not-available", () => {
    console.log("No update available");
    downloadingUpdate = false;
    if (mainWindow) {
      mainWindow.webContents.send("update:not-available");
    }
  });

  autoUpdater.on("error", (err: Error) => {
    downloadingUpdate = false;
    console.error("Update error:", err.message || err);
    if (mainWindow) {
      mainWindow.webContents.send("update:error", err.message || "Unknown error");
    }
  });

  autoUpdater.on("download-progress", (progress) => {
    console.log(`Update download progress: ${progress.percent.toFixed(2)}% (${(progress.transferred / 1024 / 1024).toFixed(2)}MB/${(progress.total / 1024 / 1024).toFixed(2)}MB)`);
    if (mainWindow) {
      mainWindow.webContents.send("update:progress", {
        percent: Math.round(progress.percent),
        bytesPerSecond: progress.bytesPerSecond,
        total: progress.total,
        transferred: progress.transferred,
      });
    }
  });
}

export function setupUpdateHandlers(): void {
  // Check for updates
  ipcMain.handle("updater:check-for-updates", async () => {
    try {
      console.log("Checking for updates...");
      const result = await autoUpdater.checkForUpdates();
      const hasUpdate = !!result?.updateInfo;
      console.log("Update check result:", {
        hasUpdate,
        currentVersion: autoUpdater.currentVersion.version,
        newVersion: result?.updateInfo?.version,
      });
      return {
        hasUpdate,
        currentVersion: autoUpdater.currentVersion.version,
        newVersion: result?.updateInfo?.version,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Failed to check for updates:", errorMsg);
      throw new Error(`Update check failed: ${errorMsg}`);
    }
  });

  // Quit and install
  ipcMain.handle("updater:quit-and-install", () => {
    try {
      console.log("Attempting to quit and install update...");
      console.log("Downloading update:", downloadingUpdate);
      
      if (downloadingUpdate) {
        throw new Error("Update is still downloading. Please wait for download to complete.");
      }
      
      // Use setImmediate to ensure all pending IPC messages are processed
      setImmediate(() => {
        console.log("Calling autoUpdater.quitAndInstall()");
        autoUpdater.quitAndInstall();
      });
      
      return { success: true };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Failed to quit and install:", errorMsg);
      throw new Error(`Installation failed: ${errorMsg}`);
    }
  });

  // Get current version
  ipcMain.handle("updater:get-version", () => {
    return autoUpdater.currentVersion.version;
  });
}

export function getUpdaterState(): UpdateState {
  return {
    hasUpdate: false,
    currentVersion: autoUpdater.currentVersion.version,
  };
}
