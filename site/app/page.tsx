import type { Metadata } from 'next';
import Link from 'next/link';
import { sql } from '@/lib/db';
import { Header } from '@/components/Header';
import styles from './home.module.css';

export const metadata: Metadata = {
  title: 'Дорожный комплекс ГАРАЖ — Автозапчасти с доставкой по России',
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
  { icon: '🔧', label: 'Двигатель',  count: '48 200',  color: '#e8411a' },
  { icon: '🛞', label: 'Подвеска',   count: '62 100',  color: '#3b82f6' },
  { icon: '🔋', label: 'Электрика',  count: '31 500',  color: '#a78bfa' },
  { icon: '🛢', label: 'Фильтры',    count: '18 900',  color: '#facc15' },
  { icon: '🏎', label: 'Тормоза',    count: '24 300',  color: '#f59e0b' },
  { icon: '❄️', label: 'Охлаждение', count: '12 700',  color: '#38bdf8' },
  { icon: '🔩', label: 'Кузов',      count: '55 800',  color: '#22c55e' },
  { icon: '⚙️', label: 'КПП',        count: '9 400',   color: '#fb923c' },
];

// Грузовые марки + бренды запчастей — как в оригинале autoparts-store.html
const BRANDS = [
  // Грузовые
  'КАМАЗ', 'МАЗ', 'DAF', 'MAN', 'Volvo', 'Scania',
  'Mercedes', 'Renault T', 'IVECO', 'ISUZU', 'ГАЗель', 'КРАЗ',
  // Бренды запчастей
  'Mann-Filter', 'Knorr-Bremse', 'Wabco', 'ZF', 'Sachs', 'Textar',
  'Febi Bilstein', 'SKF', 'Bosch', 'NGK', 'Gates', 'Mahle',
  'Corteco', 'Donaldson', 'SAF Holland', 'Continental', 'Hella', 'Valeo',
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
                <svg width="28" height="28" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <circle cx="50" cy="50" r="47" stroke="#e8411a" strokeWidth="1.5" strokeDasharray="4 3"/>
                  <circle cx="50" cy="50" r="42" stroke="#e8411a" strokeWidth="3"/>
                  <circle cx="50" cy="50" r="22" stroke="#e8411a" strokeWidth="4"/>
                  <circle cx="50" cy="50" r="7" fill="#e8411a"/>
                  <line x1="50" y1="43" x2="50" y2="28" stroke="#e8411a" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="44.4" y1="53.5" x2="33.4" y2="66.5" stroke="#e8411a" strokeWidth="4" strokeLinecap="round"/>
                  <line x1="55.6" y1="53.5" x2="66.6" y2="66.5" stroke="#e8411a" strokeWidth="4" strokeLinecap="round"/>
                </svg>
                <div style={{ marginLeft: 8 }}>
                  <span className={styles.footerLogoSub}>Дорожный комплекс</span>
                  <span className={styles.footerLogoText}>ГАРАЖ</span>
                </div>
              </div>
              <p className={styles.footerDesc}>
                Профессиональный магазин запчастей для грузовой техники и легковых авто. Работаем с 2007 года. На 932 км трассы М4 «Дон».
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
                <span>📍 ул. Героев Пионеров, 95<br />Каменск-Шахтинский · 932 км М4</span>
                <span style={{ color: 'var(--text3)', fontSize: 12 }}>🕐 Пн–Пт 8:00–19:00 · Сб 9:00–17:00</span>
              </div>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>© 2007–2026 Дорожный комплекс ГАРАЖ. Все права защищены.</span>
            <span style={{ color: 'var(--text3)' }}>Магазин грузовых запчастей · 932 км трассы М4 «Дон»</span>
          </div>
        </footer>
      </main>
    </>
  );
}
