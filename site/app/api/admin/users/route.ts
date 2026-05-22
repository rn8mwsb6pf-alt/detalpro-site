// app/api/admin/users/route.ts — GET список пользователей
import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/db';

export async function GET(req: NextRequest) {
  const session = await getSession();
  if (!session || session.user.role !== 'admin') {
    return NextResponse.json({ error: 'Доступ запрещён' }, { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const q    = searchParams.get('q') ?? '';
  const role = searchParams.get('role') ?? '';

  const users = await sql`
    SELECT
      u.id, u.email, u.first_name, u.last_name,
      u.phone, u.role, u.company_name, u.created_at,
      COUNT(o.id)::int             AS orders_count,
      COALESCE(SUM(o.total), 0)::numeric AS orders_total
    FROM users u
    LEFT JOIN orders o ON o.user_id = u.id
    WHERE
      (${ role ? sql`u.role = ${role}` : sql`TRUE` })
      AND (
        ${ q ? sql`
          u.email        ILIKE ${'%' + q + '%'}
          OR u.first_name  ILIKE ${'%' + q + '%'}
          OR u.last_name   ILIKE ${'%' + q + '%'}
          OR u.company_name ILIKE ${'%' + q + '%'}
        ` : sql`TRUE` }
      )
    GROUP BY u.id
    ORDER BY u.created_at DESC
    LIMIT 300
  `;

  return NextResponse.json({ users });
}
