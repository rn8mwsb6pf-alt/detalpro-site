// app/api/admin/users/[id]/route.ts — PATCH смена роли пользователя
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/db';

const VALID_ROLES = ['customer', 'manager', 'admin'];

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await getSession();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const userId = parseInt(params.id);
  if (isNaN(userId)) {
    return NextResponse.json({ error: 'Неверный ID' }, { status: 400 });
  }

  const { role } = await req.json();
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Неверная роль' }, { status: 400 });
  }

  await sql`UPDATE users SET role = ${role} WHERE id = ${userId}`;

  return NextResponse.json({ success: true });
}
