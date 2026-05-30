'use strict';
/**
 * Generates placeholder icons in assets/ using only built-in Node.js modules.
 * Run: node create-icons.js
 *
 * Replace assets/icon.ico and assets/tray-icon.png with your real logo later.
 * Recommended tool: npx electron-icon-maker --input=logo.png --output=./assets
 */

const fs   = require('fs');
const zlib = require('zlib');
const path = require('path');

const ASSETS = path.join(__dirname, 'assets');
if (!fs.existsSync(ASSETS)) fs.mkdirSync(ASSETS, { recursive: true });

// ── CRC32 (needed for PNG chunks) ─────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    t[i] = c;
  }
  return t;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}

// ── PNG builder ───────────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const dataBytes = Buffer.isBuffer(data) ? data : Buffer.from(data);
  const lenBuf    = Buffer.allocUnsafe(4);
  lenBuf.writeUInt32BE(dataBytes.length);
  const crcBuf = Buffer.allocUnsafe(4);
  crcBuf.writeUInt32BE(crc32(Buffer.concat([typeBytes, dataBytes])));
  return Buffer.concat([lenBuf, typeBytes, dataBytes, crcBuf]);
}

function makePNG(size, r, g, b) {
  // PNG signature
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR
  const ihdr = Buffer.allocUnsafe(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 2; // RGB
  ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;

  // Raw scanlines: filter byte (0) + RGB pixels per row
  const raw = Buffer.allocUnsafe(size * (1 + size * 3));
  for (let y = 0; y < size; y++) {
    raw[y * (1 + size * 3)] = 0;
    for (let x = 0; x < size; x++) {
      const o = y * (1 + size * 3) + 1 + x * 3;
      raw[o] = r; raw[o + 1] = g; raw[o + 2] = b;
    }
  }

  const idat = zlib.deflateSync(raw);

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', idat),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── ICO builder (embeds a PNG image) ─────────────────────────────────────────
// Modern ICO format supports PNG-compressed images directly.
function makeICO(pngBuf) {
  // ICO header: reserved(2) + type=1(2) + count=1(2)
  const header = Buffer.from([0, 0, 1, 0, 1, 0]);

  // Directory entry (16 bytes):
  // width(1) height(1) colorCount(1) reserved(1) planes(2) bitCount(2) size(4) offset(4)
  const entry = Buffer.allocUnsafe(16);
  entry[0] = 0;   // width  0 = 256
  entry[1] = 0;   // height 0 = 256
  entry[2] = 0;   // color count (0 = no palette)
  entry[3] = 0;   // reserved
  entry.writeUInt16LE(1,  4); // planes
  entry.writeUInt16LE(32, 6); // bit count
  entry.writeUInt32LE(pngBuf.length, 8);
  entry.writeUInt32LE(6 + 16, 12); // offset = header(6) + entry(16)

  return Buffer.concat([header, entry, pngBuf]);
}

// ── Generate files ────────────────────────────────────────────────────────────
// Brand colors: #e8411a = (232, 65, 26) on dark bg #0d0f10 = (13, 15, 16)
const ORANGE = [232, 65, 26];
const DARK   = [13, 15, 16];

// icon.png — 256×256 orange square (main app icon source)
const iconPng = makePNG(256, ...ORANGE);
fs.writeFileSync(path.join(ASSETS, 'icon.png'), iconPng);
console.log('✓ assets/icon.png  (256×256)');

// icon.ico — embeds the 256px PNG
const iconIco = makeICO(iconPng);
fs.writeFileSync(path.join(ASSETS, 'icon.ico'), iconIco);
console.log('✓ assets/icon.ico');

// tray-icon.png — 32×32 orange square for system tray
const trayPng = makePNG(32, ...ORANGE);
fs.writeFileSync(path.join(ASSETS, 'tray-icon.png'), trayPng);
console.log('✓ assets/tray-icon.png  (32×32)');

console.log('\nГотово! Замените эти файлы на ваш реальный логотип.');
console.log('Рекомендуем: npx electron-icon-maker --input=logo.png --output=./');
