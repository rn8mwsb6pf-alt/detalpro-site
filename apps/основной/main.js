'use strict';

const {
  app, BrowserWindow, Menu, Tray, shell,
  ipcMain, nativeImage, screen, dialog
} = require('electron');
const path = require('path');
const fs   = require('fs');
const Store = require('electron-store');

// ── Constants ────────────────────────────────────────────────────────────────
const APP_FILE   = path.join(__dirname, 'app', 'index.html');
const APP_REMOTE = 'https://detalpro.netlify.app'; // только для "Открыть в браузере"
const APP_TITLE  = 'Дорожный комплекс Гараж';
const IS_DEV      = process.argv.includes('--dev');

// ── Shared data directory (same as warehouse-app) ────────────────────────────
const SHARED_DIR      = path.join(app.getPath('appData'), 'GarageShared');
const PRODUCTS_FILE   = path.join(SHARED_DIR, 'products.json');
const MOVEMENTS_FILE  = path.join(SHARED_DIR, 'movements.json');
const TRANSFERS_FILE  = path.join(SHARED_DIR, 'transfers.json');
const CONFIG_FILE     = path.join(SHARED_DIR, 'sync-config.json');
const USERS_FILE      = path.join(SHARED_DIR, 'users.json');

if (!fs.existsSync(SHARED_DIR)) fs.mkdirSync(SHARED_DIR, { recursive: true });

const DEFAULT_USERS = [
  { id: 1, username: 'admin',     password: 'admin',    role: 'creator',    name: 'Администратор', canEdit: true,  audit: true  },
  { id: 2, username: 'boss',      password: 'boss1234', role: 'boss',       name: 'Директор',      canEdit: true,  audit: true  },
  { id: 3, username: 'sklad',     password: '1234',     role: 'warehouse',  name: 'Кладовщик',     canEdit: true,  audit: false },
  { id: 4, username: 'manager',   password: '1234',     role: 'manager',    name: 'Менеджер',      canEdit: false, audit: false },
  { id: 5, username: 'buhgalter', password: '1234',     role: 'accountant', name: 'Бухгалтер',     canEdit: false, audit: true  },
];

function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) return DEFAULT_USERS;
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch { return DEFAULT_USERS; }
}
function writeUsers(u) { fs.writeFileSync(USERS_FILE, JSON.stringify(u, null, 2), 'utf8'); }

function readProducts() {
  try { return fs.existsSync(PRODUCTS_FILE) ? JSON.parse(fs.readFileSync(PRODUCTS_FILE, 'utf8')) : []; }
  catch { return []; }
}
function writeProducts(items) { fs.writeFileSync(PRODUCTS_FILE, JSON.stringify(items, null, 2), 'utf8'); }

function readMovements(limit = 500) {
  try { return (fs.existsSync(MOVEMENTS_FILE) ? JSON.parse(fs.readFileSync(MOVEMENTS_FILE, 'utf8')) : []).slice(0, limit); }
  catch { return []; }
}
function readTransfers() {
  try { return fs.existsSync(TRANSFERS_FILE) ? JSON.parse(fs.readFileSync(TRANSFERS_FILE, 'utf8')) : []; }
  catch { return []; }
}
function readConfig() {
  try { return fs.existsSync(CONFIG_FILE) ? JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8')) : { apiKey: '', binId: '' }; }
  catch { return { apiKey: '', binId: '' }; }
}

// ── IPC handlers ──────────────────────────────────────────────────────────────
ipcMain.handle('users:validate', (_e, { username, password }) => {
  const user = readUsers().find(u => u.username === username && u.password === password);
  if (!user) return { ok: false, error: 'Неверный логин или пароль' };
  const { password: _pw, ...safe } = user;
  return { ok: true, user: safe };
});
ipcMain.handle('users:get',  () => readUsers().map(({ password: _pw, ...u }) => u));
ipcMain.handle('users:save', async (_e, users) => {
  writeUsers(users);
  const pushResult = await pushUsersToCloud(users);
  mainWindow?.webContents.send('users:synced', { ok: pushResult.ok });
  return { ok: true, synced: pushResult.ok };
});
ipcMain.handle('users:push',  async () => pushUsersToCloud(readUsers()));
ipcMain.handle('users:pull',  async () => pullUsersFromCloud());
ipcMain.handle('users:getBinId', () => { const c = readConfig(); return { usersBinId: c.usersBinId || null }; });
ipcMain.handle('users:createBin', async (_e, apiKey) => {
  const initial = { users: readUsers(), updatedAt: new Date().toISOString() };
  try {
    const res = await httpRequest({
      hostname: 'api.jsonbin.io', path: '/v3/b', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': apiKey, 'X-Bin-Name': 'garage-users', 'X-Bin-Private': 'false' },
    }, JSON.stringify(initial));
    if ((res.status === 200 || res.status === 201) && res.data?.metadata?.id) {
      const usersBinId = res.data.metadata.id;
      const cfg = readConfig();
      const newCfg = { ...cfg, usersBinId };
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(newCfg, null, 2), 'utf8');
      return { ok: true, usersBinId };
    }
    return { ok: false, error: `HTTP ${res.status}: ${JSON.stringify(res.data)}` };
  } catch (e) { return { ok: false, error: e.message }; }
});

