'use strict';

const {
  app, BrowserWindow, ipcMain, dialog, shell, Menu
} = require('electron');
const path = require('path');
const fs   = require('fs');
const os   = require('os');
const Store = require('electron-store');

// ── Shared data directory (accessible by both apps) ───────────────────────────
const SHARED_DIR  = path.join(app.getPath('appData'), 'GarageShared');
const PRODUCTS_FILE = path.join(SHARED_DIR, 'products.json');
const IS_DEV = process.argv.includes('--dev');

if (!fs.existsSync(SHARED_DIR)) fs.mkdirSync(SHARED_DIR, { recursive: true });

// ── Persistent window state ───────────────────────────────────────────────────
const store = new Store({
  defaults: { windowBounds: { width: 1200, height: 750 }, windowMaximized: false }
});

// ── Single-instance lock ──────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) { app.quit(); process.exit(0); }

let win = null;

// ── Product DB helpers ────────────────────────────────────────────────────────
function readProducts() {
  try {
    if (!fs.existsSync(PRODUCTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8'));
  } catch { return []; }
}

function writeProducts(items) {
  fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(items, null, 2), 'utf8');
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.handle('products:get', () => readProducts());

ipcMain.handle('products:save', (_e, items) => {
  writeProducts(items);
  win?.webContents.send('products:changed', items);
  return { ok: true, count: items.length };
});

ipcMain.handle('products:add', (_e, item) => {
  const all = readProducts();
  const newItem = {
    ...item,
    id: Date.now() + Math.random(),
    source: 'warehouse',
    importedAt: new Date().toISOString(),
    updatedAt:  new Date().toISOString(),
  };
  // Upsert by article+brand
  const key = ((item.article || '') + '|' + (item.brand || '')).toUpperCase();
  const idx = all.findIndex(p =>
    ((p.article || '') + '|' + (p.brand || '')).toUpperCase() === key
  );
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...item, updatedAt: new Date().toISOString() };
  } else {
    all.push(newItem);
  }
  writeProducts(all);
  win?.webContents.send('products:changed', all);
  return { ok: true, item: idx >= 0 ? all[idx] : newItem };
});

ipcMain.handle('products:update', (_e, item) => {
  const all = readProducts();
  const idx = all.findIndex(p => p.id == item.id);
  if (idx >= 0) {
    all[idx] = { ...all[idx], ...item, updatedAt: new Date().toISOString() };
    writeProducts(all);
    win?.webContents.send('products:changed', all);
    return { ok: true };
  }
  return { ok: false, error: 'Не найден' };
});

ipcMain.handle('products:delete', (_e, id) => {
  const all = readProducts().filter(p => p.id != id);
  writeProducts(all);
  win?.webContents.send('products:changed', all);
  return { ok: true };
});

ipcMain.handle('products:importCSV', async () => {
  const { filePaths } = await dialog.showOpenDialog(win, {
    title: 'Импорт CSV',
    filters: [{ name: 'CSV / JSON', extensions: ['csv', 'json'] }],
    properties: ['openFile'],
  });
  if (!filePaths.length) return { ok: false };
  const raw = fs.readFileSync(filePaths[0], 'utf8');
  let items = [];

  if (filePaths[0].endsWith('.json')) {
    try { items = JSON.parse(raw); } catch { return { ok: false, error: 'Неверный JSON' }; }
  } else {
    // Simple CSV parser: first row = headers
    const lines = raw.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(';').map(h => h.trim().toLowerCase()
      .replace('артикул','article').replace('бренд','brand').replace('производитель','brand')
      .replace('наименование','name').replace('название','name')
      .replace('цена розн','price_retail').replace('цена опт','price_wholesale')
      .replace('количество','stock').replace('кол-во','stock')
      .replace('дней доставки','delivery_days')
    );
    items = lines.slice(1).map(line => {
      const vals = line.split(';');
      const obj = {};
      headers.forEach((h, i) => { obj[h] = vals[i]?.trim() || ''; });
      obj.price_retail    = parseFloat(obj.price_retail)    || 0;
      obj.price_wholesale = parseFloat(obj.price_wholesale) || 0;
      obj.stock           = parseInt(obj.stock)             || 0;
      obj.delivery_days   = parseInt(obj.delivery_days)     || 0;
      return obj;
    }).filter(it => it.article);
  }

  const all = readProducts();
  const map = {};
  all.forEach(it => { map[((it.article||'')+'|'+(it.brand||'')).toUpperCase()] = it; });
  let added = 0, updated = 0;
  items.forEach(it => {
    const key = ((it.article||'')+'|'+(it.brand||'')).toUpperCase();
    if (map[key]) { Object.assign(map[key], it, { source:'warehouse', updatedAt: new Date().toISOString() }); updated++; }
    else { map[key] = { ...it, id: Date.now()+Math.random(), source:'warehouse', importedAt: new Date().toISOString() }; added++; }
  });
  const merged = Object.values(map);
  writeProducts(merged);
  win?.webContents.send('products:changed', merged);
  return { ok: true, added, updated, total: merged.length };
});

ipcMain.handle('sync:status', () => {
  const products = readProducts();
  return { count: products.length, file: PRODUCTS_FILE, lastModified: fs.existsSync(PRODUCTS_FILE) ? fs.statSync(PRODUCTS_FILE).mtime : null };
});

ipcMain.handle('sync:now', () => {
  // In a real setup this would POST to an API. For now, just report the file path.
  return { ok: true, file: PRODUCTS_FILE, count: readProducts().length };
});

ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:openSharedDir', () => { shell.openPath(SHARED_DIR); return true; });

// ── Window ────────────────────────────────────────────────────────────────────
function createWindow() {
  const saved = store.get('windowBounds');
  win = new BrowserWindow({
    ...saved,
    minWidth: 900, minHeight: 600,
    title: 'Склад — Дорожный комплекс Гараж',
    backgroundColor: '#0d0f10',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });

  if (store.get('windowMaximized')) win.maximize();
  win.loadFile(path.join(__dirname, 'index.html'));
  if (IS_DEV) win.webContents.openDevTools({ mode: 'right' });

  const save = () => {
    if (!win.isMaximized() && !win.isMinimized()) store.set('windowBounds', win.getBounds());
    store.set('windowMaximized', win.isMaximized());
  };
  win.on('resize', save);
  win.on('move',   save);
  win.on('closed', () => { win = null; });
}

Menu.setApplicationMenu(Menu.buildFromTemplate([
  { label: 'Файл', submenu: [{ label: 'Выход', accelerator: 'Alt+F4', click: () => app.quit() }] },
  { label: 'Вид',  submenu: [
    { role: 'reload', label: 'Обновить' },
    { type: 'separator' },
    { role: 'zoomIn', label: 'Увеличить' },
    { role: 'zoomOut', label: 'Уменьшить' },
    { role: 'resetZoom', label: 'Исходный масштаб' },
    { type: 'separator' },
    { role: 'togglefullscreen', label: 'Полный экран' },
    ...(IS_DEV ? [{ role: 'toggleDevTools', label: 'DevTools' }] : []),
  ]},
  { label: 'Данные', submenu: [
    { label: 'Открыть папку с данными', click: () => shell.openPath(SHARED_DIR) },
  ]},
]));

app.whenReady().then(createWindow);
app.on('second-instance', () => { if(win){ if(!win.isVisible()) win.show(); win.focus(); } });
app.on('window-all-closed', () => app.quit());
