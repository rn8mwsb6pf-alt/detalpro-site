'use strict';

const {
  app, BrowserWindow, ipcMain, dialog, shell, Menu
} = require('electron');
const path  = require('path');
const fs    = require('fs');
const os    = require('os');
const https = require('https');
const Store = require('electron-store');

// ── Shared data directory (accessible by both apps) ───────────────────────────
const SHARED_DIR      = path.join(app.getPath('appData'), 'GarageShared');
const PRODUCTS_FILE   = path.join(SHARED_DIR, 'products.json');
const MOVEMENTS_FILE  = path.join(SHARED_DIR, 'movements.json');
const CONFIG_FILE     = path.join(SHARED_DIR, 'sync-config.json');
const TRANSFERS_FILE  = path.join(SHARED_DIR, 'transfers.json');
const USERS_FILE      = path.join(SHARED_DIR, 'users.json');
const IS_DEV          = process.argv.includes('--dev');

if (!fs.existsSync(SHARED_DIR)) fs.mkdirSync(SHARED_DIR, { recursive: true });

// ── Default users ─────────────────────────────────────────────────────────────
const DEFAULT_USERS = [
  { id: 1, username: 'admin',       password: 'admin',    role: 'creator',    name: 'Администратор', canEdit: true,  audit: true  },
  { id: 2, username: 'boss',        password: 'boss1234', role: 'boss',       name: 'Директор',      canEdit: true,  audit: true  },
  { id: 3, username: 'sklad',       password: '1234',     role: 'warehouse',  name: 'Кладовщик',     canEdit: true,  audit: false },
  { id: 4, username: 'manager',     password: '1234',     role: 'manager',    name: 'Менеджер',      canEdit: false, audit: false },
  { id: 5, username: 'buhgalter',   password: '1234',     role: 'accountant', name: 'Бухгалтер',     canEdit: false, audit: true  },
];

function readUsers() {
  try {
    if (!fs.existsSync(USERS_FILE)) {
      fs.writeFileSync(USERS_FILE, JSON.stringify(DEFAULT_USERS, null, 2), 'utf8');
      return DEFAULT_USERS;
    }
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf8'));
  } catch { return DEFAULT_USERS; }
}
function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
}

ipcMain.handle('users:validate', (_e, { username, password }) => {
  const users = readUsers();
  const user  = users.find(u => u.username === username && u.password === password);
  if (!user) return { ok: false, error: 'Неверный логин или пароль' };
  const { password: _pw, ...safe } = user;
  return { ok: true, user: safe };
});

ipcMain.handle('users:get', () => {
  return readUsers().map(({ password: _pw, ...u }) => u);
});

ipcMain.handle('users:save', (_e, users) => {
  writeUsers(users);
  return { ok: true };
});

// ── Movements (audit log) ─────────────────────────────────────────────────────
function readMovements() {
  try {
    if (!fs.existsSync(MOVEMENTS_FILE)) return [];
    return JSON.parse(fs.readFileSync(MOVEMENTS_FILE, 'utf8'));
  } catch { return []; }
}

function logMovement(entry) {
  const all = readMovements();
  const record = {
    id:           Date.now() + Math.random(),
    timestamp:    new Date().toISOString(),
    ...entry,
  };
  all.unshift(record); // newest first
  // Keep last 10 000 records
  if (all.length > 10000) all.length = 10000;
  fs.writeFileSync(MOVEMENTS_FILE, JSON.stringify(all, null, 2), 'utf8');
  return record;
}

ipcMain.handle('movements:get',    (_e, limit = 500) => readMovements().slice(0, limit));
ipcMain.handle('movements:clear',  ()  => { fs.writeFileSync(MOVEMENTS_FILE, '[]', 'utf8'); return { ok: true }; });

// ── Transfer Documents ────────────────────────────────────────────────────────
function readTransfers() {
  try {
    if (!fs.existsSync(TRANSFERS_FILE)) return [];
    return JSON.parse(fs.readFileSync(TRANSFERS_FILE, 'utf8'));
  } catch { return []; }
}
function writeTransfers(docs) {
  fs.writeFileSync(TRANSFERS_FILE, JSON.stringify(docs, null, 2), 'utf8');
}
function nextTransferNumber() {
  const all = readTransfers();
  const max = all.reduce((m, d) => Math.max(m, parseInt(d.number) || 0), 0);
  return String(max + 1).padStart(4, '0');
}

