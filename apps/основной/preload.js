'use strict';

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('adminAPI', {
  isElectron: true,

  // Auth — основной метод через сайт ДЕТАЛЬПРО
  validateWithSite: (email, password)  => ipcRenderer.invoke('users:validateWithSite', { email, password }),
  // Auth — локальные пользователи (запасной)
  validateUser:     (username, password) => ipcRenderer.invoke('users:validate', { username, password }),

  getUsers:       ()       => ipcRenderer.invoke('users:get'),
  saveUsers:      (users)  => ipcRenderer.invoke('users:save', users),
  pushUsers:      ()       => ipcRenderer.invoke('users:push'),
  pullUsers:      ()       => ipcRenderer.invoke('users:pull'),
  createUsersBin: (apiKey) => ipcRenderer.invoke('users:createBin', apiKey),
  getUsersBinId:  ()       => ipcRenderer.invoke('users:getBinId'),

  // Products (read from GarageShared)
  getProducts:   ()         => ipcRenderer.invoke('products:get'),
  updateProduct: (item)     => ipcRenderer.invoke('products:update', item),
  deleteProduct: (id)       => ipcRenderer.invoke('products:delete', id),

  // Movements / audit
  getMovements:  (limit)    => ipcRenderer.invoke('movements:get', limit),

  // Transfers
  getTransfers:  ()         => ipcRenderer.invoke('transfers:get'),

  // Sync config + site URL
  getConfig:     ()         => ipcRenderer.invoke('sync:getConfig'),
  pushNow:       ()         => ipcRenderer.invoke('sync:pushNow'),
  getSiteUrl:    ()         => ipcRenderer.invoke('sync:getSiteUrl'),
  setSiteUrl:    (url)      => ipcRenderer.invoke('sync:setSiteUrl', url),
  pingSite:      ()         => ipcRenderer.invoke('sync:pingsite'),

  // App
  getVersion:    ()         => ipcRenderer.invoke('app:version'),
  openSharedDir: ()         => ipcRenderer.invoke('app:openSharedDir'),

  // Events main → renderer
  onProductsChanged: (cb)  => ipcRenderer.on('products:changed', (_e, items) => cb(items)),
  onUsersChanged:    (cb)  => ipcRenderer.on('users:changed',    (_e, u)     => cb(u)),
  onUsersSynced:     (cb)  => ipcRenderer.on('users:synced',     (_e, d)     => cb(d)),
  onSyncOk:   (cb)         => ipcRenderer.on('sync:ok',    (_e, d) => cb(d)),
  onSyncError:(cb)          => ipcRenderer.on('sync:error', (_e, e) => cb(e)),
});