ipcMain.handle('products:get', () => readProducts());
ipcMain.handle('products:update', (_e, item) => {
  const all = readProducts();
  const idx = all.findIndex(p => p.id == item.id);
  if (idx < 0) return { ok: false, error: 'Не найден' };
  all[idx] = { ...all[idx], ...item, updatedAt: new Date().toISOString() };
  writeProducts(all);
  mainWindow?.webContents.send('products:changed', all);
  return { ok: true };
});
ipcMain.handle('products:delete', (_e, id) => {
  const filtered = readProducts().filter(p => p.id != id);
  writeProducts(filtered);
  mainWindow?.webContents.send('products:changed', filtered);
  return { ok: true };
});

ipcMain.handle('movements:get', (_e, limit = 500) => readMovements(limit));
ipcMain.handle('transfers:get', () => readTransfers());
ipcMain.handle('sync:getConfig', () => readConfig());
ipcMain.handle('app:version', () => app.getVersion());
ipcMain.handle('app:openSharedDir', () => { shell.openPath(SHARED_DIR); return true; });

// Cloud push / pull
const https = require('https');
function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', c => { data += c; });
      res.on('end', () => {
        try { resolve({ status: res.statusCode, data: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(body);
    req.end();
  });
}
async function pushUsersToCloud(users) {
  const cfg = readConfig();
  if (!cfg.apiKey || !cfg.usersBinId) return { ok: false, error: 'Нет хранилища пользователей' };
  try {
    const res = await httpRequest({
      hostname: 'api.jsonbin.io', path: `/v3/b/${cfg.usersBinId}`, method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': cfg.apiKey, 'X-Bin-Versioning': 'false' },
    }, JSON.stringify({ users, updatedAt: new Date().toISOString() }));
    return res.status === 200 ? { ok: true } : { ok: false, error: `HTTP ${res.status}` };
  } catch (e) { return { ok: false, error: e.message }; }
}

async function pullUsersFromCloud() {
  const cfg = readConfig();
  if (!cfg.usersBinId) return { ok: false, error: 'Нет хранилища пользователей' };
  try {
    const headers = {};
    if (cfg.apiKey) headers['X-Master-Key'] = cfg.apiKey;
    const res = await httpRequest({
      hostname: 'api.jsonbin.io', path: `/v3/b/${cfg.usersBinId}/latest`, method: 'GET', headers,
    });
    if (res.status === 200 && res.data?.record?.users) {
      const cloudUsers = res.data.record.users;
      writeUsers(cloudUsers);
      mainWindow?.webContents.send('users:changed', cloudUsers.map(({ password: _p, ...u }) => u));
      return { ok: true, count: cloudUsers.length };
    }
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (e) { return { ok: false, error: e.message }; }
}

ipcMain.handle('sync:pushNow', async () => {
  const { apiKey, binId } = readConfig();
  if (!apiKey || !binId) return { ok: false, error: 'Не настроена синхронизация' };
  const items = readProducts();
  const body = JSON.stringify({ products: items, updatedAt: new Date().toISOString(), count: items.length });
  try {
    const res = await httpRequest({
      hostname: 'api.jsonbin.io', path: `/v3/b/${binId}`, method: 'PUT',
      headers: { 'Content-Type': 'application/json', 'X-Master-Key': apiKey, 'X-Bin-Versioning': 'false' },
    }, body);
    if (res.status === 200) { mainWindow?.webContents.send('sync:ok', { count: items.length, at: new Date().toISOString() }); return { ok: true }; }
    mainWindow?.webContents.send('sync:error', `HTTP ${res.status}`);
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (e) {
    mainWindow?.webContents.send('sync:error', e.message);
    return { ok: false, error: e.message };
  }
});

function readSharedProducts() { return readProducts(); }

async function injectProductsIntoPage(win) {
  // Not needed — new dashboard reads via IPC
}
const ASSETS_DIR  = path.join(__dirname, 'assets');
const ICON_ICO    = path.join(ASSETS_DIR, 'icon.ico');
const ICON_PNG    = path.join(ASSETS_DIR, 'icon.png');
const TRAY_PNG    = path.join(ASSETS_DIR, 'tray-icon.png');
const SPLASH_HTML = path.join(__dirname, 'splash.html');

// Use .ico on Windows, .png fallback elsewhere
const WIN_ICON = fs.existsSync(ICON_ICO) ? ICON_ICO
               : fs.existsSync(ICON_PNG) ? ICON_PNG
               : undefined;

// ── Persistent state ─────────────────────────────────────────────────────────
const store = new Store({
  defaults: {
    windowBounds:   { width: 1280, height: 800 },
    windowMaximized: false,
    trayNoticeSeen:  false,
  }
});

// ── Single-instance lock ──────────────────────────────────────────────────────
if (!app.requestSingleInstanceLock()) {
  app.quit();
  process.exit(0);
}

// ── IPC (legacy) ──────────────────────────────────────────────────────────────
ipcMain.handle('get-version', () => app.getVersion());

// ── Module-level handles ──────────────────────────────────────────────────────
let mainWindow   = null;
let splashWindow = null;
let tray         = null;
let isQuitting   = false;

// ── Splash window ─────────────────────────────────────────────────────────────
function createSplash() {
  splashWindow = new BrowserWindow({
    width:        480,
    height:       300,
    frame:        false,
    transparent:  true,
    resizable:    false,
    skipTaskbar:  true,
    alwaysOnTop:  true,
    icon:         WIN_ICON,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
  });
  splashWindow.loadFile(SPLASH_HTML);
  splashWindow.center();
}

function closeSplash() {
  if (splashWindow && !splashWindow.isDestroyed()) {
    splashWindow.destroy();
    splashWindow = null;
  }
}

// ── Main window ───────────────────────────────────────────────────────────────
function createMainWindow() {
  const saved   = store.get('windowBounds');
  const display = screen.getPrimaryDisplay().workAreaSize;
  const bounds  = {
    width:  Math.min(saved.width,  display.width),
    height: Math.min(saved.height, display.height),
  };

  mainWindow = new BrowserWindow({
    ...bounds,
    minWidth:        900,
    minHeight:       600,
    title:           APP_TITLE,
    icon:            WIN_ICON,
    show:            false,
    backgroundColor: '#0d0f10',
    webPreferences: {
      preload:          path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          true,
    },
  });

  if (store.get('windowMaximized')) mainWindow.maximize();

  // ── Navigation policy ──────────────────────────────────────────────────────
  // file:// stays inside the app; http/https goes to the system browser.
  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // Handle target="_blank" and window.open() calls.
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.startsWith('file://')) shell.openExternal(url);
    return { action: 'deny' };
  });

  // ── Page load sequence ─────────────────────────────────────────────────────
  mainWindow.loadFile(APP_FILE);

  mainWindow.webContents.once('did-finish-load', async () => {
    closeSplash();
    if (store.get('windowMaximized')) mainWindow.maximize();
    mainWindow.show();
    mainWindow.focus();
  });

  // Watch shared products file — notify renderer
  let watchDebounce = null;
  fs.watch(SHARED_DIR, (event, filename) => {
    if (filename !== 'products.json') return;
    clearTimeout(watchDebounce);
    watchDebounce = setTimeout(() => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('products:changed', readProducts());
      }
    }, 500);
  });

  // ── Error page ─────────────────────────────────────────────────────────────
  // For a local file, failures are rare (missing file). Reload it directly.
  mainWindow.webContents.on('did-fail-load', () => {
    closeSplash();
    mainWindow.loadFile(APP_FILE);
    mainWindow.show();
  });

  // ── Window state persistence ───────────────────────────────────────────────
  const saveBounds = () => {
    if (!mainWindow.isMaximized() && !mainWindow.isMinimized()) {
      store.set('windowBounds', mainWindow.getBounds());
    }
    store.set('windowMaximized', mainWindow.isMaximized());
  };
  mainWindow.on('resize', saveBounds);
  mainWindow.on('move',   saveBounds);

  // ── Minimize-to-tray ───────────────────────────────────────────────────────
  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
      if (tray && !store.get('trayNoticeSeen')) {
        tray.displayBalloon({
          title:    APP_TITLE,
          content:  'Приложение свёрнуто в трей. Дважды щёлкните по иконке, чтобы открыть.',
          iconType: 'info',
        });
        store.set('trayNoticeSeen', true);
      }
    }
  });

  if (IS_DEV) {
    mainWindow.webContents.openDevTools({ mode: 'detach' });
  }
}

