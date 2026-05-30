import type { Metadata } from 'next';
import Link from 'next/link';
import { Header } from '@/components/Header';

export const metadata: Metadata = {
  title: "О компании — Дорожный комплекс ГАРАЖ",
  description: 'Профессиональный магазин автозапчастей. Работаем с 2007 года. Более 2 000 000 позиций.',
};

export default function AboutPage() {
  return (
    <>
      <Header />
      <main style={{ maxWidth: 900, margin: '0 auto', padding: '48px 24px' }}>
        <h1 style={{
          fontFamily: 'var(--font-head), sans-serif',
          fontWeight: 900, fontSize: 'clamp(36px, 5vw, 56px)',
          color: 'var(--text)', marginBottom: 8,
        }}>
          О компании
        </h1>
        <p style={{ color: 'var(--accent)', fontWeight: 600, marginBottom: 40, fontSize: 14 }}>
          Дорожный комплекс ГАРАЖ · На рынке с 2007 года
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16, marginBottom: 48 }}>
          {[
            { n: '18 лет', l: 'На рынке' },
            { n: '2.1M+', l: 'Артикулов' },
            { n: '500+', l: 'Поставщиков' },
            { n: '50 000+', l: 'Выполненных заказов' },
          ].map((s) => (
            <div key={s.l} style={{
              background: 'var(--bg2)', border: '1px solid var(--line)',
              borderRadius: 8, padding: '20px 16px', textAlign: 'center',
            }}>
              <div style={{ fontFamily: 'var(--font-head), sans-serif', fontWeight: 900, fontSize: 32, color: 'var(--accent)' }}>{s.n}</div>
              <div style={{ fontSize: 12, color: 'var(--text3)', marginTop: 4 }}>{s.l}</div>
            </div>
          ))}
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 32, marginBottom: 48 }}>
          <div>
            <h2 style={{ fontFamily: 'var(--font-head), sans-serif', fontWeight: 800, fontSize: 24, marginBottom: 16, color: 'var(--text)' }}>
              Кто мы
            </h2>
            <p style={{ color: 'var(--text2)', lineHeight: 1.8, marginBottom: 12 }}>
              Дорожный комплекс «ГАРАЖ» — профессиональный магазин автозапчастей для легковых автомобилей и грузовой техники. Мы работаем с 2007 года и за это время помогли десяткам тысяч клиентов найти нужную деталь по выгодной цене.
            </p>
            <p style={{ color: 'var(--text2)', lineHeight: 1.8 }}>
              Мы работаем напрямую с ведущими поставщиками и производителями, что позволяет предлагать конкурентные цены и гарантировать качество каждой детали.
            </p>
          </div>
          <div>
            <h2 style={{ fontFamily: 'var(--font-head), sans-serif', fontWeight: 800, fontSize: 24, marginBottom: 16, color: 'var(--text)' }}>
              Наши преимущества
            </h2>
            <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                '✅ Более 2 000 000 артикулов в базе',
                '🚚 Доставка СДЭК по всей России',
                '🔒 Гарантия подлинности деталей',
                '💬 Помощь менеджера в подборе',
                '💰 Оптовые цены для бизнеса',
                '📱 Удобный поиск по артикулу',
              ].map((item) => (
                <li key={item} style={{ color: 'var(--text2)', fontSize: 14 }}>{item}</li>
              ))}
            </ul>
          </div>
        </div>

        <div style={{ background: 'var(--bg2)', border: '1px solid var(--line)', borderRadius: 8, padding: 32, marginBottom: 48 }}>
          <h2 style={{ fontFamily: 'var(--font-head), sans-serif', fontWeight: 800, fontSize: 24, marginBottom: 20, color: 'var(--text)' }}>
            Контакты
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 20 }}>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Телефоны</div>
              <a href="tel:+79281552224" style={{ display: 'block', color: 'var(--green)', fontWeight: 600, marginBottom: 4 }}>+7 (928) 155-22-24 — Артём</a>
              <a href="tel:+79381548030" style={{ display: 'block', color: 'var(--green)', fontWeight: 600 }}>+7 (938) 154-80-30 — Александр</a>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Email</div>
              <a href="mailto:info@detalpro.ru" style={{ color: 'var(--text2)' }}>info@detalpro.ru</a>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Адрес</div>
              <p style={{ color: 'var(--text2)', fontSize: 13 }}>ул. Героев Пионеров, 95<br />Каменск-Шахтинский</p>
            </div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--text3)', letterSpacing: '.08em', textTransform: 'uppercase', marginBottom: 8 }}>Режим работы</div>
              <p style={{ color: 'var(--text2)', fontSize: 13 }}>Пн–Пт: 8:00–19:00<br />Сб: 9:00–17:00</p>
            </div>
          </div>
        </div>

        <div style={{ textAlign: 'center' }}>
          <Link href="/search" className="btn btn-primary btn-lg">
            Перейти в каталог
          </Link>
        </div>
      </main>
    </>
  );
}
