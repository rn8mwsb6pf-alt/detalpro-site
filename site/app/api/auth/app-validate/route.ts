// POST /api/auth/app-validate
// Используется Electron-приложениями для авторизации через учётные записи сайта.
// Возвращает пользователя без пароля.
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { sql } from '@/lib/db';

const APP_SECRET = process.env.APP_SECRET || 'detalpro-app-2025';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => null);
    if (!body?.email || !body?.password) {
      return NextResponse.json({ ok: false, error: 'Нет данных' }, { status: 400 });
    }

    // Опциональная проверка секрета приложения (можно выключить для dev)
    if (body.appSecret && body.appSecret !== APP_SECRET) {
      return NextResponse.json({ ok: false, error: 'Неверный ключ приложения' }, { status: 403 });
    }

    const [user] = await sql`
      SELECT id, email, password_hash, first_name, last_name, role
      FROM users WHERE email = ${body.email.toLowerCase().trim()} LIMIT 1
    `;

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Пользователь не найден' }, { status: 401 });
    }

    const ok = await bcrypt.compare(body.password, user.password_hash as string);
    if (!ok) {
      return NextResponse.json({ ok: false, error: 'Неверный пароль' }, { status: 401 });
    }

    const name = [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email;

    return NextResponse.json({
      ok: true,
      user: {
        id:    user.id,
        email: user.email,
        name,
        role:  user.role, // 'customer' | 'manager' | 'admin'
      },
    });
  } catch (e) {
    console.error('[app-validate]', e);
    return NextResponse.json({ ok: false, error: 'Ошибка сервера' }, { status: 500 });
  }
}
