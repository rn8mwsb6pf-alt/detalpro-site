'use client';
import { useCart } from '@/components/cart/CartContext';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { Header } from '@/components/Header';
import Link from 'next/link';

export default function CartPage() {
  const { items, remove, setQty, subtotal, clear } = useCart();
  const { data: session } = useSession();
  const router = useRouter();

  const fmt = (n: number) => n.toLocaleString('ru-RU') + ' ₽';

  function handleCheckout() {
    if (!session) {
      router.push('/auth/login?callbackUrl=/cart');
    } else {
      router.push('/checkout');
    }
  }

  return (
    <>
      <Header />
      <main style={{ maxWidth: 1100, margin: '0 auto', padding: '40px 24px' }}>
        <h1 style={{
          fontFamily: 'var(--font-head), sans-serif',
          fontWeight: 900, fontSize: 'clamp(28px, 4vw, 44px)',
          color: 'var(--text)', marginBottom: 32,
        }}>
          Корзина{items.length > 0 && <span style={{ color: 'var(--text3)', marginLeft: 12, fontSize: '60%' }}>{items.length} поз.</span>}
        </h1>

        {items.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '80px 24px' }}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🛒</div>
            <p style={{ color: 'var(--text2)', fontSize: 16, marginBottom: 24 }}>Корзина пуста</p>
            <Link href="/search" className="btn btn-primary btn-lg">
              Перейти в каталог
            </Link>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: 24, alignItems: 'start' }}>
            {/* Items */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {items.map((item) => (
                <div key={item.id} style={{
                  background: 'var(--bg2)', border: '1px solid var(--line)',
                  borderRadius: 8, padding: '16px 20px',
                  display: 'grid', gridTemplateColumns: '1fr auto auto',
                  gap: 16, alignItems: 'center',
                }}>
                  <div>
                    <div style={{ fontFamily: 'var(--font-mono), monospace', fontWeight: 600, color: 'var(--accent)', fontSize: 13 }}>
                      {item.brand} {item.article}
                    </div>
                    <div style={{ fontSize: 14, color: 'var(--text)', marginTop: 2 }}>{item.name}</div>
                    <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>
                      {fmt(item.priceRetail)} / {item.unit}
                      {item.deliveryDays > 0 && ` · Срок: ${item.deliveryDays} дн.`}
                    </div>
                  </div>

                  {/* Qty controls */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <button
                      onClick={() => setQty(item.id, item.quantity - 1)}
                      style={{
                        width: 28, height: 28, borderRadius: 4,
                        background: 'var(--bg3)', border: '1px solid var(--line2)',
                        color: 'var(--text2)', fontSize: 16, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >−</button>
                    <span style={{ minWidth: 24, textAlign: 'center', fontSize: 14, color: 'var(--text)', fontWeight: 600 }}>
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => setQty(item.id, item.quantity + 1)}
                      style={{
                        width: 28, height: 28, borderRadius: 4,
                        background: 'var(--bg3)', border: '1px solid var(--line2)',
                        color: 'var(--text2)', fontSize: 16, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                      }}
                    >+</button>
                  </div>

                  {/* Line total + remove */}
                  <div style={{ textAlign: 'right', minWidth: 90 }}>
                    <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 6 }}>
                      {fmt(item.priceRetail * item.quantity)}
                    </div>
                    <button
                      onClick={() => remove(item.id)}
                      style={{ background: 'none', border: 'none', color: 'var(--text3)', fontSize: 12, cursor: 'pointer' }}
                    >
                      Удалить
                    </button>
                  </div>
                </div>
              ))}

              <button
                onClick={clear}
                style={{
                  background: 'none', border: 'none', color: 'var(--text3)',
                  fontSize: 12, cursor: 'pointer', alignSelf: 'flex-start', marginTop: 4,
                }}
              >
                Очистить корзину
              </button>
            </div>

            {/* Summary */}
            <div style={{
              background: 'var(--bg2)', border: '1px solid var(--line)',
              borderRadius: 8, padding: 24, position: 'sticky', top: 80,
            }}>
              <div style={{ fontFamily: 'var(--font-head), sans-serif', fontWeight: 800, fontSize: 20, color: 'var(--text)', marginBottom: 20 }}>
                Итого
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8, fontSize: 13, color: 'var(--text2)' }}>
                <span>Товаров:</span>
                <span>{items.reduce((s, i) => s + i.quantity, 0)} шт.</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 20, fontSize: 13, color: 'var(--text2)' }}>
                <span>Доставка:</span>
                <span>При оформлении</span>
              </div>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                borderTop: '1px solid var(--line)', paddingTop: 16,
                marginBottom: 20, fontWeight: 700, fontSize: 18, color: 'var(--text)',
              }}>
                <span>Сумма:</span>
                <span>{fmt(subtotal)}</span>
              </div>
              <button
                className="btn btn-primary btn-lg"
                style={{ width: '100%' }}
                onClick={handleCheckout}
              >
                {session ? 'Оформить заказ' : 'Войти и оформить'}
              </button>
              <Link
                href="/search"
                style={{ display: 'block', textAlign: 'center', marginTop: 12, fontSize: 12, color: 'var(--text3)' }}
              >
                Продолжить покупки
              </Link>
            </div>
          </div>
        )}
      </main>
    </>
  );
}
