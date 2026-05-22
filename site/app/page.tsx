import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { Header } from '@/components/Header';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: 'ДЕТАЛЬПРО — Автозапчасти с доставкой по России',
  description:
    'Поиск запчастей по артикулу. Более 2 000 000 позиций в наличии и под заказ. ' +
    'Доставка СДЭК по всей России. Гарантия качества.',
};

async function getStats() {
  try {
    const [row] = await sql`
      SELECT
        COUNT(*)                                   AS total_articles,
        COUNT(*) FILTER (WHERE stock_quantity > 0) AS in_stock
      FROM products_cache
    `;
    return {
      totalArticles: Number(row.total_articles).toLocaleString('ru-RU'),
      inStock:       Number(row.in_stock).toLocaleString('ru-RU'),
    };
  } catch {
    return { totalArticles: '2 100 000', inStock: '48 000' };
  }
}

const CATEGORIES = [
  { icon: '🔧', label: 'Двигатель', count: '128 000+', color: '#e8411a' },
  { icon: '🛞', label: 'Подвеска', count: '95 000+', color: '#3b82f6' },
  { icon: '🔩', label: 'Тормоза', count: '64 000+', color: '#f59e0b' },
  { icon: '⚙️', label: 'КПП и трансмиссия', count: '52 000+', color: '#22c55e' },
  { icon: '🔋', label: 'Электрика', count: '78 000+', color: '#a78bfa' },
  { icon: '❄️', label: 'Охлаждение', count: '31 000+', color: '#38bdf8' },
  { icon: '💨', label: 'Выхлопная система', count: '22 000+', color: '#fb923c' },
  { icon: '🛢️', label: 'Масла и фильтры', count: '18 000+', color: '#facc15' },
];

const BRANDS = [
  'TOYOTA', 'BMW', 'MERCEDES', 'VOLKSWAGEN', 'FORD', 'HYUNDAI',
  'KIA', 'NISSAN', 'MAZDA', 'VOLVO', 'SCANIA', 'MAN', 'DAF', 'IVECO',
];

