// app/api/admin/orders/route.ts — GET все заказы (с фильтрами)
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/db';

async function requireAdmin() {
  const session = await getSession();
  if (!session || session.user.role !== 'admin') return null;
  return session;
}

export async function GET(req: NextRequest) {
  if (!await requireAdmin()) {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const status = searchParams.get('status') ?? '';
  const q      = searchParams.get('q') ?? '';

  const rows = await sql`
    SELECT
      o.id, o.status, o.delivery_type,
      o.subtotal, o.delivery_cost, o.total,
      o.one_c_order_id, o.cdek_order_uuid,
      o.created_at,
      u.email, u.first_name, u.last_name, u.phone,
      COALESCE(
        json_agg(
          json_build_object(
            'article',     oi.article,
            'brand',       oi.brand,
            'name',        oi.name,
            'quantity',    oi.quantity,
            'price_retail',oi.price_retail,
            'source',      oi.source
          ) ORDER BY oi.ctid
        ) FILTER (WHERE oi.order_id IS NOT NULL),
        '[]'
      ) AS items
    FROM orders o
    LEFT JOIN users u ON u.id = o.user_id
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE
      (${ status ? sql`o.status = ${status}` : sql`TRUE` })
      AND (
        ${ q ? sql`
          u.email     ILIKE ${'%' + q + '%'}
          OR u.first_name ILIKE ${'%' + q + '%'}
          OR u.last_name  ILIKE ${'%' + q + '%'}
          OR o.id::text = ${q.replace('#', '')}
        ` : sql`TRUE` }
      )
    GROUP BY o.id, u.email, u.first_name, u.last_name, u.phone
    ORDER BY o.created_at DESC
    LIMIT 200
  `;

  return NextResponse.json({ orders: rows });
}
