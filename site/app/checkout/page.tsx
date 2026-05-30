'use client';
import { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useSession } from 'next-auth/react';
import { useCart } from '@/components/cart/CartContext';
import { Header } from '@/components/Header';
import Link from 'next/link';

type DeliveryType = 'pickup' | 'cdek_pvz' | 'cdek_courier';

export default function CheckoutPage() {
  const { items, subtotal, clear } = useCart();
  const { data: session } = useSession();
  const router = useRouter();

  const [firstName, setFirstName] = useState(session?.user.name?.split(' ')[0] ?? '');
  const [lastName,  setLastName]  = useState(session?.user.name?.split(' ').slice(1).join(' ') ?? '');
  const [phone,     setPhone]     = useState('');
  const [email,     setEmail]     = useState(session?.user.email ?? '');
  const [comment,   setComment]   = useState('');

  const [delivery,    setDelivery]    = useState<DeliveryType>('cdek_pvz');
  const [pvzCode,     setPvzCode]     = useState('');
  const [pvzAddress,  setPvzAddress]  = useState('');
  const [courierAddr, setCourierAddr] = useState('');

  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';
  const deliveryCost = delivery === 'pickup' ? 0 : delivery === 'cdek_pvz' ? 299 : 499;
  const total = subtotal + deliveryCost;

  if (items.length === 0) {
    return (
      <>
        <Header />
        <main style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
          <div style={{ fontSize: 56, marginBottom: 16 }}>🛒</div>
          <p style={{ color: 'var(--text2)', marginBottom: 24 }}>Корзина пуста. Добавьте товары перед оформлением.</p>
          <Link href="/search" className="btn btn-primary btn-lg">Перейти в каталог</Link>
        </main>
      </>
    );
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    if (delivery === 'cdek_pvz' && !pvzCode) {
      setError('Выберите пункт выдачи СДЭК');
      return;
    }
    if (delivery === 'cdek_courier' && !courierAddr.trim()) {
      setError('Введите адрес доставки');
      return;
    }

    const deliveryPayload =
      delivery === 'pickup'      ? { type: 'pickup', storeId: '00000000-0000-0000-0000-000000000001' }
      : delivery === 'cdek_pvz'  ? { type: 'cdek_pvz', pvzCode }
      : { type: 'cdek_courier', address: courierAddr };

    setLoading(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contact: { firstName: firstName.trim(), lastName: lastName.trim(), phone: phone.trim(), email: email.trim() },
          delivery: deliveryPayload,
          items: items.map(i => ({
            article: i.article, brand: i.brand, name: i.name, unit: i.unit,
            source: i.source, priceRetail: i.priceRetail, quantity: i.quantity,
            deliveryDays: i.deliveryDays, qwepOfferSnapshot: i.qwepOfferSnapshot ?? null,
          })),
          comment: comment.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Ошибка оформления заказа');

      clear();
      router.push(`/checkout/success?orderId=${data.orderId}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ошибка сервера');
      setLoading(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    background: 'var(--bg3)', border: '1px solid var(--line2)',
    borderRadius: 6, padding: '10px 14px', fontSize: 14,
    color: 'var(--text)', width: '100%', boxSizing: 'border-box',
  };
  const labelStyle: React.CSSProperties = {
    display: 'block', fontSize: 12, fontWeight: 600,
    color: 'var(--text3)', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '.06em',
  };

  return (
    <>
      <Header />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{
          fontFamily: 'var(--font-head), sans-serif',
          fontWeight: 900, fontSize: 'clamp(28px, 4vw, 44px)',
          color: 'var(--text)', marginBottom: 32,
        }}>
          Оформление заказа
        </h1>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 24, alignItems: 'start' }}>
            {/* Left column */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

              {/* Contact */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 8, padding: 24 }}>
                <h2 style={{ fontFamily: 'var(--font-head), sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 20 }}>
                  Контактные данные
                </h2>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  <div>
                    <label style={labelStyle}>Имя *</label>
                    <input required value={firstName} onChange={e => setFirstName(e.target.value)} style={inputStyle} placeholder="Иван" />
                  </div>
                  <div>
                    <label style={labelStyle}>Фамилия *</label>
                    <input required value={lastName} onChange={e => setLastName(e.target.value)} style={inputStyle} placeholder="Петров" />
                  </div>
                  <div>
                    <label style={labelStyle}>Телефон *</label>
                    <input required type="tel" value={phone} onChange={e => setPhone(e.target.value)} style={inputStyle} placeholder="+7 (999) 123-45-67" />
                  </div>
                  <div>
                    <label style={labelStyle}>Email *</label>
                    <input required type="email" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} placeholder="ivan@example.com" />
                  </div>
                </div>
              </div>

              {/* Delivery */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 8, padding: 24 }}>
                <h2 style={{ fontFamily: 'var(--font-head), sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 20 }}>
                  Способ доставки
                </h2>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
                  {([
                    { val: 'cdek_pvz',     label: '📦 СДЭК — Пункт выдачи',  sub: 'от 299 ₽ · 1–5 дней' },
                    { val: 'cdek_courier', label: '🚗 СДЭК — Курьер',         sub: 'от 499 ₽ · 1–5 дней' },
                    { val: 'pickup',       label: '🏪 Самовывоз',              sub: 'Бесплатно · Каменск-Шахтинский' },
                  ] as const).map(opt => (
                    <label key={opt.val} style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      background: delivery === opt.val ? 'var(--accentbg)' : 'var(--bg3)',
                      border: `1px solid ${delivery === opt.val ? 'var(--accent)' : 'var(--line2)'}`,
                      borderRadius: 6, padding: '12px 16px', cursor: 'pointer',
                    }}>
                      <input
                        type="radio" name="delivery" value={opt.val}
                        checked={delivery === opt.val}
                        onChange={() => setDelivery(opt.val)}
                        style={{ accentColor: 'var(--accent)' }}
                      />
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)' }}>{opt.label}</div>
                        <div style={{ fontSize: 12, color: 'var(--text3)' }}>{opt.sub}</div>
                      </div>
                    </label>
                  ))}
                </div>

                {/* CDEK PVZ code input */}
                {delivery === 'cdek_pvz' && (
                  <div>
                    <label style={labelStyle}>Код пункта выдачи СДЭК *</label>
                    <input
                      required value={pvzCode}
                      onChange={e => { setPvzCode(e.target.value); setPvzAddress(''); }}
                      style={inputStyle} placeholder="Например: MSK09"
                    />
                    <p style={{ fontSize: 12, color: 'var(--text3)', marginTop: 6 }}>
                      Найдите ближайший ПВЗ на{' '}
                      <a href="https://www.cdek.ru/ru/offices/" target="_blank" rel="noreferrer" style={{ color: 'var(--accent)' }}>
                        cdek.ru
                      </a>{' '}и введите код.
                    </p>
                  </div>
                )}

                {/* CDEK courier address */}
                {delivery === 'cdek_courier' && (
                  <div>
                    <label style={labelStyle}>Адрес доставки *</label>
                    <input
                      required value={courierAddr}
                      onChange={e => setCourierAddr(e.target.value)}
                      style={inputStyle} placeholder="Москва, ул. Пушкина, д. 1, кв. 5"
                    />
                  </div>
                )}

                {delivery === 'pickup' && (
                  <p style={{ fontSize: 13, color: 'var(--text2)', background: 'var(--bg3)', borderRadius: 6, padding: '10px 14px' }}>
                    📍 ул. Героев Пионеров, 95, Каменск-Шахтинский<br />
                    🕐 Пн–Пт 8:00–19:00 · Сб 9:00–17:00
                  </p>
                )}
              </div>

              {/* Comment */}
              <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 8, padding: 24 }}>
                <h2 style={{ fontFamily: 'var(--font-head), sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 16 }}>
                  Комментарий к заказу
                </h2>
                <textarea
                  value={comment} onChange={e => setComment(e.target.value)}
                  rows={3}
                  style={{ ...inputStyle, resize: 'vertical', height: 'auto', padding: '10px 14px' }}
                  placeholder="Укажите пожелания или дополнительную информацию..."
                />
              </div>
            </div>

            {/* Right: Order summary */}
            <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 8, padding: 24, position: 'sticky', top: 80 }}>
              <div style={{ fontFamily: 'var(--font-head), sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 16 }}>
                Ваш заказ
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16, maxHeight: 200, overflowY: 'auto' }}>
                {items.map(item => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                    <div style={{ fontSize: 12, color: 'var(--text2)', flex: 1 }}>
                      <span style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--accent)' }}>
                        {item.brand} {item.article}
                      </span>
                      <span style={{ color: 'var(--text3)', display: 'block' }}>{item.name}</span>
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text)', whiteSpace: 'nowrap' }}>
                      {item.quantity} × {fmt(item.priceRetail)}
                    </div>
                  </div>
                ))}
              </div>

              <div style={{ borderTop: '1px solid var(--line)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 16 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text2)' }}>
                  <span>Товары:</span><span>{fmt(subtotal)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--text2)' }}>
                  <span>Доставка:</span>
                  <span>{deliveryCost === 0 ? 'Бесплатно' : `от ${fmt(deliveryCost)}`}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 18, fontWeight: 700, color: 'var(--text)', paddingTop: 8, borderTop: '1px solid var(--line)' }}>
                  <span>Итого:</span><span>{fmt(total)}</span>
                </div>
              </div>

              {error && (
                <div style={{
                  background: 'rgba(220,38,38,.1)', border: '1px solid rgba(220,38,38,.3)',
                  color: '#fca5a5', borderRadius: 6, padding: '10px 14px',
                  fontSize: 13, marginBottom: 12,
                }}>
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn btn-primary btn-lg"
                style={{ width: '100%', opacity: loading ? 0.7 : 1 }}
              >
                {loading ? 'Оформляем...' : 'Подтвердить заказ'}
              </button>

              <p style={{ fontSize: 11, color: 'var(--text3)', marginTop: 10, textAlign: 'center' }}>
                Менеджер свяжется с вами для подтверждения
              </p>
            </div>
          </div>
        </form>
      </main>
    </>
  );
}
