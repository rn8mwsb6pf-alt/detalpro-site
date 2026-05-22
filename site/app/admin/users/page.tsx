'use client';
// app/admin/users/page.tsx — Управление пользователями
import { useState, useEffect, useCallback } from 'react';
import styles from '../admin.module.css';

type User = {
  id: number;
  email: string;
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  role: string;
  company_name: string | null;
  created_at: string;
  orders_count: number;
  orders_total: number;
};

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
}

function fmt(v: number) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
  }).format(v);
}

function roleClass(role: string): string {
  const map: Record<string, string> = {
    admin: styles.roleAdmin, manager: styles.roleManager, customer: styles.roleCustomer,
  };
  return map[role] ?? styles.roleCustomer;
}

const ROLE_LABEL: Record<string, string> = {
  customer: 'Клиент', manager: 'Менеджер', admin: 'Администратор',
};

export default function AdminUsers() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [updatingId, setUpdatingId] = useState<number | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (search)     params.set('q', search);
    if (filterRole) params.set('role', filterRole);
    const res = await fetch(`/api/admin/users?${params}`);
    const data = await res.json();
    setUsers(data.users ?? []);
    setLoading(false);
  }, [search, filterRole]);

  useEffect(() => { fetchUsers(); }, [fetchUsers]);

  async function changeRole(id: number, role: string) {
    setUpdatingId(id);
    await fetch(`/api/admin/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    setUsers(prev => prev.map(u => u.id === id ? { ...u, role } : u));
    setUpdatingId(null);
  }

  return (
    <>
      <h1 className={styles.pageTitle}>Пользователи</h1>
      <p className={styles.pageSubtitle}>Клиенты и менеджеры — управление ролями</p>

      <div className={styles.section}>
        <div className={styles.filterBar}>
          <input
            type="text"
            placeholder="Поиск по email, имени, компании..."
            className={styles.filterInput}
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="">Все роли</option>
            <option value="customer">Клиент</option>
            <option value="manager">Менеджер</option>
            <option value="admin">Администратор</option>
          </select>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={fetchUsers}>
            Обновить
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#4a5568' }}>
            Всего: {users.length}
          </span>
        </div>

        <div className={styles.tableWrap}>
          {loading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : users.length === 0 ? (
            <div className={styles.empty}>Пользователи не найдены</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Пользователь</th>
                  <th>Контакты</th>
                  <th>Компания</th>
                  <th>Роль</th>
                  <th>Заказов</th>
                  <th>Сумма заказов</th>
                  <th>Дата регистрации</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td className={styles.muted}>#{u.id}</td>
                    <td>
                      <div>{u.first_name} {u.last_name}</div>
                      <div className={styles.muted}>{u.email}</div>
                    </td>
                    <td className={styles.muted}>{u.phone ?? '—'}</td>
                    <td className={styles.muted}>{u.company_name ?? '—'}</td>
                    <td>
                      <span className={`${styles.role} ${roleClass(u.role)}`}>
                        {ROLE_LABEL[u.role] ?? u.role}
                      </span>
                    </td>
                    <td>{u.orders_count}</td>
                    <td>{u.orders_total > 0 ? fmt(u.orders_total) : '—'}</td>
                    <td>{fmtDate(u.created_at)}</td>
                    <td>
                      <select
                        className={styles.statusSelect}
                        value={u.role}
                        disabled={updatingId === u.id}
                        onChange={e => changeRole(u.id, e.target.value)}
                      >
                        <option value="customer">Клиент</option>
                        <option value="manager">Менеджер</option>
                        <option value="admin">Администратор</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </>
  );
}
