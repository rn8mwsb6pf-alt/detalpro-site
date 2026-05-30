// app/api/cdek/pvz/route.ts
// GET /api/cdek/pvz?city=Москва
import { NextRequest, NextResponse } from 'next/server';
import { getPvzList } from '@/lib/cdek';
import { cacheGet, cacheSet } from '@/lib/redis';

export async function GET(req: NextRequest) {
  const city = req.nextUrl.searchParams.get('city') || 'Москва';
  const key  = `cdek:pvz:${city.toLowerCase()}`;

  const cached = await cacheGet(key);
  if (cached) return NextResponse.json(cached, { headers: { 'X-Cache': 'HIT' } });

  try {
    const pvzList = await getPvzList(city);
    await cacheSet(key, pvzList, 3600); // кэшируем ПВЗ на 1 час
    return NextResponse.json(pvzList);
  } catch (err) {
    console.error('[CDEK PVZ]', err);
    return NextResponse.json({ error: 'Не удалось загрузить список ПВЗ' }, { status: 502 });
  }
}
