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

  // Sync
  getSyncStatus:  ()       => ipcRenderer.invoke('sync:status'),
  syncNow:        ()       => ipcRenderer.invoke('sync:now'),

  // App
  getVersion:     ()       => ipcRenderer.invoke('app:version'),
  openSharedDir:  ()       => ipcRenderer.invoke('app:openSharedDir'),

  // Events from main → renderer
  onSyncStatus:   (cb) => ipcRenderer.on('sync:statusChanged', (_e, s) => cb(s)),
  onProductsChanged: (cb) => ipcRenderer.on('products:changed', (_e, items) => cb(items)),
});
