// scripts/seed-admin.ts — Создаёт администратора в БД
// Запуск: npx ts-node --project tsconfig.json scripts/seed-admin.ts
//
// Логин: artem   Пароль: a050525A

import bcrypt from 'bcryptjs';
import { sql } from '../lib/db';

async function main() {
  const email    = 'artem';
  const password = 'a050525A';
  const hash     = await bcrypt.hash(password, 12);

  const [existing] = await sql`SELECT id FROM users WHERE email = ${email}`;

  if (existing) {
    await sql`
      UPDATE users
      SET password_hash = ${hash}, role = 'admin',
          first_name = 'Артём', last_name = 'Администратор'
      WHERE email = ${email}
    `;
    console.log(`✅ Пользователь "${email}" обновлён. Роль: admin`);
  } else {
    await sql`
      INSERT INTO users (email, password_hash, first_name, last_name, role)
      VALUES (${email}, ${hash}, 'Артём', 'Администратор', 'admin')
    `;
    console.log(`✅ Создан пользователь "${email}". Роль: admin`);
  }

  console.log(`   Логин:   ${email}`);
  console.log(`   Пароль:  ${password}`);
  console.log(`   Войти:   /auth/login`);
  console.log(`   Панель:  /admin`);

  process.exit(0);
}

main().catch(err => {
  console.error('❌ Ошибка:', err);
  process.exit(1);
});
