// lib/1c.ts — Интеграция с 1С:Управление торговлей
import { sql } from './db';

const ONE_C_URL  = process.env.ONE_C_URL!;
const LOGIN      = process.env.ONE_C_LOGIN!;
const PASSWORD   = process.env.ONE_C_PASSWORD!;

function authHeader() {
  return 'Basic ' + Buffer.from(`${LOGIN}:${PASSWORD}`).toString('base64');
}

async function fetch1C(path: string, init: RequestInit = {}) {
  const res = await fetch(`${ONE_C_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', Authorization: authHeader(), ...init.headers },
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`1C HTTP ${res.status}: ${await res.text().catch(() => '')}`);
  return res.json();
}

// ── Синхронизация каталога из 1С ──────────────────────────────────────────────
// Вызывается cron-задачей каждый час (scripts/sync.ts)
export async function sync1CProducts(): Promise<{ updated: number }> {
  let page = 1, totalUpdated = 0;

  while (true) {
    const data = await fetch1C(`/products?page=${page}&limit=500`) as {
      products: Array<{
        article: string; brand: string; name: string; unit: string;
        priceRetail: number; priceWholesale: number; stockQuantity: number;
        warehouseCode: string;
      }>;
      hasMore: boolean;
    };

    if (!data.products.length) break;

    // Upsert батчем в products_cache
    for (const p of data.products) {
      await sql`
        INSERT INTO products_cache
          (article, brand, name, unit, price_retail, price_wholesale,
           stock_quantity, warehouse_code, synced_from_1c_at, updated_at)
        VALUES (
          ${p.article.toUpperCase()}, ${p.brand}, ${p.name}, ${p.unit ?? 'шт'},
          ${p.priceRetail}, ${p.priceWholesale}, ${p.stockQuantity},
          ${p.warehouseCode}, NOW(), NOW()
        )
        ON CONFLICT (article, COALESCE(warehouse_code, ''))
        DO UPDATE SET
          brand            = EXCLUDED.brand,
          name             = EXCLUDED.name,
          price_retail     = EXCLUDED.price_retail,
          price_wholesale  = EXCLUDED.price_wholesale,
          stock_quantity   = EXCLUDED.stock_quantity,
          synced_from_1c_at = NOW(),
          updated_at       = NOW()
      `;
    }

    totalUpdated += data.products.length;
    if (!data.hasMore) break;
    page++;
  }

  return { updated: totalUpdated };
}

// ── Создание Заказа клиента в 1С ─────────────────────────────────────────────
export interface OneCOrderPayload {
  externalId:   string;
  date:         string;
  counterparty: { oneCId: string | null; name: string; phone: string; email: string };
  warehouseCode: string;
  delivery:     { type: string; address: string; cdekOrderUuid: string | null; cost: number };
  items: Array<{
    article: string; brand: string; name: string; quantity: number;
    price: number; sum: number; unit: string; source: '1c' | 'qwep';
    qwepOffer?: { offerId: string; supplierInternal: string; priceInput: number; deliveryDays: number } | null;
  }>;
  deliveryService?: { name: string; price: number; sum: number } | null;
  subtotal: number;
  total:    number;
  comment?: string;
}

export async function createOrderIn1C(payload: OneCOrderPayload) {
  const started = Date.now();
  try {
    const result = await fetch1C('/orders', { method: 'POST', body: JSON.stringify(payload) }) as {
      success: boolean;
      oneCOrderNumber?: string;
      oneCOrderDate?: string;
      oneCOrderId?: string;
      errorCode?: string;
      errorMessage?: string;
    };

    if (!result.success) throw new Error(`[${result.errorCode}] ${result.errorMessage}`);

    await sql`INSERT INTO sync_logs (type, status, payload, duration_ms)
      VALUES ('1c_order', 'ok', ${sql.json({ id: result.oneCOrderId })}, ${Date.now() - started})`;

    return { oneCOrderNumber: result.oneCOrderNumber!, oneCOrderId: result.oneCOrderId! };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await sql`INSERT INTO sync_logs (type, status, error_message, duration_ms)
      VALUES ('1c_order', 'error', ${msg}, ${Date.now() - started})`;
    throw err;
  }
}
