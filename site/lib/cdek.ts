// lib/cdek.ts — Интеграция с API СДЭК v2
const BASE_URL       = process.env.CDEK_API_URL!;
const CLIENT_ID      = process.env.CDEK_CLIENT_ID!;
const CLIENT_SECRET  = process.env.CDEK_CLIENT_SECRET!;

// ── Токен (кэшируем в памяти процесса) ──────────────────────────────────────
let _token: string | null = null;
let _tokenExpiry = 0;

async function getToken(): Promise<string> {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const res = await fetch(`${BASE_URL}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type:    'client_credentials',
      client_id:     CLIENT_ID,
      client_secret: CLIENT_SECRET,
    }),
  });
  if (!res.ok) throw new Error(`CDEK auth failed: ${res.status}`);
  const data = await res.json() as { access_token: string; expires_in: number };
  _token       = data.access_token;
  _tokenExpiry = Date.now() + data.expires_in * 1000 - 60_000; // -1 мин запас
  return _token;
}

async function cdekFetch(path: string, init: RequestInit = {}) {
  const token = await getToken();
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...init.headers,
    },
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`CDEK ${res.status}: ${await res.text()}`);
  return res.json();
}

// ── Типы ────────────────────────────────────────────────────────────────────

export interface CdekPvz {
  code:         string;
  name:         string;
  address:      string;
  city:         string;
  workTime:     string;
  latitude:     number;
  longitude:    number;
}

export interface CdekCalcResult {
  deliverySum:      number;   // стоимость доставки в рублях
  periodMin:        number;   // минимальный срок в рабочих днях
  periodMax:        number;   // максимальный срок
  tariffCode:       number;
}

export interface CdekOrderResult {
  uuid:            string;    // UUID заявки СДЭК
  cdekNumber:      string;    // трек-номер
}

// ── 1. Список ПВЗ ────────────────────────────────────────────────────────────
export async function getPvzList(city?: string): Promise<CdekPvz[]> {
  const params = new URLSearchParams({ type: 'PVZ', is_handout: 'true' });
  if (city) params.set('city', city);
  const data = await cdekFetch(`/deliverypoints?${params}`) as Record<string, unknown>[];
  return (data ?? []).map(p => ({
    code:      String(p.code),
    name:      String(p.name),
    address:   String((p.location as Record<string,unknown>)?.address ?? ''),
    city:      String((p.location as Record<string,unknown>)?.city ?? ''),
    workTime:  String(p.work_time ?? ''),
    latitude:  Number((p.location as Record<string,unknown>)?.latitude ?? 0),
    longitude: Number((p.location as Record<string,unknown>)?.longitude ?? 0),
  }));
}

// ── 2. Расчёт стоимости доставки ─────────────────────────────────────────────
export async function calcDelivery(params: {
  fromCityCode: number;   // код города отправления (Москва = 44)
  toCityCode?:  number;
  toPostalCode?: string;
  weight:       number;   // граммы
  length:       number;   // см
  width:        number;
  height:       number;
  tariffCode:   136 | 137 | 368;
  // 136 = посылка склад-склад (ПВЗ→ПВЗ), 137 = посылка склад-дверь, 368 = курьер-дверь
}): Promise<CdekCalcResult> {
  const body: Record<string, unknown> = {
    tariff_code: params.tariffCode,
    from_location: { code: params.fromCityCode },
    to_location: params.toCityCode
      ? { code: params.toCityCode }
      : { postal_code: params.toPostalCode },
    packages: [{
      weight: params.weight,
      length: params.length,
      width:  params.width,
      height: params.height,
    }],
  };

  const data = await cdekFetch('/calculator/tariff', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as {
    delivery_sum:  number;
    period_min:    number;
    period_max:    number;
    tariff_code:   number;
  };

  return {
    deliverySum: data.delivery_sum,
    periodMin:   data.period_min,
    periodMax:   data.period_max,
    tariffCode:  data.tariff_code,
  };
}

// ── 3. Создание заявки на доставку ───────────────────────────────────────────
export async function createCdekOrder(params: {
  tariffCode: number;
  pvzCode?: string;         // для доставки в ПВЗ
  toAddress?: string;       // для курьерской доставки
  recipient: { name: string; phone: string; email?: string };
  packages: Array<{ weight: number; length: number; width: number; height: number }>;
  comment?: string;
}): Promise<CdekOrderResult> {
  const body: Record<string, unknown> = {
    tariff_code: params.tariffCode,
    comment:     params.comment,
    recipient: {
      name:   params.recipient.name,
      phones: [{ number: params.recipient.phone }],
      email:  params.recipient.email,
    },
    packages: params.packages,
    sender: {
      company: process.env.NEXT_PUBLIC_SITE_NAME || 'ДЕТАЛЬПРО',
    },
  };

  if (params.pvzCode) {
    body.delivery_point = params.pvzCode;
  } else if (params.toAddress) {
    body.to_location = { address: params.toAddress };
  }

  const data = await cdekFetch('/orders', {
    method: 'POST',
    body: JSON.stringify(body),
  }) as { entity?: { uuid: string }; requests?: Array<{ errors?: unknown[] }> };

  if (!data.entity?.uuid) {
    throw new Error('CDEK: не получен UUID заявки');
  }

  // Получаем cdek_number отдельным запросом (СДЭК присваивает с задержкой)
  return {
    uuid:       data.entity.uuid,
    cdekNumber: '',   // будет заполнен вебхуком СДЭК
  };
}

// ── 4. Трекинг заказа ────────────────────────────────────────────────────────
export async function trackOrder(uuid: string) {
  return cdekFetch(`/orders/${uuid}`);
}
