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

// ── IPC ──────────────────────────────────────────────────────────────────────
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

  mainWindow.webContents.once('did-finish-load', () => {
    closeSplash();
    if (store.get('windowMaximized')) {
      mainWindow.maximize();
    }
    mainWindow.show();
    mainWindow.focus();
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
