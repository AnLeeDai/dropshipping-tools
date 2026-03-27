import * as React from "react";

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion?: string;
  newVersion?: string;
  releaseNotes?: string;
}

interface DownloadProgress {
  percent: number;
  bytesPerSecond: number;
  total: number;
  transferred: number;
}

declare global {
  interface Window {
    electron?: {
      updater: {
        checkForUpdates: () => Promise<UpdateInfo>;
        quitAndInstall: () => Promise<void>;
        getVersion: () => Promise<string>;
        onUpdateAvailable: (callback: (data: UpdateInfo) => void) => void;
        onUpdateDownloaded: (callback: () => void) => void;
        onUpdateNotAvailable: (callback: () => void) => void;
        onUpdateError: (callback: (message: string) => void) => void;
        onDownloadProgress: (callback: (progress: DownloadProgress) => void) => void;
      };
    };
  }
}

export function useUpdater() {
  const [updateInfo, setUpdateInfo] = React.useState<UpdateInfo>({
    hasUpdate: false,
  });
  const [isDownloading, setIsDownloading] = React.useState(false);
  const [downloadProgress, setDownloadProgress] =
    React.useState<DownloadProgress | null>(null);
  const [isChecking, setIsChecking] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [isUpdateReady, setIsUpdateReady] = React.useState(false);

  // Check for updates on mount
  React.useEffect(() => {
    const checkUpdates = async () => {
      if (!window.electron?.updater) {
        return;
      }

      try {
        setIsChecking(true);
        const info = await window.electron.updater.checkForUpdates();
        setUpdateInfo(info);
        console.log("Initial update check:", info);
      } catch (err) {
        console.error("Failed to check for updates:", err);
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setIsChecking(false);
      }
    };

    checkUpdates();
  }, []);

  // Listen for update events
  React.useEffect(() => {
    if (!window.electron?.updater) {
      return;
    }

    window.electron.updater.onUpdateAvailable((data) => {
      console.log("Update available event received:", data);
      setUpdateInfo(data);
      setIsDownloading(true);
      setDownloadProgress(null);
      setIsUpdateReady(false);
      setError(null);
    });

    window.electron.updater.onUpdateDownloaded(() => {
      console.log("Update downloaded event received");
      setIsDownloading(false);
      setDownloadProgress({ percent: 100, bytesPerSecond: 0, total: 0, transferred: 0 });
      setIsUpdateReady(true);
    });

    window.electron.updater.onUpdateNotAvailable(() => {
      console.log("Update not available event received");
      setUpdateInfo({ hasUpdate: false });
      setIsDownloading(false);
      setIsUpdateReady(false);
    });

    window.electron.updater.onUpdateError((message) => {
      console.error("Update error event received:", message);
      setError(message);
      setIsDownloading(false);
    });

    window.electron.updater.onDownloadProgress((progress) => {
      console.log(`Download progress: ${progress.percent}%`);
      setIsDownloading(true);
      setDownloadProgress(progress);
    });
  }, []);

  const checkForUpdates = async () => {
    if (!window.electron?.updater) {
      setError("Electron updater not available");
      return;
    }

    try {
      setIsChecking(true);
      setError(null);
      const info = await window.electron.updater.checkForUpdates();
      setUpdateInfo(info);
      console.log("Manual update check:", info);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Manual update check failed:", message);
    } finally {
      setIsChecking(false);
    }
  };

  const quitAndInstall = async () => {
    if (!window.electron?.updater) {
      setError("Electron updater not available");
      return;
    }

    if (!isUpdateReady) {
      setError("Update is not ready to install. Please wait for download to complete.");
      return;
    }

    try {
      console.log("Calling quitAndInstall...");
      await window.electron.updater.quitAndInstall();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error";
      setError(message);
      console.error("Quit and install failed:", message);
    }
  };

  return {
    updateInfo,
    isDownloading,
    downloadProgress,
    isChecking,
    error,
    isUpdateReady,
    checkForUpdates,
    quitAndInstall,
  };
}
