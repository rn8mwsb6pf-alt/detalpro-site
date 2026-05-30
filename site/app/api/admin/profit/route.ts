// app/api/admin/profit/route.ts — Отчёт о прибыли по заказам
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const from = searchParams.get('from') ?? new Date(Date.now() - 30 * 86400_000).toISOString().slice(0, 10);
  const to   = searchParams.get('to')   ?? new Date().toISOString().slice(0, 10);

  // Считаем прибыль:
  // Выручка товаров = SUM(price_retail * quantity)
  // Доставка (доход) = order.delivery_cost
  // Себестоимость:
  //   QWEP-товары: qwep_offer_snapshot->>'price_input' * quantity
  //   1С-товары:   price_wholesale из products_cache (или 70% от retail)
  const rows = await sql`
    SELECT
      o.id,
      o.created_at,
      o.status,
      o.delivery_cost::numeric                        AS delivery_revenue,
      SUM(oi.price_retail * oi.quantity)::numeric     AS revenue,
      SUM(
        CASE
          WHEN oi.source = 'qwep' THEN
            COALESCE((oi.qwep_offer_snapshot->>'price_input')::numeric, 0) * oi.quantity
          ELSE
            COALESCE(pc.price_wholesale, oi.price_retail * 0.70) * oi.quantity
        END
      )::numeric                                       AS cost_goods,
      (
        SUM(oi.price_retail * oi.quantity)
        + o.delivery_cost
        - SUM(
          CASE
            WHEN oi.source = 'qwep' THEN
              COALESCE((oi.qwep_offer_snapshot->>'price_input')::numeric, 0) * oi.quantity
            ELSE
              COALESCE(pc.price_wholesale, oi.price_retail * 0.70) * oi.quantity
          END
        )
      )::numeric                                       AS profit,
      TRIM(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')) AS customer_name,
      COALESCE(u.email, 'Гость')                       AS customer_email
    FROM orders o
    LEFT JOIN users u         ON u.id = o.user_id
    LEFT JOIN order_items oi  ON oi.order_id = o.id
    LEFT JOIN products_cache pc ON pc.article = oi.article AND pc.brand = oi.brand
    WHERE
      o.status NOT IN ('cancelled', 'new')
      AND o.created_at >= ${from}::date
      AND o.created_at <  (${to}::date + INTERVAL '1 day')
    GROUP BY o.id, u.email, u.first_name, u.last_name
    ORDER BY o.created_at DESC
  `;

  return NextResponse.json({ rows });
}
