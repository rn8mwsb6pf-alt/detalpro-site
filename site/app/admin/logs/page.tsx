'use client';
// app/admin/logs/page.tsx — Журнал действий менеджеров
import { useState, useEffect, useCallback } from 'react';
import styles from '../admin.module.css';

type LogEntry = {
  id: number;
  user_email: string | null;
  user_role: string | null;
  action: string;
  details: Record<string, unknown>;
  ip_address: string | null;
  created_at: string;
};

const ACTION_LABEL: Record<string, string> = {
  search:        'Поиск',
  order_create:  'Создание заказа',
  status_change: 'Смена статуса',
  login:         'Вход',
  view_prices:   'Просмотр цен',
};

function fmtDate(d: string) {
  return new Date(d).toLocaleString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

function actionClass(action: string): string {
  const map: Record<string, string> = {
    search:        styles.actionSearch,
    order_create:  styles.actionOrder,
    status_change: styles.actionStatus,
    login:         styles.actionLogin,
  };
  return map[action] ?? styles.actionDefault;
}

function roleClass(role: string | null): string {
  const map: Record<string, string> = {
    admin:    styles.roleAdmin,
    manager:  styles.roleManager,
    customer: styles.roleCustomer,
  };
  return map[role ?? ''] ?? styles.roleCustomer;
}

function formatDetails(details: Record<string, unknown>): string {
  if (!details || Object.keys(details).length === 0) return '—';
  const parts: string[] = [];
  if (details.query)   parts.push(`Запрос: "${details.query}"`);
  if (details.orderId) parts.push(`Заказ #${details.orderId}`);
  if (details.status)  parts.push(`Статус: ${details.status}`);
  if (details.from && details.to) parts.push(`${details.from} → ${details.to}`);
  if (details.results) parts.push(`Найдено: ${details.results}`);
  return parts.join('; ') || JSON.stringify(details).slice(0, 80);
}

export default function AdminLogs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmail, setFilterEmail] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterRole, setFilterRole] = useState('');

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filterEmail)  params.set('email', filterEmail);
    if (filterAction) params.set('action', filterAction);
    if (filterRole)   params.set('role', filterRole);
    const res = await fetch(`/api/admin/logs?${params}`);
    const data = await res.json();
    setLogs(data.logs ?? []);
    setLoading(false);
  }, [filterEmail, filterAction, filterRole]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  return (
    <>
      <h1 className={styles.pageTitle}>Журнал действий</h1>
      <p className={styles.pageSubtitle}>История действий менеджеров: поиски, заказы, изменения статусов</p>

      <div className={styles.section}>
        <div className={styles.filterBar}>
          <input
            type="text"
            placeholder="Email пользователя..."
            className={styles.filterInput}
            value={filterEmail}
            onChange={e => setFilterEmail(e.target.value)}
          />
          <select
            className={styles.filterSelect}
            value={filterAction}
            onChange={e => setFilterAction(e.target.value)}
          >
            <option value="">Все действия</option>
            {Object.entries(ACTION_LABEL).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <select
            className={styles.filterSelect}
            value={filterRole}
            onChange={e => setFilterRole(e.target.value)}
          >
            <option value="">Все роли</option>
            <option value="admin">Администратор</option>
            <option value="manager">Менеджер</option>
            <option value="customer">Клиент</option>
          </select>
          <button className={`${styles.btn} ${styles.btnSecondary}`} onClick={fetchLogs}>
            Обновить
          </button>
          <span style={{ marginLeft: 'auto', fontSize: 12, color: '#4a5568' }}>
            Записей: {logs.length}
          </span>
        </div>

        <div className={styles.tableWrap}>
          {loading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : logs.length === 0 ? (
            <div className={styles.empty}>Записей нет</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Время</th>
                  <th>Пользователь</th>
                  <th>Роль</th>
                  <th>Действие</th>
                  <th>Детали</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {logs.map(l => (
                  <tr key={l.id}>
                    <td style={{ whiteSpace: 'nowrap' }}>{fmtDate(l.created_at)}</td>
                    <td>{l.user_email ?? <span className={styles.muted}>Аноним</span>}</td>
                    <td>
                      {l.user_role && (
                        <span className={`${styles.role} ${roleClass(l.user_role)}`}>
                          {l.user_role}
                        </span>
                      )}
                    </td>
                    <td>
                      <span className={`${styles.action} ${actionClass(l.action)}`}>
                        {ACTION_LABEL[l.action] ?? l.action}
                      </span>
                    </td>
                    <td style={{ maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {formatDetails(l.details)}
                    </td>
                    <td className={styles.muted}>{l.ip_address ?? '—'}</td>
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
