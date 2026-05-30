// app/api/orders/route.ts
// POST /api/orders — оформление заказа:
//   1. Сохраняем в PostgreSQL
//   2. Создаём заявку в СДЭК (если доставка СДЭК)
//   3. Отправляем «Заказ клиента» в 1С:УТ

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sql } from '@/lib/db';
import { createOrderIn1C } from '@/lib/1c';
import { createCdekOrder } from '@/lib/cdek';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activity';

// ── Валидация тела запроса ────────────────────────────────────────────────────

const itemSchema = z.object({
  article:     z.string().min(1).max(100),
  brand:       z.string().max(100),
  name:        z.string().max(500),
  unit:        z.string().max(20).default('шт'),
  source:      z.enum(['1c', 'qwep']),
  priceRetail: z.number().positive(),
  quantity:    z.number().int().positive(),
  deliveryDays: z.number().int().min(0),
  qwepOfferSnapshot: z.record(z.unknown()).nullable().optional(),
});

const orderSchema = z.object({
  contact: z.object({
    firstName: z.string().min(1),
    lastName:  z.string().min(1),
    phone:     z.string().min(7),
    email:     z.string().email(),
  }),
  delivery: z.discriminatedUnion('type', [
    z.object({
      type:    z.literal('pickup'),
      storeId: z.string().uuid(),
    }),
    z.object({
      type:    z.literal('cdek_pvz'),
      pvzCode: z.string().min(1),
    }),
    z.object({
      type:       z.literal('cdek_courier'),
      address:    z.string().min(5),
      postalCode: z.string().optional(),
    }),
  ]),
  items:   z.array(itemSchema).min(1).max(200),
  comment: z.string().max(1000).optional(),
});

// ── Обработчик ────────────────────────────────────────────────────────────────

