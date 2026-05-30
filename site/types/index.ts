// types/index.ts — Общие типы приложения

// ── Результаты поиска ────────────────────────────────────────────────────────

export type ProductSource = '1c' | 'qwep';
export type Availability  = 'in_stock' | 'out_of_stock' | 'order';

export interface SearchResultItem {
  id:           string;       // uuid или qwep_offer_id
  source:       ProductSource;
  article:      string;
  brand:        string;
  name:         string;
  unit:         string;
  priceRetail:  number;
  quantity:     number;
  availability: Availability;
  deliveryDays: number;

  // Только для менеджера (null для покупателя)
  priceWholesale?:  number | null;
  priceInput?:      number | null;
  supplierInternal?: string | null;
  warehouseCode?:   string | null;
  warehouseCity?:   string | null;
  qwepOfferId?:     string | null;

  // Только для покупателя, если товар под заказ
  cta?: {
    type:        'call_manager';
    message:     string;
    phone:       string;
    phoneLabel:  string;
    deliveryHint: string;
  } | null;

  // Снимок оффера QWEP для сохранения в корзине/заказе
  qwepOfferSnapshot?: Record<string, unknown> | null;
}

export interface SearchResponse {
  query:   string;
  total:   number;
  sources: { localCount: number; qwepCount: number };
  items:   SearchResultItem[];
}

// ── Корзина ──────────────────────────────────────────────────────────────────

export interface CartItem {
  id:          string;
  article:     string;
  brand:       string;
  name:        string;
  unit:        string;
  source:      ProductSource;
  priceRetail: number;
  quantity:    number;
  deliveryDays: number;
  qwepOfferSnapshot?: Record<string, unknown> | null;
}

// ── Доставка ─────────────────────────────────────────────────────────────────

export type DeliveryType = 'pickup' | 'cdek_pvz' | 'cdek_courier';

export interface PvzPoint {
  code:      string;
  name:      string;
  address:   string;
  city:      string;
  workTime:  string;
  latitude:  number;
  longitude: number;
}

export interface Store {
  id:       string;
  name:     string;
  address:  string;
  lat:      number;
  lng:      number;
  phone:    string;
}

// ── Заказ ────────────────────────────────────────────────────────────────────

export type OrderStatus =
  | 'new' | 'confirmed' | 'paid' | 'assembling'
  | 'shipped' | 'done' | 'cancelled';

export interface Order {
  id:           string;
  status:       OrderStatus;
  deliveryType: DeliveryType;
  items:        CartItem[];
  subtotal:     number;
  deliveryCost: number;
  total:        number;
  oneCOrderId:  string | null;
  createdAt:    string;
}