// ── System tray ───────────────────────────────────────────────────────────────
function createTray() {
  if (!fs.existsSync(TRAY_PNG) && !WIN_ICON) return;

  const iconPath = fs.existsSync(TRAY_PNG) ? TRAY_PNG : WIN_ICON;
  const img = nativeImage.createFromPath(iconPath).resize({ width: 16, height: 16 });
  tray = new Tray(img);
  tray.setToolTip(APP_TITLE);

  const menu = Menu.buildFromTemplate([
    {
      label: 'Открыть Дорожный комплекс Гараж',
      click: () => { mainWindow.show(); mainWindow.focus(); }
    },
    { type: 'separator' },
    {
      label: 'Выход',
      click: () => { isQuitting = true; app.quit(); }
    }
  ]);
  tray.setContextMenu(menu);
  tray.on('double-click', () => { mainWindow.show(); mainWindow.focus(); });
}

// ── App menu ──────────────────────────────────────────────────────────────────
function buildMenu() {
  const template = [
    {
      label: 'Файл',
      submenu: [
        {
          label:       'Выход',
          accelerator: 'Alt+F4',
          click:       () => { isQuitting = true; app.quit(); }
        }
      ]
    },
    {
      label: 'Вид',
      submenu: [
        { role: 'reload',          label: 'Обновить страницу' },
        { role: 'forceReload',     label: 'Принудительное обновление' },
        { type: 'separator' },
        { role: 'resetZoom',       label: 'Исходный масштаб' },
        { role: 'zoomIn',          label: 'Увеличить',    accelerator: 'CmdOrCtrl+=' },
        { role: 'zoomOut',         label: 'Уменьшить',   accelerator: 'CmdOrCtrl+-' },
        { type: 'separator' },
        { role: 'togglefullscreen', label: 'Полный экран' },
        ...(IS_DEV ? [
          { type: 'separator' },
          { role: 'toggleDevTools', label: 'Инструменты разработчика' }
        ] : [])
      ]
    },
    {
      label: 'Справка',
      submenu: [
        {
          label: 'О программе',
          click: () => {
            dialog.showMessageBox(mainWindow, {
              type:    'info',
              title:   'О программе',
              message: APP_TITLE,
              detail:  `Версия: ${app.getVersion()}\nИнтернет-магазин автозапчастей\n${APP_REMOTE}`,
              icon:    WIN_ICON ? nativeImage.createFromPath(WIN_ICON) : undefined,
              buttons: ['OK'],
            });
          }
        },
        {
          label: 'Открыть в браузере',
          click: () => shell.openExternal(APP_REMOTE)
        }
      ]
    }
  ];

  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

// ── App lifecycle ─────────────────────────────────────────────────────────────
app.whenReady().then(() => {
  buildMenu();
  createSplash();
  createMainWindow();
  createTray();
});

app.on('second-instance', () => {
  if (mainWindow) {
    if (mainWindow.isMinimized() || !mainWindow.isVisible()) mainWindow.show();
    mainWindow.focus();
  }
});

// Keep alive while tray is active
app.on('window-all-closed', (event) => {
  if (!isQuitting) event.preventDefault();
});

app.on('before-quit', () => {
  isQuitting = true;
});
