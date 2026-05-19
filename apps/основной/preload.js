'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Expose a minimal, typed API to the renderer.
// The hosted site can check window.electronBridge?.isElectron to detect the desktop context.
contextBridge.exposeInMainWorld('electronBridge', {
  isElectron: true,
  getVersion: () => ipcRenderer.invoke('get-version'),
});
