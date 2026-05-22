'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('adminAPI', {
  isElectron: true,

  // Auth
  validateUser: (username, password) => ipcRenderer.invoke('users:validate', { username, password }),
  getUsers:     ()        => ipcRenderer.invoke('users:get'),
  saveUsers:    (users)   => ipcRenderer.invoke('users:save', users),

  // Products (read from GarageShared)
  getProducts:   ()         => ipcRenderer.invoke('products:get'),
  updateProduct: (item)     => ipcRenderer.invoke('products:update', item),
  deleteProduct: (id)       => ipcRenderer.invoke('products:delete', id),

  // Movements / audit
  getMovements:  (limit)    => ipcRenderer.invoke('movements:get', limit),

  // Transfers
  getTransfers:  ()         => ipcRenderer.invoke('transfers:get'),

  // Sync config
  getConfig:     ()         => ipcRenderer.invoke('sync:getConfig'),
  pushNow:       ()         => ipcRenderer.invoke('sync:pushNow'),

  // App
  getVersion:    ()         => ipcRenderer.invoke('app:version'),
  openSharedDir: ()         => ipcRenderer.invoke('app:openSharedDir'),

  // Events main → renderer
  onProductsChanged: (cb)  => ipcRenderer.on('products:changed', (_e, items) => cb(items)),
  onSyncOk:   (cb)         => ipcRenderer.on('sync:ok',    (_e, d) => cb(d)),
  onSyncError:(cb)          => ipcRenderer.on('sync:error', (_e, e) => cb(e)),
});
