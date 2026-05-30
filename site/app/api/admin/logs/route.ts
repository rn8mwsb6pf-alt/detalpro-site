// app/api/admin/logs/route.ts — Журнал действий менеджеров
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const email  = searchParams.get('email')  ?? '';
  const action = searchParams.get('action') ?? '';
  const role   = searchParams.get('role')   ?? '';

  const logs = await sql`
    SELECT
      id, user_email, user_role, action, details, ip_address, created_at
    FROM activity_logs
    WHERE
      (${ email  ? sql`user_email ILIKE ${'%' + email + '%'}` : sql`TRUE` })
      AND (${ action ? sql`action = ${action}` : sql`TRUE` })
      AND (${ role   ? sql`user_role = ${role}` : sql`TRUE` })
    ORDER BY created_at DESC
    LIMIT 500
  `;

  return NextResponse.json({ logs });
}
