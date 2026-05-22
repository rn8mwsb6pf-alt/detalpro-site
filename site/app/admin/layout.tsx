// app/admin/layout.tsx — Лейаут панели администратора (только для роли 'admin')
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { getSession } from '@/lib/auth';
import styles from './admin.module.css';

export const metadata = { title: 'Панель администратора | ДЕТАЛЬПРО' };

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();

  if (!session || session.user.role !== 'admin') {
    redirect('/auth/login?callbackUrl=/admin');
  }

  const navItems = [
    { href: '/admin',         label: '📊  Дашборд'      },
    { href: '/admin/orders',  label: '📦  Заказы'        },
    { href: '/admin/profit',  label: '💰  Прибыль'       },
    { href: '/admin/logs',    label: '📋  Журнал'        },
    { href: '/admin/users',   label: '👥  Пользователи'  },
  ];

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandName}>ДЕТАЛЬПРО</span>
          <span className={styles.badge}>ADMIN</span>
        </div>

        <nav className={styles.nav}>
          {navItems.map(({ href, label }) => (
            <Link key={href} href={href} className={styles.navLink}>
              {label}
            </Link>
          ))}
        </nav>

        <div className={styles.userFooter}>
          <div className={styles.userEmail}>{session.user.email}</div>
          <Link href="/api/auth/signout" className={styles.signOut}>
            ← Выйти
          </Link>
        </div>
      </aside>

      <main className={styles.main}>{children}</main>
    </div>
  );
}
