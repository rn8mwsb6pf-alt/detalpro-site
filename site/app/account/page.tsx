// app/account/page.tsx — Личный кабинет (Server Component)
import { redirect }    from 'next/navigation';
import type { Metadata } from 'next';
import { getSession }  from '@/lib/auth';
import { sql }         from '@/lib/db';
import { AccountClient } from '@/components/account/AccountClient';
import { Header } from '@/components/Header';

export const metadata: Metadata = { title: 'Личный кабинет' };

async function getUserOrders(userId: string) {
  return sql`
    SELECT
      o.id, o.status, o.delivery_type AS "deliveryType",
      o.subtotal, o.delivery_cost AS "deliveryCost", o.total,
      o.one_c_order_id AS "oneCOrderId",
      o.cdek_order_uuid AS "cdekOrderUuid",
      o.created_at AS "createdAt",
      json_agg(json_build_object(
        'article', oi.article, 'brand', oi.brand, 'name', oi.name,
        'quantity', oi.quantity, 'priceRetail', oi.price_retail, 'source', oi.source
      ) ORDER BY oi.ctid) AS items
    FROM orders o
    LEFT JOIN order_items oi ON oi.order_id = o.id
    WHERE o.user_id = ${userId}
    GROUP BY o.id
    ORDER BY o.created_at DESC
    LIMIT 30
  `;
}

async function getUserProfile(userId: string) {
  const [user] = await sql`
    SELECT id, email, first_name AS "firstName", last_name AS "lastName",
           phone, company_name AS "companyName", role, created_at AS "createdAt"
    FROM users WHERE id = ${userId}
  `;
  return user;
}

export default async function AccountPage() {
  const session = await getSession();

  // Не авторизован → редирект на логин
  if (!session) redirect('/auth/login?callbackUrl=/account');

  const [orders, profile] = await Promise.all([
    getUserOrders(session.user.id),
    getUserProfile(session.user.id),
  ]);

  return (
    <>
      <Header />
      <AccountClient
        profile={profile as {
        id: string; email: string; firstName: string | null;
        lastName: string | null; phone: string | null;
        companyName: string | null; role: string; createdAt: Date;
      }}
        orders={orders as Record<string, unknown>[]}
      />
    </>
  );
}