export default async function HomePage() {
  const stats = await getStats();

  return (
    <>
      <Header />
      <main>
        {/* ── Hero ────────────────────────────────────────────────────────── */}
        <section className={styles.hero}>
          <div className={styles.heroBg} />
          <div className={styles.heroContent}>
            <div className={styles.heroEyebrow}>
              Более {stats.totalArticles} артикулов в наличии и под заказ
            </div>
            <h1 className={styles.heroTitle}>
              Автозапчасти<br />
              <em>с доставкой</em><br />
              по России
            </h1>
            <p className={styles.heroSub}>
              Профессиональный подбор запчастей по артикулу. Наличие на складе и у 500+ поставщиков. Доставка по всей России через СДЭК.
            </p>

            <Link href="/search" className={styles.heroSearchBox}>
              <span className={styles.heroSearchPlaceholder}>
                Введите артикул детали...
              </span>
              <span className={styles.heroSearchBtn}>Найти →</span>
            </Link>

            <div className={styles.heroHints}>
              <span className={styles.heroHintsLabel}>Попробуйте:</span>
              {['04465-12080', 'HH050-16840', '96535081', '55810-33050'].map((q) => (
                <Link key={q} href={`/search?query=${q}`} className={styles.hintChip}>
                  {q}
                </Link>
              ))}
            </div>

            <div className={styles.heroStats}>
              <div className={styles.stat}>
                <div className={styles.statNum}>2.1<span>M</span></div>
                <div className={styles.statLabel}>Артикулов</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNum}>500<span>+</span></div>
                <div className={styles.statLabel}>Поставщиков</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNum}>1<span>-3</span></div>
                <div className={styles.statLabel}>Дня доставки</div>
              </div>
              <div className={styles.stat}>
                <div className={styles.statNum}>18<span>лет</span></div>
                <div className={styles.statLabel}>На рынке</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Brands bar ──────────────────────────────────────────────────── */}
        <div className={styles.brandsBar}>
          <div className={styles.brandsTrack}>
            {[...BRANDS, ...BRANDS].map((b, i) => (
              <span key={i} className={styles.brandItem}>{b}</span>
            ))}
          </div>
        </div>

        {/* ── Categories ──────────────────────────────────────────────────── */}
        <section className={styles.section}>
          <div className="container">
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitle}>Категории запчастей</div>
              <Link href="/search" className={styles.sectionLink}>Все категории →</Link>
            </div>
            <div className={styles.catsGrid}>
              {CATEGORIES.map((cat) => (
                <Link key={cat.label} href={`/search?query=${encodeURIComponent(cat.label)}`} className={styles.catCard}>
                  <div className={styles.catIcon}>{cat.icon}</div>
                  <div className={styles.catLabel}>{cat.label}</div>
                  <div className={styles.catCount}>{cat.count}</div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────────────────── */}
        <section className={styles.featuresSection}>
          <div className="container">
            <div className={styles.featuresGrid}>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>🚚</div>
                <div className={styles.featureTitle}>Доставка СДЭК</div>
                <div className={styles.featureDesc}>По всей России. ПВЗ или курьер. Сроки от 1 дня.</div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>✅</div>
                <div className={styles.featureTitle}>Гарантия качества</div>
                <div className={styles.featureDesc}>Только оригинальные и сертифицированные аналоги.</div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>💰</div>
                <div className={styles.featureTitle}>Оптовые цены</div>
                <div className={styles.featureDesc}>Прямые контракты с поставщиками. Скидки от объёма.</div>
              </div>
              <div className={styles.featureCard}>
                <div className={styles.featureIcon}>📞</div>
                <div className={styles.featureTitle}>Помощь менеджера</div>
                <div className={styles.featureDesc}>Подберём аналог, проверим совместимость по VIN.</div>
              </div>
            </div>
          </div>
        </section>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className={styles.footer}>
          <div className={styles.footerInner}>
            <div className={styles.footerBrand}>
              <div className={styles.footerLogo}>
                <div className={styles.footerLogoMark} />
                <span className={styles.footerLogoText}>
                  ДЕТАЛЬ<span className={styles.footerLogoAccent}>ПРО</span>
                </span>
              </div>
              <p className={styles.footerDesc}>
                Профессиональный магазин автозапчастей. Работаем с 2007 года. Доставка по всей России через СДЭК.
              </p>
              <div className={styles.footerContacts}>
                <a href="tel:+79281552224" className={styles.footerContactBtn} style={{ background: 'var(--accent)' }}>
                  📞 Позвонить
                </a>
                <a href="https://t.me/garazh_zapchasti" target="_blank" rel="noreferrer" className={styles.footerContactBtn} style={{ background: '#229ED9' }}>
                  ✈️ Telegram
                </a>
                <a href="https://wa.me/79281552224" target="_blank" rel="noreferrer" className={styles.footerContactBtn} style={{ background: '#25D366' }}>
                  💬 WhatsApp
                </a>
              </div>
            </div>

            <div>
              <div className={styles.footerColTitle}>Покупателям</div>
              <div className={styles.footerLinks}>
                <Link href="/search">🔍 Каталог запчастей</Link>
                <Link href="/delivery">🚚 Доставка и оплата</Link>
                <Link href="/cart">🛒 Корзина</Link>
              </div>
            </div>

            <div>
              <div className={styles.footerColTitle}>Компания</div>
              <div className={styles.footerLinks}>
                <Link href="/about">🏢 О нас</Link>
                <a href="https://t.me/garazh_zapchasti" target="_blank" rel="noreferrer">📢 Новости в Telegram</a>
                <Link href="/account">👤 Личный кабинет</Link>
              </div>
            </div>

            <div>
              <div className={styles.footerColTitle}>Контакты</div>
              <div className={styles.footerLinks}>
                <a href="tel:+79281552224" style={{ fontWeight: 600, color: 'var(--green)' }}>📞 +7 (928) 155-22-24 — Артём</a>
                <a href="tel:+79381548030" style={{ fontWeight: 600, color: 'var(--green)' }}>📞 +7 (938) 154-80-30 — Александр</a>
                <a href="mailto:info@detalpro.ru">✉️ info@detalpro.ru</a>
                <span>📍 ул. Героев Пионеров, 95<br />Каменск-Шахтинский</span>
                <span style={{ color: 'var(--text3)', fontSize: 12 }}>🕐 Пн–Пт 8:00–19:00 · Сб 9:00–17:00</span>
              </div>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>© 2007–2026 ДЕТАЛЬПРО. Все права защищены.</span>
            <span style={{ color: 'var(--text3)' }}>Магазин автозапчастей · Доставка СДЭК по России</span>
          </div>
        </footer>
      </main>
    </>
  );
}
