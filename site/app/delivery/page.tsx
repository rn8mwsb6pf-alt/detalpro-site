import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: 'Доставка и оплата',
  description: 'Доставка автозапчастей по всей России через СДЭК. Самовывоз, ПВЗ, курьер.',
};

export default function DeliveryPage() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{
          fontFamily: 'var(--font-head), sans-serif',
          fontWeight: 900, fontSize: 'clamp(36px, 5vw, 56px)',
          color: 'var(--text)', marginBottom: 8,
        }}>
          Доставка и оплата
        </h1>
        <p style={{ color: 'var(--text2)', marginBottom: 40, fontSize: 15 }}>
          Отправляем по всей России. Сроки доставки от 1 рабочего дня.
        </p>

        {/* Delivery options */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: 16, marginBottom: 48 }}>
          {[
            {
              icon: '📦',
              title: 'СДЭК — ПВЗ',
              desc: 'Получите заказ в удобном пункте выдачи СДЭК. Более 5000 ПВЗ по России.',
              note: '1–5 рабочих дней',
              color: 'var(--blue)',
            },
            {
              icon: '🚗',
              title: 'СДЭК — Курьер',
              desc: 'Доставка курьером прямо до двери. Доступно в большинстве городов.',
              note: '1–5 рабочих дней',
              color: 'var(--green)',
            },
            {
              icon: '🏪',
              title: 'Самовывоз',
              desc: 'Заберите заказ самостоятельно. ул. Героев Пионеров, 95, Каменск-Шахтинский.',
              note: 'Бесплатно',
              color: 'var(--accent)',
            },
          ].map((opt) => (
            <div key={opt.title} style={{
              background: 'var(--bg2)', border: '1px solid var(--line)',
              borderRadius: 8, padding: 24,
            }}>
              <div style={{ fontSize: 32, marginBottom: 12 }}>{opt.icon}</div>
              <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--text)', marginBottom: 8 }}>{opt.title}</div>
              <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.6, marginBottom: 12 }}>{opt.desc}</p>
              <span style={{
                fontSize: 11, fontWeight: 700, padding: '3px 10px',
                background: 'var(--bg3)', border: '1px solid var(--line2)',
                borderRadius: 4, color: opt.color,
              }}>{opt.note}</span>
            </div>
          ))}
        </div>

        {/* Cost info */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 8, padding: 32, marginBottom: 32 }}>
          <h2 style={{ fontFamily: 'var(--font-head), sans-serif', fontWeight: 800, fontSize: 24, marginBottom: 16, color: 'var(--text)' }}>
            Стоимость доставки
          </h2>
          <p style={{ color: 'var(--text2)', marginBottom: 12, lineHeight: 1.7 }}>
            Стоимость рассчитывается автоматически при оформлении заказа на основе габаритов, веса и вашего города. Расчёт происходит через официальное API СДЭК.
          </p>
          <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 8 }}>
            <li style={{ fontSize: 14, color: 'var(--text2)' }}>• Минимальная стоимость СДЭК — от 250 ₽</li>
            <li style={{ fontSize: 14, color: 'var(--text2)' }}>• При заказе от 10 000 ₽ — скидка на доставку</li>
            <li style={{ fontSize: 14, color: 'var(--text2)' }}>• Самовывоз из нашего магазина — бесплатно</li>
          </ul>
        </div>

        {/* Payment */}
        <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 8, padding: 32, marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'var(--font-head), sans-serif', fontWeight: 800, fontSize: 24, marginBottom: 16, color: 'var(--text)' }}>
            Способы оплаты
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12 }}>
            {[
              { icon: '💳', label: 'Карта онлайн', note: 'Visa, Mastercard, МИР' },
              { icon: '📱', label: 'СБП', note: 'Система быстрых платежей' },
              { icon: '🏦', label: 'Расчётный счёт', note: 'Для юридических лиц' },
              { icon: '💵', label: 'Наличные', note: 'При самовывозе' },
            ].map((p) => (
              <div key={p.label} style={{
                background: 'var(--bg3)', border: '1px solid var(--line)',
                borderRadius: 6, padding: '14px 16px',
              }}>
                <div style={{ fontSize: 24, marginBottom: 6 }}>{p.icon}</div>
                <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 4 }}>{p.label}</div>
                <div style={{ fontSize: 11, color: 'var(--text3)' }}>{p.note}</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/search" className="btn btn-primary btn-lg">
            Начать поиск запчастей
          </Link>
        </div>
      </main>
    </>
  );
}
