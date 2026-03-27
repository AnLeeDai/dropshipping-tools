// See the Electron documentation for details on how to use preload scripts:
// https://www.electronjs.org/docs/latest/tutorial/process-model#preload-scripts

import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  // Updater APIs
  updater: {
    checkForUpdates: () => ipcRenderer.invoke("updater:check-for-updates"),
    quitAndInstall: () => ipcRenderer.invoke("updater:quit-and-install"),
    getVersion: () => ipcRenderer.invoke("updater:get-version"),
    onUpdateAvailable: (callback: (data: unknown) => void) =>
      ipcRenderer.on("update:available", (_, data) => callback(data)),
    onUpdateDownloaded: (callback: () => void) =>
      ipcRenderer.on("update:downloaded", callback),
    onUpdateNotAvailable: (callback: () => void) =>
      ipcRenderer.on("update:not-available", callback),
    onUpdateError: (callback: (message: string) => void) =>
      ipcRenderer.on("update:error", (_, message) => callback(message)),
    onDownloadProgress: (callback: (progress: unknown) => void) =>
      ipcRenderer.on("update:progress", (_, progress) => callback(progress)),
  },
});