export async function POST(req: NextRequest) {
  const session = await getSession();
  const userId  = session?.user.id ?? null;

  const body = await req.json().catch(() => null);
  const parse = orderSchema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: 'Некорректные данные', details: parse.error.flatten() },
      { status: 422 }
    );
  }

  const { contact, delivery, items, comment } = parse.data;

  // ── Считаем суммы ────────────────────────────────────────────────────────
  const subtotal    = items.reduce((s, i) => s + i.priceRetail * i.quantity, 0);
  const deliveryCost = delivery.type === 'pickup' ? 0
    : delivery.type === 'cdek_pvz'     ? 299  // реальный расчёт через CDEK calc API
    : 499;                                     // в чекауте уже рассчитано
  const total = subtotal + deliveryCost;

  // ── Создаём заказ в БД ───────────────────────────────────────────────────
  const [order] = await sql`
    INSERT INTO orders (
      user_id, status, delivery_type,
      store_id, delivery_address, cdek_pvz_code,
      delivery_cost, subtotal, total
    ) VALUES (
      ${userId},
      'new',
      ${delivery.type},
      ${delivery.type === 'pickup' ? (delivery as { storeId: string }).storeId : null},
      ${delivery.type === 'cdek_courier' ? (delivery as { address: string }).address : null},
      ${delivery.type === 'cdek_pvz' ? (delivery as { pvzCode: string }).pvzCode : null},
      ${deliveryCost}, ${subtotal}, ${total}
    )
    RETURNING id
  `;

  // Позиции заказа
  for (const item of items) {
    await sql`
      INSERT INTO order_items
        (order_id, article, brand, name, unit, source, price_retail,
         quantity, delivery_days, qwep_offer_snapshot)
      VALUES (
        ${order.id}, ${item.article}, ${item.brand}, ${item.name},
        ${item.unit}, ${item.source}, ${item.priceRetail},
        ${item.quantity}, ${item.deliveryDays},
        ${item.qwepOfferSnapshot ? sql.json(item.qwepOfferSnapshot as any) : null}
      )
    `;
  }

  // ── СДЭК: создаём заявку ─────────────────────────────────────────────────
  let cdekOrderUuid: string | null = null;

  if (delivery.type === 'cdek_pvz' || delivery.type === 'cdek_courier') {
    try {
      const cdekResult = await createCdekOrder({
        tariffCode: delivery.type === 'cdek_pvz' ? 136 : 137,
        pvzCode:    delivery.type === 'cdek_pvz'
          ? (delivery as { pvzCode: string }).pvzCode
          : undefined,
        toAddress:  delivery.type === 'cdek_courier'
          ? (delivery as { address: string }).address
          : undefined,
        recipient: {
          name:  `${contact.firstName} ${contact.lastName}`,
          phone: contact.phone,
          email: contact.email,
        },
        packages: [{ weight: 1000, length: 20, width: 20, height: 10 }],
        comment,
      });

      cdekOrderUuid = cdekResult.uuid;

      await sql`
        UPDATE orders SET cdek_order_uuid = ${cdekOrderUuid}
        WHERE id = ${order.id}
      `;
    } catch (err) {
      // СДЭК упал — заказ всё равно создаём, менеджер оформит вручную
      console.error('[Orders] CDEK error:', err);
    }
  }

  // ── 1С: создаём «Заказ клиента» ──────────────────────────────────────────
  let oneCOrderNumber: string | null = null;

  try {
    const payload = buildOneCPayload({
      orderId: order.id,
      user: {
        name:  `${contact.firstName} ${contact.lastName}`,
        phone: contact.phone,
        email: contact.email,
        oneCCounterpartyId: null,
      },
      delivery: {
        type:    delivery.type,
        address: delivery.type === 'pickup'      ? 'Самовывоз'
          : delivery.type === 'cdek_pvz'         ? `ПВЗ СДЭК: ${(delivery as { pvzCode: string }).pvzCode}`
          : (delivery as { address: string }).address,
        cdekOrderUuid,
        cost: deliveryCost,
      },
      items: items.map(i => ({
        article:      i.article,
        brand:        i.brand,
        name:         i.name,
        unit:         i.unit,
        source:       i.source,
        priceRetail:  i.priceRetail,
        quantity:     i.quantity,
        deliveryDays: i.deliveryDays,
        qwepOfferSnapshot: i.qwepOfferSnapshot as Record<string, unknown> | null | undefined,
      })),
      subtotal,
      total,
      comment,
    });

    const result = await createOrderIn1C(payload);
    oneCOrderNumber = result.oneCOrderNumber;

    // Сохраняем номер 1С обратно в БД
    await sql`
      UPDATE orders
      SET one_c_order_id = ${result.oneCOrderId},
          one_c_payload  = ${sql.json(payload as any)},
          status         = 'confirmed'
      WHERE id = ${order.id}
    `;
  } catch (err) {
    // 1С недоступна — статус остаётся 'new', менеджер обработает
    console.error('[Orders] 1C error:', err);
  }

  // Логируем создание заказа
  void logActivity({
    userId:    userId,
    userEmail: session?.user.email ?? contact.email,
    userRole:  session?.user.role  ?? 'customer',
    action:    'order_create',
    details:   { orderId: order.id, total, itemCount: items.length, deliveryType: delivery.type },
    ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip'),
  });

  return NextResponse.json({
    success:       true,
    orderId:       order.id,
    oneCOrderNumber,
    cdekOrderUuid,
    total,
  }, { status: 201 });
}

// ── GET /api/orders — история заказов текущего пользователя ──────────────────
export async function GET() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: 'Не авторизован' }, { status: 401 });

  const orders = await sql`
    SELECT
      o.id, o.status, o.delivery_type, o.subtotal, o.delivery_cost, o.total,
      o.one_c_order_id, o.cdek_order_uuid, o.created_at,
      json_agg(json_build_object(
        'article', oi.article, 'brand', oi.brand, 'name', oi.name,
        'quantity', oi.quantity, 'price_retail', oi.price_retail, 'source', oi.source
      ) ORDER BY oi.ctid) AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = ${session.user.id}
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT 50
  `;

  return NextResponse.json({ orders });
}

// ── Вспомогательная функция (перенесена из lib/1c.ts для удобства) ────────────
function buildOneCPayload(params: any): any {
  return (require('@/lib/1c') as any).buildOneCPayload(params);
}
