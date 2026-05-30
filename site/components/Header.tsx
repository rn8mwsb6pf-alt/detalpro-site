'use client';
// components/Header.tsx
import { useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useSession, signOut } from 'next-auth/react';
import { useCart } from '@/components/cart/CartContext';
import { AuthModal } from '@/components/auth/AuthModal';
import styles from './Header.module.css';

export function Header() {
  const router   = useRouter();
  const pathname = usePathname();
  const { data: session } = useSession();
  const { totalQty } = useCart();

  const [query,     setQuery]     = useState('');
  const [authOpen,  setAuthOpen]  = useState(false);
  const [authMode,  setAuthMode]  = useState<'login' | 'register'>('login');
  const inputRef = useRef<HTMLInputElement>(null);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (!query.trim()) return;
    router.push(`/search?query=${encodeURIComponent(query.trim())}`);
  }

  function openAuth(mode: 'login' | 'register') {
    setAuthMode(mode);
    setAuthOpen(true);
  }

  const managerPhone = process.env.NEXT_PUBLIC_MANAGER_PHONE || '+78001234567';

  return (
    <>
      <header className={styles.header}>
        <div className={styles.inner}>
          {/* Лого */}
          <div className={styles.logo} onClick={() => router.push('/')}>
            <svg className={styles.logoSvg} width="40" height="40" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
              <circle cx="50" cy="50" r="47" stroke="#e8411a" strokeWidth="1.5" strokeDasharray="4 3"/>
              <circle cx="50" cy="50" r="42" stroke="#e8411a" strokeWidth="2.5"/>
              <circle cx="50" cy="50" r="36" stroke="#e8411a" strokeWidth="1"/>
              <circle cx="50" cy="50" r="22" stroke="#e8411a" strokeWidth="4"/>
              <circle cx="50" cy="50" r="7" fill="#e8411a"/>
              <line x1="50" y1="43" x2="50" y2="28" stroke="#e8411a" strokeWidth="4" strokeLinecap="round"/>
              <line x1="44.4" y1="53.5" x2="33.4" y2="66.5" stroke="#e8411a" strokeWidth="4" strokeLinecap="round"/>
              <line x1="55.6" y1="53.5" x2="66.6" y2="66.5" stroke="#e8411a" strokeWidth="4" strokeLinecap="round"/>
              <circle cx="50" cy="8"  r="3" fill="#e8411a"/>
              <circle cx="50" cy="92" r="3" fill="#e8411a"/>
              <circle cx="8"  cy="50" r="3" fill="#e8411a"/>
              <circle cx="92" cy="50" r="3" fill="#e8411a"/>
              <circle cx="21" cy="21" r="2" fill="#e8411a" opacity={0.6}/>
              <circle cx="79" cy="21" r="2" fill="#e8411a" opacity={0.6}/>
              <circle cx="21" cy="79" r="2" fill="#e8411a" opacity={0.6}/>
              <circle cx="79" cy="79" r="2" fill="#e8411a" opacity={0.6}/>
            </svg>
            <div className={styles.logoText}>
              <span className={styles.logoSub}>Дорожный комплекс</span>
              <span className={styles.logoMain}>ГАРАЖ</span>
            </div>
          </div>

          {/* Навигация */}
          <nav className={styles.nav}>
            {[
              { href: '/',        label: 'Главная' },
              { href: '/search',  label: 'Каталог' },
              { href: '/about',   label: 'О нас' },
              { href: '/delivery',label: 'Доставка' },
            ].map(({ href, label }) => (
              <a
                key={href}
                href={href}
                className={`${styles.navLink} ${pathname === href ? styles.navLinkActive : ''}`}
              >
                {label}
              </a>
            ))}
          </nav>

          {/* Поиск */}
          <form className={styles.searchBox} onSubmit={handleSearch}>
            <input
              ref={inputRef}
              className={styles.searchInput}
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Артикул или название детали..."
            />
            <button type="submit" className={styles.searchBtn}>Найти</button>
          </form>

          {/* Правая панель */}
          <div className={styles.right}>
            {/* Телефон */}
            <a href={`tel:${managerPhone}`} className={styles.hbtn} aria-label="Позвонить">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.81 19.79 19.79 0 01.01 1.18 2 2 0 012 0h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 14.92z"/></svg>
              <span className={styles.hbtnLabel}>
                {managerPhone.replace(/(\+7)(\d{3})(\d{3})(\d{2})(\d{2})/, '$1 ($2) $3-$4-$5')}
              </span>
            </a>

            {/* Корзина */}
            <button className={styles.hbtn} onClick={() => router.push('/cart')} aria-label="Корзина">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
              <span className={styles.hbtnLabel}>Корзина</span>
              {totalQty > 0 && (
                <span className={styles.cartBadge}>{totalQty > 99 ? '99+' : totalQty}</span>
              )}
            </button>

            {/* Авторизация / Профиль */}
            {session ? (
              <div className={styles.userMenu}>
                <button
                  className={styles.hbtn}
                  onClick={() => router.push('/account')}
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
                  <span className={styles.hbtnLabel}>
                    {session.user.name?.split(' ')[0] || 'Кабинет'}
                  </span>
                </button>
                {(session.user.role === 'manager' || session.user.role === 'admin') && (
                  <span className={styles.roleBadge}>Менеджер</span>
                )}
              </div>
            ) : (
              <button className={styles.loginBtn} onClick={() => openAuth('login')}>
                Войти
              </button>
            )}
          </div>
        </div>
      </header>

      <AuthModal
        isOpen={authOpen}
        mode={authMode}
        onClose={() => setAuthOpen(false)}
        onSwitchMode={m => setAuthMode(m)}
      />
    </>
  );
}
