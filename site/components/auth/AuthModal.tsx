'use client';
// components/auth/AuthModal.tsx — Модальное окно входа / регистрации
import { useState } from 'react';
import { signIn } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import styles from './AuthModal.module.css';

interface Props {
  isOpen:       boolean;
  mode:         'login' | 'register';
  onClose:      () => void;
  onSwitchMode: (m: 'login' | 'register') => void;
}

export function AuthModal({ isOpen, mode, onClose, onSwitchMode }: Props) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  // Поля формы
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName,  setLastName]  = useState('');
  const [phone,     setPhone]     = useState('');

  if (!isOpen) return null;

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    const result = await signIn('credentials', {
      email, password, redirect: false,
    });
    setLoading(false);
    if (result?.error) {
      setError('Неверный email или пароль');
    } else {
      onClose();
      router.refresh();
    }
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError('');
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, firstName, lastName, phone }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error); setLoading(false); return; }

      // Авто-логин после регистрации
      await signIn('credentials', { email, password, redirect: false });
      setLoading(false);
      onClose();
      router.refresh();
    } catch {
      setError('Ошибка сервера, попробуйте позже');
      setLoading(false);
    }
  }

  return (
    <div className={styles.overlay} onClick={e => e.target === e.currentTarget && onClose()}>
      <div className={styles.modal}>
        {/* Шапка */}
        <div className={styles.header}>
          <div className={styles.tabs}>
            <button
              className={`${styles.tab} ${mode === 'login' ? styles.tabActive : ''}`}
              onClick={() => { onSwitchMode('login'); setError(''); }}
            >
              Вход
            </button>
            <button
              className={`${styles.tab} ${mode === 'register' ? styles.tabActive : ''}`}
              onClick={() => { onSwitchMode('register'); setError(''); }}
            >
              Регистрация
            </button>
          </div>
          <button className={styles.close} onClick={onClose}>✕</button>
        </div>

        {/* Форма входа */}
        {mode === 'login' && (
          <form onSubmit={handleLogin} className={styles.form}>
            <div className={styles.group}>
              <label className={styles.label}>Email</label>
              <input
                className="form-input"
                type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="ivan@example.com"
              />
            </div>
            <div className={styles.group}>
              <label className={styles.label}>Пароль</label>
              <input
                className="form-input"
                type="password" required
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button
              type="submit" disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            >
              {loading ? 'Входим...' : 'Войти'}
            </button>
          </form>
        )}

        {/* Форма регистрации */}
        {mode === 'register' && (
          <form onSubmit={handleRegister} className={styles.form}>
            <div className={styles.row}>
              <div className={styles.group}>
                <label className={styles.label}>Имя</label>
                <input className="form-input" required
                  value={firstName} onChange={e => setFirstName(e.target.value)}
                  placeholder="Иван" />
              </div>
              <div className={styles.group}>
                <label className={styles.label}>Фамилия</label>
                <input className="form-input" required
                  value={lastName} onChange={e => setLastName(e.target.value)}
                  placeholder="Иванов" />
              </div>
            </div>
            <div className={styles.group}>
              <label className={styles.label}>Email</label>
              <input className="form-input" type="email" required
                value={email} onChange={e => setEmail(e.target.value)}
                placeholder="ivan@example.com" />
            </div>
            <div className={styles.group}>
              <label className={styles.label}>Телефон</label>
              <input className="form-input" type="tel"
                value={phone} onChange={e => setPhone(e.target.value)}
                placeholder="+7 (___) ___-__-__" />
            </div>
            <div className={styles.group}>
              <label className={styles.label}>Пароль (минимум 8 символов)</label>
              <input className="form-input" type="password" required minLength={8}
                value={password} onChange={e => setPassword(e.target.value)}
                placeholder="••••••••" />
            </div>
            {error && <div className={styles.error}>{error}</div>}
            <button
              type="submit" disabled={loading}
              className="btn btn-primary btn-lg"
              style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}
            >
              {loading ? 'Создаём аккаунт...' : 'Зарегистрироваться'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
