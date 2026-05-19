'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('warehouseAPI', {
  // Products
  getProducts:    ()       => ipcRenderer.invoke('products:get'),
  saveProducts:   (items)  => ipcRenderer.invoke('products:save', items),
  addProduct:     (item)   => ipcRenderer.invoke('products:add', item),
  updateProduct:  (item)   => ipcRenderer.invoke('products:update', item),
  deleteProduct:  (id)     => ipcRenderer.invoke('products:delete', id),
  importFile:     ()       => ipcRenderer.invoke('products:importFile'),

  // Cloud sync
  getConfig:    ()       => ipcRenderer.invoke('sync:getConfig'),
  saveConfig:   (cfg)    => ipcRenderer.invoke('sync:saveConfig', cfg),
  createBin:    (apiKey) => ipcRenderer.invoke('sync:createBin', apiKey),
  pushNow:      ()       => ipcRenderer.invoke('sync:pushNow'),

  // Status
  getSyncStatus:  ()    => ipcRenderer.invoke('sync:status'),

  // App
  getVersion:     ()    => ipcRenderer.invoke('app:version'),
  openSharedDir:  ()    => ipcRenderer.invoke('app:openSharedDir'),

  // Events main → renderer
  onProductsChanged: (cb) => ipcRenderer.on('products:changed', (_e, items) => cb(items)),
  onSyncOk:    (cb) => ipcRenderer.on('sync:ok',    (_e, d) => cb(d)),
  onSyncError: (cb) => ipcRenderer.on('sync:error', (_e, e) => cb(e)),
});
