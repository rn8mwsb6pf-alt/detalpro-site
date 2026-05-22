// scripts/sync.ts — Cron-задача синхронизации с 1С:УТ
// Запускается отдельным процессом: npx ts-node scripts/sync.ts
// Или через PM2/systemd в production

import cron from 'node-cron';
import { sync1CProducts } from '../lib/1c';
import { sql } from '../lib/db';

console.log('[Sync] 1С synchronization service started');
console.log('[Sync] Schedule: every hour');

// Запускаем сразу при старте
runSync();

// И потом каждый час
cron.schedule('0 * * * *', runSync);

async function runSync() {
  console.log(`[Sync] ${new Date().toISOString()} Starting sync...`);
  const started = Date.now();

  try {
    const result = await sync1CProducts();
    console.log(`[Sync] Done: ${result.updated} products updated in ${Date.now() - started}ms`);
  } catch (err) {
    console.error('[Sync] FATAL error:', err);
    // Логируем в БД
    try {
      await sql`
        INSERT INTO sync_logs (type, status, error_message, duration_ms)
        VALUES ('1c_products', 'error', ${String(err)}, ${Date.now() - started})
      `;
    } catch {}
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  console.log('[Sync] SIGTERM received, shutting down');
  await sql.end();
  process.exit(0);
});
