// app/api/search/route.ts
// GET /api/search?query=04465-12080
// Параллельный запрос: локальная БД (1С) + QWEP. Ответ зависит от роли.

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { searchQwep } from '@/lib/qwep';
import { getRole, getSession } from '@/lib/auth';
import { cacheGet, cacheSet } from '@/lib/redis';
import { logActivity } from '@/lib/activity';
import type { SearchResultItem, SearchResponse } from '@/types';

const querySchema = z.object({
  query: z.string().min(1).max(100).transform(s => s.trim().toUpperCase()),
});

const MANAGER_PHONE = process.env.NEXT_PUBLIC_MANAGER_PHONE || '+78001234567';

export async function GET(req: NextRequest) {
  // Валидация
  const parse = querySchema.safeParse({ query: req.nextUrl.searchParams.get('query') });
  if (!parse.success) {
    return NextResponse.json({ error: 'Параметр query обязателен' }, { status: 400 });
  }

  const article   = parse.data.query;
  const role      = await getRole();
  const session   = await getSession();
  const cacheKey  = `search:${article}:${role}`;

  // Проверяем Redis-кэш (отдельный для менеджера и покупателя)
  const cached = await cacheGet<SearchResponse>(cacheKey);
  if (cached) {
    return NextResponse.json(cached, {
      headers: { 'X-Cache': 'HIT', 'Cache-Control': 'no-store' },
    });
  }

  // ── Параллельные запросы ───────────────────────────────────────────────────
  const [localResult, qwepResult] = await Promise.allSettled([
    searchLocalDb(article),
    searchQwep(article),
  ]);

  const localItems = localResult.status === 'fulfilled' ? localResult.value : [];
  const qwepItems  = qwepResult.status  === 'fulfilled' ? qwepResult.value  : [];

  // Логируем ошибки интеграций, но не падаем
  if (localResult.status === 'rejected') console.error('[Search] DB error:', localResult.reason);
  if (qwepResult.status  === 'rejected') console.error('[Search] QWEP error:', qwepResult.reason);

  const isManager = role === 'manager' || role === 'admin';

  // ── Трансформация под роль ─────────────────────────────────────────────────

  const ourItems: SearchResultItem[] = localItems.map(row => {
    const base: SearchResultItem = {
      id:           row.id,
      source:       '1c',
      article:      row.article,
      brand:        row.brand ?? '',
      name:         row.name,
      unit:         row.unit,
      priceRetail:  Number(row.priceRetail),
      quantity:     Number(row.stockQuantity),
      availability: Number(row.stockQuantity) > 0 ? 'in_stock' : 'out_of_stock',
      deliveryDays: 0,
    };
    if (isManager) {
      base.priceWholesale = Number(row.priceWholesale);
      base.warehouseCode  = row.warehouseCode ?? null;
    }
    return base;
  });

  const partnerItems: SearchResultItem[] = qwepItems.map(offer => {
    const base: SearchResultItem = {
      id:           offer.qwepOfferId,
      source:       'qwep',
      article:      offer.article,
      brand:        offer.brand,
      name:         offer.name,
      unit:         offer.unit,
      priceRetail:  offer.priceRetail,
      quantity:     offer.quantity,
      availability: 'order',
      deliveryDays: offer.deliveryDays,
      qwepOfferSnapshot: {
        offer_id:          offer.qwepOfferId,
        supplier_internal: offer.supplierInternal,
        price_input:       offer.priceInput,
        delivery_days:     offer.deliveryDays,
        warehouse_city:    offer.warehouseCity,
      },
    };

    if (isManager) {
      base.supplierInternal = offer.supplierInternal;
      base.priceInput       = offer.priceInput;
      base.warehouseCity    = offer.warehouseCity;
      base.qwepOfferId      = offer.qwepOfferId;
    } else {
      base.cta = {
        type:         'call_manager',
        message:      'Для заказа этого товара свяжитесь с менеджером',
        phone:        MANAGER_PHONE,
        phoneLabel:   formatPhone(MANAGER_PHONE),
        deliveryHint: `Доставка от ${offer.deliveryDays} дн.`,
      };
    }

    return base;
  });

  // Сортировка: сначала наше наличие → наш 0-остаток → партнёры
  const items: SearchResultItem[] = [
    ...ourItems.filter(i => i.availability === 'in_stock'),
    ...ourItems.filter(i => i.availability === 'out_of_stock'),
    ...partnerItems,
  ];

  const response: SearchResponse = {
    query:   article,
    total:   items.length,
    sources: { localCount: ourItems.length, qwepCount: partnerItems.length },
    items,
  };

  // Сохраняем в Redis
  await cacheSet(cacheKey, response);

  // Логируем поиск (только для менеджеров и администраторов)
  if (session && (role === 'manager' || role === 'admin')) {
    void logActivity({
      userId:    session.user.id,
      userEmail: session.user.email,
      userRole:  role,
      action:    'search',
      details:   { query: article, results: items.length, localCount: ourItems.length, qwepCount: partnerItems.length },
      ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip'),
    });
  }

  return NextResponse.json(response, {
    headers: { 'X-Cache': 'MISS', 'Cache-Control': 'no-store' },
  });
}

// ── Запрос к локальному кэшу БД ───────────────────────────────────────────────
async function searchLocalDb(article: string) {
  return sql`
    SELECT
      id, article, brand, name, unit,
      price_retail   AS "priceRetail",
      price_wholesale AS "priceWholesale",
      stock_quantity AS "stockQuantity",
      warehouse_code  AS "warehouseCode"
    FROM products_cache
    WHERE article = ${article}
       OR article LIKE ${'%' + article + '%'}
    ORDER BY
      CASE WHEN article = ${article} THEN 0 ELSE 1 END,
      stock_quantity DESC
    LIMIT 60
  `;
}

function formatPhone(p: string) {
  const d = p.replace(/\D/g, '');
  if (d.length === 11)
    return `+${d[0]} (${d.slice(1,4)}) ${d.slice(4,7)}-${d.slice(7,9)}-${d.slice(9,11)}`;
  return p;
}
