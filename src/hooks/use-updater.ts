import * as React from "react";
import { currentReleaseMetadata } from "@/config/release-config";

interface UpdateInfo {
  hasUpdate: boolean;
  currentVersion: string;
  newVersion?: string;
  releaseName?: string;
  releaseNotes?: string;
  releaseDate?: string | null;
  canAutoUpdate: boolean;
  isUpdateDeferred: boolean;
  deferredReason: string | null;
  deferredUntil: string | null;
}

interface UpdaterSnapshot extends UpdateInfo {
  isDownloading: boolean;
  isUpdateReady: boolean;
  error: string | null;
  lastCheckedAt: string | null;
}

interface UpdaterContextValue {
  updateInfo: UpdateInfo;
  isDownloading: boolean;
  isChecking: boolean;
  error: string | null;
  isUpdateReady: boolean;
  isUpdateDeferred: boolean;
  deferredReason: string | null;
  deferredUntil: string | null;
  lastCheckedAt: string | null;
  checkForUpdates: () => Promise<UpdaterSnapshot>;
  quitAndInstall: () => Promise<void>;
}

declare global {
  interface Window {
    electron?: {
      updater: {
        checkForUpdates: () => Promise<UpdaterSnapshot>;
        quitAndInstall: () => Promise<void>;
        getVersion: () => Promise<string>;
        getState: () => Promise<UpdaterSnapshot>;
        onUpdateAvailable: (callback: (data: UpdaterSnapshot) => void) => () => void;
        onUpdateDownloaded: (callback: (data: UpdaterSnapshot) => void) => () => void;
        onUpdateNotAvailable: (callback: (data: UpdaterSnapshot) => void) => () => void;
        onUpdateError: (callback: (data: UpdaterSnapshot) => void) => () => void;
      };
    };
  }
}

const initialSnapshot: UpdaterSnapshot = {
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

const UpdaterContext = React.createContext<UpdaterContextValue | null>(null);

export function UpdaterProvider({ children }: { children: React.ReactNode }) {
  const [snapshot, setSnapshot] = React.useState<UpdaterSnapshot>(initialSnapshot);
  const [isChecking, setIsChecking] = React.useState(false);

  React.useEffect(() => {
    if (!window.electron?.updater) {
      return;
    }

    let isMounted = true;

    const syncInitialState = async () => {
      try {
        const nextSnapshot = await window.electron!.updater.getState();
        if (isMounted) {
          setSnapshot(nextSnapshot);
        }
      } catch (error) {
        if (!isMounted) {
          return;
        }

        const message = error instanceof Error ? error.message : "Unknown update error";
        setSnapshot((current) => ({
          ...current,
          error: message,
        }));
      }
    };

    void syncInitialState();

    const unsubscribeAvailable = window.electron.updater.onUpdateAvailable((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });
    const unsubscribeDownloaded = window.electron.updater.onUpdateDownloaded((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });
    const unsubscribeNotAvailable = window.electron.updater.onUpdateNotAvailable((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });
    const unsubscribeError = window.electron.updater.onUpdateError((nextSnapshot) => {
      setSnapshot(nextSnapshot);
    });

    return () => {
      isMounted = false;
      unsubscribeAvailable();
      unsubscribeDownloaded();
      unsubscribeNotAvailable();
      unsubscribeError();
    };
  }, []);

  const checkForUpdates = async () => {
    if (!window.electron?.updater) {
      throw new Error("Updater service is not available.");
    }

    try {
      setIsChecking(true);
      const nextSnapshot = await window.electron.updater.checkForUpdates();
      setSnapshot(nextSnapshot);
      return nextSnapshot;
    } finally {
      setIsChecking(false);
    }
  };

  const quitAndInstall = async () => {
    if (!window.electron?.updater) {
      throw new Error("Updater service is not available.");
    }

    await window.electron.updater.quitAndInstall();
  };

  const value: UpdaterContextValue = {
    updateInfo: {
      hasUpdate: snapshot.hasUpdate,
      currentVersion: snapshot.currentVersion,
      newVersion: snapshot.newVersion,
      releaseName: snapshot.releaseName,
      releaseNotes: snapshot.releaseNotes,
      releaseDate: snapshot.releaseDate,
      canAutoUpdate: snapshot.canAutoUpdate,
      isUpdateDeferred: snapshot.isUpdateDeferred,
      deferredReason: snapshot.deferredReason,
      deferredUntil: snapshot.deferredUntil,
    },
    isDownloading: snapshot.isDownloading,
    isChecking,
    error: snapshot.error,
    isUpdateReady: snapshot.isUpdateReady,
    isUpdateDeferred: snapshot.isUpdateDeferred,
    deferredReason: snapshot.deferredReason,
    deferredUntil: snapshot.deferredUntil,
    lastCheckedAt: snapshot.lastCheckedAt,
    checkForUpdates,
    quitAndInstall,
  };

  return React.createElement(UpdaterContext.Provider, { value }, children);
}

export function useUpdater() {
  const context = React.useContext(UpdaterContext);

  if (!context) {
    throw new Error("useUpdater must be used inside UpdaterProvider.");
  }

  return context;
}
