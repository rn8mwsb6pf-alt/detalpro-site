// app/api/auth/register/route.ts
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { sql } from '@/lib/db';

const schema = z.object({
  email:     z.string().email('Некорректный email'),
  password:  z.string().min(8, 'Минимум 8 символов'),
  firstName: z.string().min(1).max(100),
  lastName:  z.string().min(1).max(100),
  phone:     z.string().regex(/^\+?[\d\s\-()]{7,20}$/).optional(),
});

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const parse = schema.safeParse(body);
  if (!parse.success) {
    return NextResponse.json(
      { error: parse.error.errors[0].message },
      { status: 422 }
    );
  }

  const { email, password, firstName, lastName, phone } = parse.data;

  // Проверяем дубликат
  const [existing] = await sql`
    SELECT id FROM users WHERE email = ${email.toLowerCase()} LIMIT 1
  `;
  if (existing) {
    return NextResponse.json({ error: 'Пользователь с таким email уже существует' }, { status: 409 });
  }

  const hash = await bcrypt.hash(password, 12);

  const [user] = await sql`
    INSERT INTO users (email, password_hash, first_name, last_name, phone, role)
    VALUES (
      ${email.toLowerCase()}, ${hash},
      ${firstName}, ${lastName},
      ${phone ?? null}, 'customer'
    )
    RETURNING id, email, first_name, last_name, role
  `;

  return NextResponse.json({ success: true, userId: user.id }, { status: 201 });
}
