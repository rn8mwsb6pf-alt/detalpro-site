// app/admin/page.tsx — Главный дашборд (Server Component)
import Link from 'next/link';
import { sql } from '@/lib/db';
import styles from './admin.module.css';

export default async function AdminDashboard() {
  const [todayRow, weekRow, statusRows, recentOrders] = await Promise.all([
    sql`
      SELECT COUNT(*)::int AS cnt, COALESCE(SUM(total), 0)::numeric AS rev
      FROM orders WHERE created_at >= CURRENT_DATE
    `,
    sql`
      SELECT COALESCE(SUM(total), 0)::numeric AS rev
      FROM orders
      WHERE created_at >= CURRENT_DATE - INTERVAL '7 days'
        AND status NOT IN ('cancelled')
    `,
    sql`
      SELECT status, COUNT(*)::int AS cnt
      FROM orders GROUP BY status ORDER BY cnt DESC
    `,
    sql`
      SELECT o.id, o.status, o.total, o.created_at, o.delivery_type,
             u.email, u.first_name, u.last_name
      FROM orders o
      LEFT JOIN users u ON u.id = o.user_id
      ORDER BY o.created_at DESC LIMIT 12
    `,
  ]);

  return (
    <>
      <h1 className={styles.pageTitle}>Дашборд</h1>
      <p className={styles.pageSubtitle}>Добро пожаловать в панель администратора</p>

      <div className={styles.statsGrid}>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Заказов сегодня</div>
          <div className={styles.statValue}>{(todayRow[0] as any)?.cnt ?? 0}</div>
          <div className={styles.statSub}>{fmt((todayRow[0] as any)?.rev ?? 0)}</div>
        </div>
        <div className={styles.statCard}>
          <div className={styles.statLabel}>Выручка 7 дней</div>
          <div className={styles.statValue}>{fmt((weekRow[0] as any)?.rev ?? 0)}</div>
        </div>
        {(statusRows as any[]).map((r) => (
          <div key={r.status} className={styles.statCard}>
            <div className={styles.statLabel}>{STATUS_LABEL[r.status] ?? r.status}</div>
            <div className={styles.statValue}>{r.cnt}</div>
          </div>
        ))}
      </div>

      <div className={styles.section}>
        <div className={styles.sectionHeader}>
          <span className={styles.sectionTitle}>Последние заказы</span>
          <Link href="/admin/orders" className={`${styles.btn} ${styles.btnSecondary}`}>
            Все заказы →
          </Link>
        </div>
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>№</th>
                <th>Клиент</th>
                <th>Статус</th>
                <th>Доставка</th>
                <th>Сумма</th>
                <th>Дата</th>
              </tr>
            </thead>
            <tbody>
              {(recentOrders as any[]).map((o) => (
                <tr key={o.id}>
                  <td>#{o.id}</td>
                  <td>
                    <div>{o.first_name} {o.last_name}</div>
                    <div className={styles.muted}>{o.email}</div>
                  </td>
                  <td>
                    <span className={`${styles.status} ${statusClass(o.status)}`}>
                      {STATUS_LABEL[o.status] ?? o.status}
                    </span>
                  </td>
                  <td>{DELIVERY_LABEL[o.delivery_type] ?? o.delivery_type}</td>
                  <td>{fmt(o.total)}</td>
                  <td>{fmtDate(o.created_at)}</td>
                </tr>
              ))}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className={styles.empty}>Заказов пока нет</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function fmt(v: number | string) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
  }).format(Number(v));
}

function fmtDate(d: string | Date) {
  return new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function statusClass(s: string): string {
  const map: Record<string, string> = {
    new:        styles.statusNew,
    confirmed:  styles.statusConfirmed,
    paid:       styles.statusPaid,
    assembling: styles.statusAssembling,
    shipped:    styles.statusShipped,
    done:       styles.statusDone,
    cancelled:  styles.statusCancelled,
  };
  return map[s] ?? styles.statusNew;
}

const STATUS_LABEL: Record<string, string> = {
  new: 'Новый', confirmed: 'Подтверждён', paid: 'Оплачен',
  assembling: 'Сборка', shipped: 'Отправлен', done: 'Выполнен', cancelled: 'Отменён',
};

const DELIVERY_LABEL: Record<string, string> = {
  pickup: 'Самовывоз', cdek_pvz: 'СДЭК ПВЗ', cdek_courier: 'СДЭК Курьер',
};

// Нужен для CSS Modules (динамические имена классов через styles.xxx)
// eslint-disable-next-line @typescript-eslint/no-unused-vars
const styles_ref = styles;