ipcMain.handle('transfers:get', () => readTransfers());

ipcMain.handle('transfers:save', (_e, doc) => {
  const all = readTransfers();
  if (doc.id) {
    const idx = all.findIndex(d => d.id === doc.id);
    if (idx >= 0) {
      all[idx] = { ...doc, updatedAt: new Date().toISOString() };
      writeTransfers(all);
      return { ok: true, doc: all[idx] };
    }
  }
  const newDoc = {
    ...doc,
    id:        String(Date.now()),
    number:    nextTransferNumber(),
    status:    doc.status || 'draft',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  all.unshift(newDoc);
  writeTransfers(all);
  return { ok: true, doc: newDoc };
});

ipcMain.handle('transfers:post', (_e, { id, user }) => {
  const all = readTransfers();
  const idx = all.findIndex(d => d.id === id);
  if (idx < 0) return { ok: false, error: 'Документ не найден' };

  const doc = all[idx];
  if (doc.status === 'posted') return { ok: false, error: 'Документ уже проведён' };
  if (!doc.items || !doc.items.length) return { ok: false, error: 'Нет позиций для перемещения' };

  const prods = readProducts();
  const errors = [];

  for (const item of doc.items) {
    const pIdx = prods.findIndex(p => String(p.id) === String(item.productId));
    if (pIdx < 0) { errors.push(`Товар ${item.article} не найден`); continue; }
    const p = prods[pIdx];
    logMovement({
      action: 'move',
      productId: p.id, article: p.article, brand: p.brand,
      productName: p.name, name: p.name,
      fromWarehouse: doc.fromWarehouse, fromShelf: item.fromShelf || p.shelf || '—',
      toWarehouse:   doc.toWarehouse,   toShelf:   item.toShelf   || '—',
      qty: item.qty || 0,
      userRole: user?.role || 'warehouse',
      reason: `Документ №${doc.number}${doc.reason ? ': ' + doc.reason : ''}`,
    });
    prods[pIdx] = {
      ...p,
      warehouse:  doc.toWarehouse,
      shelf:      item.toShelf || p.shelf,
      updatedAt:  new Date().toISOString(),
    };
  }

  all[idx] = { ...doc, status: 'posted', postedAt: new Date().toISOString(), postedBy: user };
  writeTransfers(all);
  writeProducts(prods);
  win?.webContents.send('products:changed', prods);
  scheduleSync(prods);

  return { ok: errors.length === 0, errors, postedCount: doc.items.length - errors.length };
});

ipcMain.handle('transfers:delete', (_e, id) => {
  const filtered = readTransfers().filter(d => d.id !== id);
  writeTransfers(filtered);
  return { ok: true };
});

// ── Move product between shelves/warehouses ───────────────────────────────────
ipcMain.handle('products:move', (_e, { productId, toWarehouse, toShelf, qty, reason, user }) => {
  const all = readProducts();
  const idx = all.findIndex(p => p.id == productId);
  if (idx < 0) return { ok: false, error: 'Товар не найден' };

  const p = all[idx];
  const fromWarehouse = p.warehouse || 1;
  const fromShelf     = p.shelf     || '—';

  logMovement({
    action: 'move',
    productId, article: p.article, brand: p.brand,
    productName: p.name, name: p.name,
    fromWarehouse, fromShelf,
    toWarehouse,   toShelf,
    qty:        qty || p.stock,
    qtyChange:  0,
    userRole:   user?.role || 'warehouse',
    reason:     reason || '',
  });

  all[idx] = { ...p, warehouse: toWarehouse, shelf: toShelf, updatedAt: new Date().toISOString() };
  writeProducts(all);
  win?.webContents.send('products:changed', all);
  scheduleSync(all);
  return { ok: true };
});

// ── Persistent window state ───────────────────────────────────────────────────
const store = new Store({
  defaults: { windowBounds: { width: 1200, height: 750 }, windowMaximized: false }
});

// ── Sync config helpers ───────────────────────────────────────────────────────
function readSyncConfig() {
  try {
    if (!fs.existsSync(CONFIG_FILE)) return { apiKey: '', binId: '' };
    return JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf8'));
  } catch { return { apiKey: '', binId: '' }; }
}
function writeSyncConfig(cfg) {
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
}

// ── Cloud sync (JSONBin.io) ───────────────────────────────────────────────────
let syncTimer = null;

function httpRequest(options, body) {
  return new Promise((resolve, reject) => {
    const req = https.request(options, res => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
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

async function pushToCloud(items) {
  const { apiKey, binId } = readSyncConfig();
  if (!apiKey || !binId) return { ok: false, error: 'Не настроена синхронизация' };

  const body = JSON.stringify({ products: items, updatedAt: new Date().toISOString(), count: items.length });
  try {
    const res = await httpRequest({
      hostname: 'api.jsonbin.io',
      path:     `/v3/b/${binId}`,
      method:   'PUT',
      headers:  {
        'Content-Type':  'application/json',
        'X-Master-Key':  apiKey,
        'X-Bin-Versioning': 'false',
      },
    }, body);

    if (res.status === 200) {
      win?.webContents.send('sync:ok', { count: items.length, at: new Date().toISOString() });
      return { ok: true };
    }
    win?.webContents.send('sync:error', `HTTP ${res.status}`);
    return { ok: false, error: `HTTP ${res.status}` };
  } catch (e) {
    win?.webContents.send('sync:error', e.message);
    return { ok: false, error: e.message };
  }
}

// Debounced auto-sync: waits 1.5s after last change, then pushes
function scheduleSync(items) {
  clearTimeout(syncTimer);
  syncTimer = setTimeout(() => pushToCloud(items), 1500);
}

// IPC: create a new bin (first-time setup)
ipcMain.handle('sync:createBin', async (_e, apiKey) => {
  try {
    const res = await httpRequest({
      hostname: 'api.jsonbin.io',
      path:     '/v3/b',
      method:   'POST',
      headers:  {
        'Content-Type':   'application/json',
        'X-Master-Key':   apiKey,
        'X-Bin-Name':     'garage-products',
        'X-Bin-Private':  'true',
      },
    }, JSON.stringify({ products: [], updatedAt: new Date().toISOString(), count: 0 }));

    if (res.status === 200 || res.status === 201) {
      const binId = res.data?.metadata?.id;
      if (binId) {
        writeSyncConfig({ apiKey, binId });
        return { ok: true, binId };
      }
    }
    return { ok: false, error: `HTTP ${res.status}: ${JSON.stringify(res.data)}` };
  } catch (e) {
    return { ok: false, error: e.message };
  }
});

ipcMain.handle('sync:saveConfig', (_e, cfg) => {
  writeSyncConfig(cfg);
  return { ok: true };
});
ipcMain.handle('sync:getConfig', () => readSyncConfig());
ipcMain.handle('sync:pushNow',   async () => {
  const items = readProducts();
  return pushToCloud(items);
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
  scheduleSync(items);
  return { ok: true, count: items.length };
});

ipcMain.handle('products:add', (_e, { item, user }) => {
  const all = readProducts();
  const newItem = {
    ...item,
    id: Date.now() + Math.random(),
    warehouse: item.warehouse || 1,
    shelf:     item.shelf     || '',
    source:    'warehouse',
    importedAt: new Date().toISOString(),
    updatedAt:  new Date().toISOString(),
  };
  const key = ((item.article || '') + '|' + (item.brand || '')).toUpperCase();
  const idx = all.findIndex(p =>
    ((p.article || '') + '|' + (p.brand || '')).toUpperCase() === key
  );
  const isUpdate = idx >= 0;
  if (isUpdate) {
    const old = all[idx];
    logMovement({ action: 'update', productId: old.id, article: old.article, brand: old.brand,
      productName: old.name, name: old.name,
      fromWarehouse: old.warehouse||'wh1', fromShelf: old.shelf||'—',
      toWarehouse: item.warehouse||old.warehouse||'wh1', toShelf: item.shelf||old.shelf||'—',
      qty: item.stock ?? old.stock, qtyChange: (item.stock??0)-(old.stock??0), userRole: user?.role||'warehouse', reason: 'Редактирование' });
    all[idx] = { ...all[idx], ...item, updatedAt: new Date().toISOString() };
  } else {
    logMovement({ action: 'add', productId: newItem.id, article: newItem.article, brand: newItem.brand,
      productName: newItem.name, name: newItem.name,
      fromWarehouse: null, fromShelf: null,
      toWarehouse: newItem.warehouse, toShelf: newItem.shelf||'—',
      qty: newItem.stock||0, qtyChange: newItem.stock||0, userRole: user?.role||'warehouse', reason: 'Добавление' });
    all.push(newItem);
  }
  writeProducts(all);
  win?.webContents.send('products:changed', all);
  scheduleSync(all);
  return { ok: true, item: isUpdate ? all[idx] : newItem };
});

ipcMain.handle('products:update', (_e, { item, user }) => {
  const all = readProducts();
  const idx = all.findIndex(p => p.id == item.id);
  if (idx >= 0) {
    const old = all[idx];
    logMovement({ action: 'update', productId: old.id, article: old.article, brand: old.brand,
      productName: old.name, name: old.name,
      fromWarehouse: old.warehouse||'wh1', fromShelf: old.shelf||'—',
      toWarehouse: item.warehouse||old.warehouse||'wh1', toShelf: item.shelf||old.shelf||'—',
      qty: item.stock ?? old.stock, qtyChange: (item.stock??0)-(old.stock??0), userRole: user?.role||'warehouse', reason: 'Редактирование' });
    all[idx] = { ...all[idx], ...item, updatedAt: new Date().toISOString() };
    writeProducts(all);
    win?.webContents.send('products:changed', all);
    scheduleSync(all);
    return { ok: true };
  }
  return { ok: false, error: 'Не найден' };
});

ipcMain.handle('products:delete', (_e, { id, user }) => {
  const all = readProducts();
  const p   = all.find(x => x.id == id);
  if (p) logMovement({ action: 'delete', productId: p.id, article: p.article, brand: p.brand,
    productName: p.name, name: p.name,
    fromWarehouse: p.warehouse||'wh1', fromShelf: p.shelf||'—',
    toWarehouse: null, toShelf: null,
    qty: p.stock||0, qtyChange: -(p.stock||0), userRole: user?.role||'warehouse', reason: 'Удаление' });
  const updated = all.filter(x => x.id != id);
  writeProducts(updated);
  win?.webContents.send('products:changed', updated);
  scheduleSync(updated);
  return { ok: true };
});

// ── Smart column mapper ───────────────────────────────────────────────────────
function mapHeader(h) {
  const s = h.toLowerCase().trim()
    .replace(/["'«»\[\]()]/g, '')
    .replace(/\s+/g, ' ');

  if (/артикул|article|арт\b|part.?no|part.?number|код\b|sku/.test(s))         return 'article';
  if (/бренд|brand|производитель|марка|manufacturer|maker/.test(s))             return 'brand';
  if (/наименован|назван|name|описан|товар|номенклатур|title/.test(s))          return 'name';
  if (/цена.?розн|розн.?цена|retail|price_retail|цена\b(?!.*опт)|прайс/.test(s)) return 'price_retail';
  if (/цена.?опт|опт.?цена|wholesale|price_wholesale|оптов/.test(s))            return 'price_wholesale';
  if (/кол.?во|количеств|stock|остаток|склад|qty|count|наличи/.test(s))         return 'stock';
  if (/категор|categ|группа|раздел|тип\b|вид\b/.test(s))                        return 'category';
  return s; // unknown — keep as-is
}

function rowToProduct(obj) {
  return {
    article:         String(obj.article || obj['арт'] || obj['код'] || '').trim(),
    brand:           String(obj.brand   || '').trim(),
    name:            String(obj.name    || '').trim(),
    price_retail:    parseFloat(String(obj.price_retail    || '0').replace(/[^\d.,]/g,'').replace(',','.')) || 0,
    price_wholesale: parseFloat(String(obj.price_wholesale || '0').replace(/[^\d.,]/g,'').replace(',','.')) || 0,
    stock:           parseInt(String(obj.stock || '0').replace(/[^\d]/g,'')) || 0,
    category:        String(obj.category || '').trim(),
  };
}

function parseTableRows(headers, dataRows, delimiter) {
  return dataRows.map(line => {
    if (!line.trim()) return null;
    const vals = line.split(delimiter);
    const obj = {};
    headers.forEach((h, i) => { obj[h] = (vals[i] || '').replace(/^["']|["']$/g,'').trim(); });
    return rowToProduct(obj);
  }).filter(p => p && p.article);
}

function mergeIntoDB(items) {
  const all = readProducts();
  const map = {};
  all.forEach(it => { map[((it.article||'')+'|'+(it.brand||'')).toUpperCase()] = it; });
  let added = 0, updated = 0;
  items.forEach(it => {
    const key = ((it.article||'')+'|'+(it.brand||'')).toUpperCase();
    if (map[key]) {
      Object.assign(map[key], it, { source: 'warehouse', updatedAt: new Date().toISOString() });
      updated++;
    } else {
      map[key] = { ...it, id: Date.now()+Math.random(), source: 'warehouse', importedAt: new Date().toISOString() };
      added++;
    }
  });
  const merged = Object.values(map);
  writeProducts(merged);
  win?.webContents.send('products:changed', merged);
  return { added, updated, total: merged.length };
}

// ── Smart file import ─────────────────────────────────────────────────────────
ipcMain.handle('products:importFile', async () => {
  const { filePaths } = await dialog.showOpenDialog(win, {
    title: 'Загрузить файл с товарами',
    filters: [
      { name: 'Все поддерживаемые', extensions: ['xlsx','xls','csv','tsv','txt','json','pdf','docx'] },
      { name: 'Excel',  extensions: ['xlsx','xls'] },
      { name: 'CSV/TXT', extensions: ['csv','tsv','txt'] },
      { name: 'JSON',   extensions: ['json'] },
      { name: 'PDF',    extensions: ['pdf'] },
      { name: 'Word',   extensions: ['docx'] },
    ],
    properties: ['openFile'],
  });
  if (!filePaths.length) return { ok: false };

  const filePath = filePaths[0];
  const ext = path.extname(filePath).toLowerCase();
  let items = [];

  try {
    // ── Excel ──────────────────────────────────────────────────────────────────
    if (ext === '.xlsx' || ext === '.xls') {
      const XLSX = require('xlsx');
      const wb = XLSX.readFile(filePath);
      const ws = wb.Sheets[wb.SheetNames[0]];
      const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '' });
      if (rows.length < 2) return { ok: false, error: 'Файл пустой или нет данных' };

      // Find the header row (first row with >2 non-empty cells)
      let headerIdx = 0;
      for (let i = 0; i < Math.min(10, rows.length); i++) {
        if (rows[i].filter(c => String(c).trim()).length > 2) { headerIdx = i; break; }
      }
      const rawHeaders = rows[headerIdx].map(h => mapHeader(String(h)));
      items = rows.slice(headerIdx + 1).map(row => {
        const obj = {};
        rawHeaders.forEach((h, i) => { obj[h] = String(row[i] ?? ''); });
        return rowToProduct(obj);
      }).filter(p => p.article);
    }

    // ── CSV / TSV / TXT ────────────────────────────────────────────────────────
    else if (['.csv','.tsv','.txt'].includes(ext)) {
      const raw = fs.readFileSync(filePath, { encoding: 'utf8' });
      const lines = raw.split(/\r?\n/).filter(Boolean);
      if (lines.length < 2) return { ok: false, error: 'Файл пустой' };

      // Auto-detect delimiter
      const sample = lines[0];
      const delim = sample.includes('\t') ? '\t' : sample.includes(';') ? ';' : ',';
      const headers = lines[0].split(delim).map(h => mapHeader(h.replace(/^["']|["']$/g,'').trim()));
      items = parseTableRows(headers, lines.slice(1), delim);
    }

    // ── JSON ───────────────────────────────────────────────────────────────────
    else if (ext === '.json') {
      const raw = fs.readFileSync(filePath, 'utf8');
      let data;
      try { data = JSON.parse(raw); } catch { return { ok: false, error: 'Неверный JSON' }; }
      const arr = Array.isArray(data) ? data : (data.items || data.products || data.catalog || data.Товары || []);
      items = arr.map(it => {
        // Normalize keys
        const n = {};
        Object.keys(it).forEach(k => { n[mapHeader(k)] = it[k]; });
        return rowToProduct(n);
      }).filter(p => p.article);
    }

    // ── PDF ────────────────────────────────────────────────────────────────────
    else if (ext === '.pdf') {
      const pdfParse = require('pdf-parse');
      const buf = fs.readFileSync(filePath);
      const data = await pdfParse(buf);
      const text = data.text;

      // Try to extract tabular data from text
      const lines = text.split(/\n/).map(l => l.trim()).filter(Boolean);
      // Heuristic: find lines that look like product rows (contain digit prices / article-like strings)
      const articleRe = /[A-Z0-9]{4,}[-\/]?[A-Z0-9]*/;
      const priceRe   = /\d[\d\s]*[.,]\d{2}/;
      items = lines.map(line => {
        const parts = line.split(/\s{2,}|\t/);
        if (parts.length < 2) return null;
        const articleMatch = line.match(articleRe);
        if (!articleMatch) return null;
        const prices = line.match(/\d+[.,]\d+/g) || [];
        const nums   = line.match(/\b\d+\b/g) || [];
        return {
          article: articleMatch[0],
          brand: '',
          name: parts.find(p => p.length > 5 && !/^\d/.test(p) && p !== articleMatch[0]) || parts[0],
          price_retail:    parseFloat((prices[0]||'0').replace(',','.')) || 0,
          price_wholesale: parseFloat((prices[1]||'0').replace(',','.')) || 0,
          stock: parseInt(nums.find(n => parseInt(n) < 10000 && parseInt(n) > 0) || '0') || 0,
          category: '',
        };
      }).filter(p => p && p.article && p.article.length >= 4);
    }

    // ── Word DOCX ──────────────────────────────────────────────────────────────
    else if (ext === '.docx') {
      const mammoth = require('mammoth');
      const result  = await mammoth.extractRawText({ path: filePath });
      const lines   = result.value.split(/\n/).map(l => l.trim()).filter(Boolean);
      const articleRe = /[A-Z0-9]{4,}[-\/]?[A-Z0-9]*/;
      items = lines.map(line => {
        const parts = line.split(/\s{2,}|\t/);
        if (parts.length < 2) return null;
        const am = line.match(articleRe);
        if (!am) return null;
        const prices = line.match(/\d+[.,]\d+/g) || [];
        const nums   = line.match(/\b\d+\b/g) || [];
        return {
          article: am[0], brand: '',
          name: parts.find(p => p.length > 5 && !/^\d/.test(p) && p !== am[0]) || parts[0],
          price_retail:    parseFloat((prices[0]||'0').replace(',','.')) || 0,
          price_wholesale: parseFloat((prices[1]||'0').replace(',','.')) || 0,
          stock: parseInt(nums.find(n => parseInt(n) < 10000 && parseInt(n) > 0) || '0') || 0,
          category: '',
        };
      }).filter(p => p && p.article && p.article.length >= 4);
    }

    else {
      return { ok: false, error: `Формат ${ext} не поддерживается` };
    }

  } catch (err) {
    return { ok: false, error: err.message };
  }

  if (!items.length) return { ok: false, error: 'Не удалось найти товары в файле. Убедитесь, что есть колонка «Артикул».' };

  const result = mergeIntoDB(items);
  logMovement({ action: 'import', productId: null, article: '—', brand: '—',
    productName: `Импорт: ${path.basename(filePath)}`,
    name: `Импорт: ${path.basename(filePath)} (${result.added} доб., ${result.updated} обн.)`,
    fromWarehouse: null, fromShelf: null, toWarehouse: null, toShelf: null,
    qty: result.total, qtyChange: result.added, userRole: 'warehouse', reason: 'Импорт файла' });
  scheduleSync(readProducts());
  return { ok: true, ...result, fileName: path.basename(filePath) };
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

// Allow renderer to open external links (e.g. jsonbin.io)
ipcMain.handle('app:openLink', (_e, url) => { shell.openExternal(url); return true; });

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
