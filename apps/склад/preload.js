'use strict';
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('warehouseAPI', {
  // Products
  getProducts:    ()           => ipcRenderer.invoke('products:get'),
  saveProducts:   (items)      => ipcRenderer.invoke('products:save', items),
  addProduct:     (item, user) => ipcRenderer.invoke('products:add',    { item, user }),
  updateProduct:  (item, user) => ipcRenderer.invoke('products:update', { item, user }),
  deleteProduct:  (id,   user) => ipcRenderer.invoke('products:delete', { id,  user }),
  moveProduct:    (opts)       => ipcRenderer.invoke('products:move', opts),
  importFile:     ()           => ipcRenderer.invoke('products:importFile'),

  // Audit / movements
  getMovements:   (limit) => ipcRenderer.invoke('movements:get', limit),
  clearMovements: ()      => ipcRenderer.invoke('movements:clear'),

  // Cloud sync
  getConfig:  ()       => ipcRenderer.invoke('sync:getConfig'),
  saveConfig: (cfg)    => ipcRenderer.invoke('sync:saveConfig', cfg),
  createBin:  (apiKey) => ipcRenderer.invoke('sync:createBin', apiKey),
  pushNow:    ()       => ipcRenderer.invoke('sync:pushNow'),

  // App
  getVersion:    () => ipcRenderer.invoke('app:version'),
  openSharedDir: () => ipcRenderer.invoke('app:openSharedDir'),

  // Transfer documents
  getTransfers:   ()        => ipcRenderer.invoke('transfers:get'),
  saveTransfer:   (doc)     => ipcRenderer.invoke('transfers:save', doc),
  postTransfer:   (id, user)=> ipcRenderer.invoke('transfers:post', { id, user }),
  deleteTransfer: (id)      => ipcRenderer.invoke('transfers:delete', id),

  // Events main → renderer
  onProductsChanged: (cb) => ipcRenderer.on('products:changed', (_e, items) => cb(items)),
  onSyncOk:    (cb) => ipcRenderer.on('sync:ok',    (_e, d) => cb(d)),
  onSyncError: (cb) => ipcRenderer.on('sync:error', (_e, e) => cb(e)),
});
