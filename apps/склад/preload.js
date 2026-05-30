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

  // Users / auth
  validateUser:   (username, password) => ipcRenderer.invoke('users:validate', { username, password }),
  getUsers:       ()       => ipcRenderer.invoke('users:get'),
  saveUsers:      (users)  => ipcRenderer.invoke('users:save', users),
  pushUsers:      ()       => ipcRenderer.invoke('users:push'),
  pullUsers:      ()       => ipcRenderer.invoke('users:pull'),
  createUsersBin: (apiKey) => ipcRenderer.invoke('users:createBin', apiKey),
  getUsersBinId:  ()       => ipcRenderer.invoke('users:getBinId'),

  // Events main → renderer
  onProductsChanged: (cb) => ipcRenderer.on('products:changed', (_e, items) => cb(items)),
  onUsersChanged:    (cb) => ipcRenderer.on('users:changed',    (_e, u)     => cb(u)),
  onSyncOk:    (cb) => ipcRenderer.on('sync:ok',    (_e, d) => cb(d)),
  onSyncError: (cb) => ipcRenderer.on('sync:error', (_e, e) => cb(e)),
});
