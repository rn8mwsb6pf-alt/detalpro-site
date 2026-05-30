// app/api/admin/orders/[id]/route.ts — PATCH смена статуса заказа
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { logActivity } from '@/lib/activity';
import { sql } from '@/lib/db';

const VALID_STATUSES = ['new','confirmed','paid','assembling','shipped','done','cancelled'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const orderId = parseInt(params.id);
  if (isNaN(orderId)) {
    return NextResponse.json({ error: 'Неверный ID' }, { status: 400 });
  }

  const { status } = await req.json();
  if (!VALID_STATUSES.includes(status)) {
    return NextResponse.json({ error: 'Неверный статус' }, { status: 400 });
  }

  const [order] = await sql`SELECT status FROM orders WHERE id = ${orderId}`;
  if (!order) return NextResponse.json({ error: 'Заказ не найден' }, { status: 404 });

  await sql`UPDATE orders SET status = ${status} WHERE id = ${orderId}`;

  await logActivity({
    userId:    session.user.id,
    userEmail: session.user.email,
    userRole:  session.user.role,
    action:    'status_change',
    details:   { orderId, from: (order as any).status, to: status },
    ipAddress: req.headers.get('x-forwarded-for') ?? req.headers.get('x-real-ip'),
  });

  return NextResponse.json({ success: true });
}
