// lib/db.ts — Подключение к PostgreSQL (singleton + пул соединений)
import postgres from 'postgres';

declare global { var __sql: postgres.Sql | undefined; }

function createSql() {
  if (!process.env.DATABASE_URL) throw new Error('DATABASE_URL не задан в .env.local');
  return postgres(process.env.DATABASE_URL, {
    max: 20,
    idle_timeout: 30,
    connect_timeout: 10,
    transform: { column: postgres.toCamel },
  });
}

export const sql =
  process.env.NODE_ENV === 'production'
    ? createSql()
    : (global.__sql ??= createSql());

// ── Типы таблиц ──────────────────────────────────────────────────────────────

export type UserRole = 'customer' | 'manager' | 'admin';

export interface DbUser {
  id: string;
  email: string;
  phone: string | null;
  passwordHash: string;
  role: UserRole;
  firstName: string | null;
  lastName: string | null;
  companyName: string | null;
  oneCCounterpartyId: string | null;
  createdAt: Date;
}

export interface DbProduct {
  id: string;
  article: string;
  brand: string | null;
  name: string;
  unit: string;
  priceRetail: number;
  priceWholesale: number;
  stockQuantity: number;
  warehouseCode: string | null;
  syncedFrom1cAt: Date | null;
}

export interface DbOrder {
  id: string;
  userId: string | null;
  status: string;
  deliveryType: string;
  storeId: string | null;
  deliveryAddress: string | null;
  cdekPvzCode: string | null;
  deliveryCost: number;
  subtotal: number;
  total: number;
  cdekOrderUuid: string | null;
  oneCOrderId: string | null;
  createdAt: Date;
}
