'use client';
// app/admin/orders/page.tsx — Управление заказами (Client Component)
import { useState, useEffect, useCallback } from 'react';
import styles from '../admin.module.css';

type Order = {
  id: number;
  status: string;
  delivery_type: string;
  subtotal: number;
  delivery_cost: number;
  total: number;
  one_c_order_id: string | null;
  cdek_order_uuid: string | null;
  created_at: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  items: Array<{
    article: string;
    brand: string;
    name: string;
    quantity: number;
    price_retail: number;
    source: string;
  }>;
};

const STATUS_LABEL: Record<string, string> = {
  new: 'Новый', confirmed: 'Подтверждён', paid: 'Оплачен',
  assembling: 'Сборка', shipped: 'Отправлен', done: 'Выполнен', cancelled: 'Отменён',
};

const DELIVERY_LABEL: Record<string, string> = {
  pickup: 'Самовывоз', cdek_pvz: 'СДЭК ПВЗ', cdek_courier: 'СДЭК Курьер',
};

const ALL_STATUSES = ['new','confirmed','paid','assembling','shipped','done','cancelled'];

function statusClass(s: string): string {
  const map: Record<string, string> = {
    new: styles.statusNew, confirmed: styles.statusConfirmed, paid: styles.statusPaid,
    assembling: styles.statusAssembling, shipped: styles.statusShipped,
    done: styles.statusDone, cancelled: styles.statusCancelled,
  };
  return map[s] ?? styles.statusNew;
}

function fmt(v: number | string) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
  }).format(Number(v));
}

function fmtDate(d: string) {
  return new Date(d).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit',
  });
}

export default function AdminOrders() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('');
  const [search, setSearch] = useState('');
  const [expanded, setExpanded] = useState<number | null>(null);
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterStatus) params.set('status', filterStatus);
    if (search)       params.set('q', search);
    const res = await fetch(`/api/admin/orders?${params}`);
    const data = await res.json();
    setOrders(data.orders ?? []);
    setLoading(false);
  }, [filterStatus, search]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  async function changeStatus(id: number, status: string) {
    setUpdatingId(id);
    await fetch(`/api/admin/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    setOrders(prev => prev.map(o => o.id === id ? { ...o, status } : o));
    setUpdatingId(null);
  }

  return (
    <>
      <h1 className={styles.pageTitle}>Заказы</h1>
      <p className={styles.pageSubtitle}>Все заказы покупателей — управление статусами</p>

      <div className={styles.section}>
        <div className={styles.filterBar}>
          <input
            type="text"
            placeholder="Поиск по клиенту, email, №заказа..."
            className={styles.filterInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={filterStatus}
            onChange={e => setFilterStatus(e.target.value)}
          >
            <option value="">Все статусы</option>
            {ALL_STATUSES.map(s => (
              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
            ))}
          </select>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={fetchOrders}>
            Обновить
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#4a5568' }}>
            Всего: {orders.length}
          </span>
        </div>

        <div className={styles.tableWrap}>
          {loading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : orders.length === 0 ? (
            <div className={styles.empty}>Заказы не найдены</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>№</th>
                  <th>Клиент</th>
                  <th>Статус</th>
                  <th>Доставка</th>
                  <th>Сумма</th>
                  <th>Дата</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(o => (
                  <>
                    <tr
                      key={o.id}
                      style={{ cursor: 'pointer' }}
                      onClick={() => setExpanded(expanded === o.id ? null : o.id)}
                    >
                      <td>
                        <strong>#{o.id}</strong>
                        {o.one_c_order_id && (
                          <div className={styles.muted}>1С: {o.one_c_order_id}</div>
                        )}
                      </td>
                      <td>
                        <div>{o.first_name} {o.last_name}</div>
                        <div className={styles.muted}>{o.email}</div>
                        {o.phone && <div className={styles.muted}>{o.phone}</div>}
                      </td>
                      <td>
                        <span className={`${styles.status} ${statusClass(o.status)}`}>
                          {STATUS_LABEL[o.status] ?? o.status}
                        </span>
                      </td>
                      <td>{DELIVERY_LABEL[o.delivery_type] ?? o.delivery_type}</td>
                      <td>
                        <strong>{fmt(o.total)}</strong>
                        {o.delivery_cost > 0 && (
                          <div className={styles.muted}>+ {fmt(o.delivery_cost)} доставка</div>
                        )}
                      </td>
                      <td>{fmtDate(o.created_at)}</td>
                      <td onClick={e => e.stopPropagation()}>
                        <select
                          className={styles.statusSelect}
                          value={o.status}
                          disabled={updatingId === o.id}
                          onChange={e => changeStatus(o.id, e.target.value)}
                        >
                          {ALL_STATUSES.map(s => (
                            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                          ))}
                        </select>
                      </td>
                    </tr>

                    {expanded === o.id && (
                      <tr key={`${o.id}-detail`}>
                        <td colSpan={7} style={{ background: '#0d0f1a', padding: '0' }}>
                          <div style={{ padding: '16px 18px', borderBottom: '1px solid #1e2238' }}>
                            <strong style={{ color: '#e2e8f0', fontSize: 13 }}>Состав заказа:</strong>
                            <table className={styles.table} style={{ marginTop: 10 }}>
                              <thead>
                                <tr>
                                  <th>Артикул</th>
                                  <th>Бренд</th>
                                  <th>Наименование</th>
                                  <th>Кол-во</th>
                                  <th>Цена</th>
                                  <th>Сумма</th>
                                  <th>Источник</th>
                                </tr>
                              </thead>
                              <tbody>
                                {(o.items ?? []).map((item, idx) => (
                                  <tr key={idx}>
                                    <td>{item.article}</td>
                                    <td>{item.brand}</td>
                                    <td>{item.name}</td>
                                    <td>{item.quantity} шт</td>
                                    <td>{fmt(item.price_retail)}</td>
                                    <td>{fmt(item.price_retail * item.quantity)}</td>
                                    <td>
                                      <span className={`${styles.action} ${item.source === 'qwep' ? styles.actionSearch : styles.actionLogin}`}>
                                        {item.source === 'qwep' ? 'QWEP' : '1С'}
                                      </span>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {o.cdek_order_uuid && (
                              <div style={{ marginTop: 10, fontSize: 12, color: '#4a5568' }}>
                                СДЭК UUID: {o.cdek_order_uuid}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
