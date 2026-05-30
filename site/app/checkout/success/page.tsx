'use client';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { Header } from '@/components/Header';
import Link from 'next/link';

function SuccessContent() {
  const searchParams = useSearchParams();
  const orderId = searchParams.get('orderId');

  return (
    <>
      <Header />
      <main style={{ maxWidth: 600, margin: '80px auto', padding: '0 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 72, marginBottom: 20 }}>✅</div>
        <h1 style={{
          fontFamily: 'var(--font-head), sans-serif',
          fontWeight: 900, fontSize: 'clamp(32px, 5vw, 48px)',
          color: 'var(--text)', marginBottom: 12,
        }}>
          Заказ оформлен!
        </h1>
        {orderId && (
          <p style={{ color: 'var(--text3)', fontSize: 14, marginBottom: 8 }}>
            Номер заказа: <span style={{ fontFamily: 'var(--font-mono), monospace', color: 'var(--accent)', fontWeight: 600 }}>#{orderId}</span>
          </p>
        )}
        <p style={{ color: 'var(--text2)', fontSize: 15, lineHeight: 1.7, marginBottom: 32, marginTop: 16 }}>
          Наш менеджер свяжется с вами в ближайшее время для подтверждения заказа и уточнения деталей оплаты.
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <Link href="/account" className="btn btn-primary btn-md">
            Мои заказы
          </Link>
          <Link href="/search" className="btn btn-outline btn-md">
            Продолжить покупки
          </Link>
        </div>

        <div style={{ marginTop: 40, padding: 20, background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 8 }}>
          <p style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 8 }}>Вопросы по заказу:</p>
          <a href="tel:+79281552224" style={{ color: 'var(--green)', fontWeight: 600, fontSize: 15 }}>
            📞 +7 (928) 155-22-24
          </a>
        </div>
      </main>
    </>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={null}>
      <SuccessContent />
    </Suspense>
  );
}
