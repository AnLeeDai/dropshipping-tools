import { contextBridge, ipcRenderer } from "electron";

function registerListener<T>(channel: string, callback: (payload: T) => void) {
  const listener = (_event: Electron.IpcRendererEvent, payload: T) => callback(payload);
  ipcRenderer.on(channel, listener);

  return () => {
    ipcRenderer.removeListener(channel, listener);
  };
}

contextBridge.exposeInMainWorld("electron", {
  updater: {
    checkForUpdates: () => ipcRenderer.invoke("updater:check-for-updates"),
    quitAndInstall: () => ipcRenderer.invoke("updater:quit-and-install"),
    getVersion: () => ipcRenderer.invoke("updater:get-version"),
    getState: () => ipcRenderer.invoke("updater:get-state"),
    onUpdateAvailable: (callback: (data: unknown) => void) =>
      registerListener("update:available", callback),
    onUpdateDownloaded: (callback: (data: unknown) => void) =>
      registerListener("update:downloaded", callback),
    onUpdateNotAvailable: (callback: (data: unknown) => void) =>
      registerListener("update:not-available", callback),
    onUpdateError: (callback: (data: unknown) => void) =>
      registerListener("update:error", callback),
  },
});
