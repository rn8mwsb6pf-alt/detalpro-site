// lib/qwep.ts — Интеграция с агрегатором поставщиков QWEP
const BASE_URL    = process.env.QWEP_API_URL!;
const TOKEN       = process.env.QWEP_API_TOKEN!;
const MARKUP      = parseFloat(process.env.QWEP_MARKUP_RATIO || '1.35');
const TIMEOUT_MS  = parseInt(process.env.QWEP_SEARCH_TIMEOUT_MS || '8000');

export interface QwepOffer {
  qwepOfferId:      string;
  supplierInternal: string;   // ← только для менеджера (скрываем от покупателя)
  article:          string;
  brand:            string;
  name:             string;
  unit:             string;
  priceInput:       number;   // ← только для менеджера
  priceRetail:      number;   // priceInput × наценка
  quantity:         number;
  deliveryDays:     number;
  warehouseCity:    string;
}

export async function searchQwep(article: string): Promise<QwepOffer[]> {
  const res = await fetch(
    `${BASE_URL}/search?article=${encodeURIComponent(article)}`,
    {
      headers: { Authorization: `Bearer ${TOKEN}` },
      signal: AbortSignal.timeout(TIMEOUT_MS),
      next: { revalidate: 0 },
    }
  );
  if (!res.ok) throw new Error(`QWEP ${res.status}`);

  const data = await res.json() as { offers?: Record<string, unknown>[] };
  return (data.offers ?? []).map(o => ({
    qwepOfferId:      String(o.id),
    supplierInternal: String(o.supplier_name),
    article:          String(o.article).toUpperCase(),
    brand:            String(o.brand),
    name:             String(o.name),
    unit:             String(o.unit ?? 'шт'),
    priceInput:       parseFloat(String(o.price)),
    priceRetail:      Math.round(parseFloat(String(o.price)) * MARKUP * 100) / 100,
    quantity:         parseInt(String(o.quantity)),
    deliveryDays:     Number(o.delivery_days),
    warehouseCity:    String(o.warehouse_city),
  }));
}
