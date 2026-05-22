'use client';
// components/account/AccountClient.tsx — UI Личного кабинета
import { useState } from 'react';
import { signOut } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './AccountClient.module.css';

const STATUS_LABELS: Record<string, string> = {
  new:        'Новый',
  confirmed:  'Подтверждён',
  paid:       'Оплачен',
  assembling: 'Комплектуется',
  shipped:    'Отправлен',
  done:       'Выполнен',
  cancelled:  'Отменён',
};
const STATUS_COLORS: Record<string, string> = {
  new: 'badge-blue', confirmed: 'badge-blue', paid: 'badge-green',
  assembling: 'badge-amber', shipped: 'badge-amber',
  done: 'badge-green', cancelled: 'badge-accent',
};

interface Profile {
  id: string; email: string; firstName: string | null; lastName: string | null;
  phone: string | null; companyName: string | null; role: string; createdAt: Date;
}

interface Props {
  profile: Profile;
  orders:  Record<string, unknown>[];
}

export function AccountClient({ profile, orders }: Props) {
  const router = useRouter();
  const [tab,  setTab]  = useState<'orders' | 'profile'>('orders');

  const fullName = [profile.firstName, profile.lastName].filter(Boolean).join(' ') || '—';
  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';
  const fmtDate = (d: string | Date) =>
    new Date(d).toLocaleDateString('ru-RU', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className={styles.page}>
      {/* Шапка ЛК */}
      <div className={styles.hero}>
        <div className={styles.heroInner}>
          <div className={styles.avatar}>
            {(profile.firstName?.[0] || profile.email[0]).toUpperCase()}
          </div>
          <div>
            <div className={styles.heroName}>{fullName}</div>
            <div className={styles.heroEmail}>{profile.email}</div>
            {profile.role !== 'customer' && (
              <span className="badge badge-amber" style={{ marginTop: 8, display: 'inline-block' }}>
                {profile.role === 'manager' ? 'Менеджер' : 'Администратор'}
              </span>
            )}
          </div>
          <button
            className="btn btn-ghost btn-sm"
            style={{ marginLeft: 'auto' }}
            onClick={() => signOut({ callbackUrl: '/' })}
          >
            Выйти
          </button>
        </div>
      </div>

      <div className={styles.inner}>
        {/* Табы */}
        <div className={styles.tabs}>
          <button
            className={`${styles.tab} ${tab === 'orders' ? styles.tabActive : ''}`}
            onClick={() => setTab('orders')}
          >
            Мои заказы
            <span className={styles.tabCount}>{orders.length}</span>
          </button>
          <button
            className={`${styles.tab} ${tab === 'profile' ? styles.tabActive : ''}`}
            onClick={() => setTab('profile')}
          >
            Профиль
          </button>
        </div>

        {/* Список заказов */}
        {tab === 'orders' && (
          <div className={styles.ordersList}>
            {orders.length === 0 ? (
              <div className={styles.empty}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
                <div className={styles.emptyTitle}>Заказов пока нет</div>
                <div className={styles.emptySub}>Найдите нужную запчасть и оформите первый заказ</div>
                <button
                  className="btn btn-primary btn-md"
                  style={{ marginTop: 20, width: 200, justifyContent: 'center' }}
                  onClick={() => router.push('/search')}
                >
                  Перейти в каталог
                </button>
              </div>
            ) : orders.map((order) => {
              const status  = String(order.status);
              const items   = (order.items as Record<string,unknown>[]) || [];
              return (
                <div key={String(order.id)} className={styles.orderCard}>
                  <div className={styles.orderHead}>
                    <div>
                      <div className={styles.orderId}>
                        Заказ #{String(order.id).slice(0, 8).toUpperCase()}
                        {!!order.oneCOrderId && (
     <span className={styles.oneCNum}> · {String(order.oneCOrderId)}</span>
   )}
                      </div>
                      <div className={styles.orderDate}>{fmtDate(String(order.createdAt))}</div>
                    </div>
                    <span className={`badge ${STATUS_COLORS[status] || 'badge-blue'}`}>
                      {STATUS_LABELS[status] || status}
                    </span>
                  </div>

                  <div className={styles.orderItems}>
                    {items.slice(0, 3).map((item, i) => (
                      <div key={i} className={styles.orderItem}>
                        <span className={styles.orderItemArticle}>{String(item.article)}</span>
                        <span className={styles.orderItemName}>{String(item.name)}</span>
                        <span className={styles.orderItemQty}>× {String(item.quantity)}</span>
                        <span className={styles.orderItemPrice}>
                          {fmt(Number(item.priceRetail) * Number(item.quantity))}
                        </span>
                      </div>
                    ))}
                    {items.length > 3 && (
                      <div className={styles.moreItems}>+ ещё {items.length - 3} позиций</div>
                    )}
                  </div>

                  <div className={styles.orderFoot}>
                    <div className={styles.orderDelivery}>
                      {String(order.deliveryType) === 'pickup' ? '🏪 Самовывоз'
                       : String(order.deliveryType) === 'cdek_pvz' ? '📦 СДЭК — ПВЗ'
                       : '🚚 СДЭК — Курьер'}
                    </div>
                    <div className={styles.orderTotal}>{fmt(Number(order.total))}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Профиль */}
        {tab === 'profile' && (
          <div className={styles.profileCard}>
            <ProfileField label="Имя"      value={profile.firstName} />
            <ProfileField label="Фамилия"  value={profile.lastName} />
            <ProfileField label="Email"    value={profile.email} />
            <ProfileField label="Телефон"  value={profile.phone} />
            <ProfileField label="Компания" value={profile.companyName} />
            <ProfileField
              label="На сайте с"
              value={fmtDate(profile.createdAt)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileField({ label, value }: { label: string; value: string | null | undefined }) {
  return (
    <div className={styles.profileField}>
      <div className={styles.profileLabel}>{label}</div>
      <div className={styles.profileValue}>{value || <span style={{ color: 'var(--text3)' }}>—</span>}</div>
    </div>
  );
}
