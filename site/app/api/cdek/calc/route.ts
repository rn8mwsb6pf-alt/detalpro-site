// app/api/cdek/calc/route.ts
// POST /api/cdek/calc — расчёт стоимости доставки
import { NextRequest, NextResponse } from 'next/server';
import { calcDelivery } from '@/lib/cdek';
import { z } from 'zod';

const schema = z.object({
  deliveryType: z.enum(['cdek_pvz', 'cdek_courier']),
  toCityCode:   z.number().int().optional(),
  toPostalCode: z.string().optional(),
  weight:       z.number().positive().default(1000), // граммы
});

export async function POST(req: NextRequest) {
  const body  = await req.json().catch(() => ({}));
  const parse = schema.safeParse(body);
  if (!parse.success) return NextResponse.json({ error: 'Некорректные данные' }, { status: 400 });

  const { deliveryType, toCityCode, toPostalCode, weight } = parse.data;

  try {
    const result = await calcDelivery({
      fromCityCode: 44,           // Москва — город отправления по умолчанию
      toCityCode,
      toPostalCode,
      weight,
      length: 20, width: 20, height: 10,
      tariffCode: deliveryType === 'cdek_pvz' ? 136 : 137,
    });
    return NextResponse.json(result);
  } catch (err) {
    console.error('[CDEK Calc]', err);
    return NextResponse.json({ error: 'Ошибка расчёта доставки' }, { status: 502 });
  }
}
