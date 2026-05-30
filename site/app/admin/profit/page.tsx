'use client';
// app/admin/profit/page.tsx — Отчёт о прибыли (Client Component)
import { useState, useEffect, useCallback } from 'react';
import styles from '../admin.module.css';

type ProfitRow = {
  id: number;
  created_at: string;
  status: string;
  revenue: number;
  delivery_revenue: number;
  cost_goods: number;
  profit: number;
  customer_name: string;
  customer_email: string;
};

function fmt(v: number | string) {
  return new Intl.NumberFormat('ru-RU', {
    style: 'currency', currency: 'RUB', maximumFractionDigits: 0,
  }).format(Number(v));
}

function fmtDate(d: string) {
  return new Date(d).toLocaleDateString('ru-RU', {
    day: '2-digit', month: '2-digit', year: '2-digit',
  });
}

function todayMinus(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().slice(0, 10);
}

export default function AdminProfit() {
  const today = new Date().toISOString().slice(0, 10);
  const [from, setFrom] = useState(todayMinus(30));
  const [to, setTo] = useState(today);
  const [commission, setCommission] = useState(10);
  const [rows, setRows] = useState<ProfitRow[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams({ from, to });
    const res = await fetch(`/api/admin/profit?${params}`);
    const data = await res.json();
    setRows(data.rows ?? []);
    setLoading(false);
  }, [from, to]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Итоги
  const totalRevenue    = rows.reduce((s, r) => s + Number(r.revenue) + Number(r.delivery_revenue), 0);
  const totalCost       = rows.reduce((s, r) => s + Number(r.cost_goods), 0);
  const totalProfit     = rows.reduce((s, r) => s + Number(r.profit), 0);
  const totalCommission = totalProfit * (commission / 100);
  const marginPct       = totalRevenue > 0 ? (totalProfit / totalRevenue * 100).toFixed(1) : '0';

  function exportCsv() {
    const header = ['№', 'Дата', 'Клиент', 'Выручка', 'Себестоимость', 'Прибыль', `Комиссия ${commission}%`, 'Маржа %'];
    const csvRows = rows.map(r => {
      const rev = Number(r.revenue) + Number(r.delivery_revenue);
      const prof = Number(r.profit);
      const margin = rev > 0 ? (prof / rev * 100).toFixed(1) : '0';
      return [
        r.id, fmtDate(r.created_at), r.customer_name || r.customer_email,
        Number(r.revenue).toFixed(2), Number(r.cost_goods).toFixed(2),
        prof.toFixed(2), (prof * commission / 100).toFixed(2), margin,
      ].join(';');
    });
    const totalsLine = [
      'ИТОГО', '', '',
      totalRevenue.toFixed(2), totalCost.toFixed(2),
      totalProfit.toFixed(2), totalCommission.toFixed(2), marginPct,
    ].join(';');

    const blob = new Blob(
      ['﻿' + [header.join(';'), ...csvRows, totalsLine].join('\n')],
      { type: 'text/csv;charset=utf-8' },
    );
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `profit_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <h1 className={styles.pageTitle}>Отчёт по прибыли</h1>
      <p className={styles.pageSubtitle}>Выручка, себестоимость, прибыль и комиссия продавца</p>

      <div className={styles.section}>
        {/* Фильтры */}
        <div className={styles.filterBar}>
          <label style={{ fontSize: 12, color: '#94a3b8' }}>С</label>
          <input
            type="date" value={from} onChange={e => setFrom(e.target.value)}
            className={styles.filterInput} style={{ minWidth: 'auto', width: 130 }}
          />
          <label style={{ fontSize: 12, color: '#94a3b8' }}>По</label>
          <input
            type="date" value={to} onChange={e => setTo(e.target.value)}
            className={styles.filterInput} style={{ minWidth: 'auto', width: 130 }}
          />
          <button className={`${styles.btn} ${styles.btnPrimary}`} onClick={fetchData}>
            Применить
          </button>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => { setFrom(todayMinus(30)); setTo(today); }}
          >
            30 дней
          </button>
          <button
            className={`${styles.btn} ${styles.btnSecondary}`}
            onClick={() => { setFrom(todayMinus(7)); setTo(today); }}
          >
            7 дней
          </button>
          <button
            className={`${styles.btn} ${styles.btnGreen}`}
            style={{ marginLeft: 'auto' }}
            onClick={exportCsv}
          >
            ⬇ Экспорт CSV
          </button>
        </div>

        {/* Комиссия */}
        <div className={styles.commissionBar}>
          <span className={styles.commissionLabel}>Комиссия продавца, %:</span>
          <input
            type="number" min={0} max={100} step={0.5}
            value={commission}
            onChange={e => setCommission(Number(e.target.value))}
            className={styles.commissionInput}
          />
          <span className={styles.commissionLabel} style={{ color: '#4a5568' }}>
            (от чистой прибыли)
          </span>
        </div>

        {/* Таблица */}
        <div className={styles.tableWrap}>
          {loading ? (
            <div className={styles.loading}>Загрузка...</div>
          ) : rows.length === 0 ? (
            <div className={styles.empty}>Нет данных за выбранный период</div>
          ) : (
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>№ заказа</th>
                  <th>Дата</th>
                  <th>Клиент</th>
                  <th>Выручка</th>
                  <th>Себестоимость</th>
                  <th>Чистая прибыль</th>
                  <th>Комиссия ({commission}%)</th>
                  <th>Маржа</th>
                </tr>
              </thead>
              <tbody>
                {rows.map(r => {
                  const rev    = Number(r.revenue) + Number(r.delivery_revenue);
                  const cost   = Number(r.cost_goods);
                  const profit = Number(r.profit);
                  const comm   = profit * (commission / 100);
                  const margin = rev > 0 ? (profit / rev * 100).toFixed(1) : '0';
                  return (
                    <tr key={r.id}>
                      <td>#{r.id}</td>
                      <td>{fmtDate(r.created_at)}</td>
                      <td>
                        <div>{r.customer_name}</div>
                        <div className={styles.muted}>{r.customer_email}</div>
                      </td>
                      <td>{fmt(rev)}</td>
                      <td className={styles.profitNeg}>{fmt(cost)}</td>
                      <td className={profit >= 0 ? styles.profitPos : styles.profitNeg}>
                        {fmt(profit)}
                      </td>
                      <td style={{ color: '#fb923c' }}>{fmt(comm)}</td>
                      <td style={{ color: '#94a3b8' }}>{margin}%</td>
                    </tr>
                  );
                })}
                {/* Итоговая строка */}
                <tr className={styles.totalsRow}>
                  <td colSpan={3}><strong>ИТОГО ({rows.length} заказов)</strong></td>
                  <td><strong>{fmt(totalRevenue)}</strong></td>
                  <td className={styles.profitNeg}><strong>{fmt(totalCost)}</strong></td>
                  <td className={styles.profitPos}><strong>{fmt(totalProfit)}</strong></td>
                  <td style={{ color: '#fb923c' }}><strong>{fmt(totalCommission)}</strong></td>
                  <td style={{ color: '#94a3b8' }}><strong>{marginPct}%</strong></td>
                </tr>
              </tbody>
            </table>
          )}
        </div>

        {/* Итоговые карточки */}
        {!loading && rows.length > 0 && (
          <div className={styles.totalSummary}>
            <div className={styles.totalItem}>
              <span className={styles.totalItemLabel}>Выручка</span>
              <span className={styles.totalItemValue}>{fmt(totalRevenue)}</span>
            </div>
            <div className={styles.totalItem}>
              <span className={styles.totalItemLabel}>Себестоимость</span>
              <span className={`${styles.totalItemValue} ${styles.totalItemRed}`}>{fmt(totalCost)}</span>
            </div>
            <div className={styles.totalItem}>
              <span className={styles.totalItemLabel}>Чистая прибыль</span>
              <span className={`${styles.totalItemValue} ${styles.totalItemGreen}`}>{fmt(totalProfit)}</span>
            </div>
            <div className={styles.totalItem}>
              <span className={styles.totalItemLabel}>К выплате продавцу ({commission}%)</span>
              <span className={styles.totalItemValue} style={{ color: '#fb923c' }}>{fmt(totalCommission)}</span>
            </div>
            <div className={styles.totalItem}>
              <span className={styles.totalItemLabel}>Средняя маржа</span>
              <span className={styles.totalItemValue}>{marginPct}%</span>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
