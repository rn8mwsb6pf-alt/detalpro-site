'use client';
// app/auth/login/page.tsx — Страница входа (поддерживает логин и email)
import { useState, FormEvent, Suspense } from 'react';
import { signIn } from 'next-auth/react';
import { useSearchParams, useRouter } from 'next/navigation';

function LoginForm() {
  const searchParams = useSearchParams();
  const router       = useRouter();
  const callbackUrl  = searchParams.get('callbackUrl') ?? '/';

  const [login,    setLogin]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    const res = await signIn('credentials', {
      email:    login.trim(),
      password: password,
      redirect: false,
    });

    setLoading(false);

    if (res?.error) {
      setError('Неверный логин или пароль');
    } else {
      router.push(callbackUrl);
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: '#0d0f1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: "'IBM Plex Sans', sans-serif",
    }}>
      <div style={{
        background: '#111218',
        border: '1px solid #1e2238',
        borderRadius: 12,
        padding: '40px 36px',
        width: '100%',
        maxWidth: 380,
      }}>
        {/* Лого */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: 1 }}>
            ДЕТАЛЬПРО
          </div>
          <div style={{ fontSize: 12, color: '#4a5568', marginTop: 4 }}>
            Панель управления
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          {/* Логин */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
              Логин / Email
            </label>
            <input
              type="text"
              value={login}
              onChange={e => setLogin(e.target.value)}
              required
              autoComplete="username"
              placeholder="Введите логин или email"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#1a1d2e', border: '1px solid #2a2f4a',
                color: '#e2e8f0', padding: '10px 14px',
                borderRadius: 7, fontSize: 14, outline: 'none',
              }}
            />
          </div>

          {/* Пароль */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, color: '#94a3b8', marginBottom: 6 }}>
              Пароль
            </label>
            <input
              type="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="current-password"
              placeholder="Введите пароль"
              style={{
                width: '100%', boxSizing: 'border-box',
                background: '#1a1d2e', border: '1px solid #2a2f4a',
                color: '#e2e8f0', padding: '10px 14px',
                borderRadius: 7, fontSize: 14, outline: 'none',
              }}
            />
          </div>

          {/* Ошибка */}
          {error && (
            <div style={{
              background: '#450a0a', border: '1px solid #7f1d1d',
              color: '#fca5a5', padding: '10px 14px',
              borderRadius: 7, fontSize: 13, marginBottom: 16,
            }}>
              {error}
            </div>
          )}

          {/* Кнопка */}
          <button
            type="submit"
            disabled={loading}
            style={{
              width: '100%', padding: '11px',
              background: loading ? '#7f1d1d' : '#dc2626',
              color: '#fff', border: 'none', borderRadius: 7,
              fontSize: 14, fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.12s',
            }}
          >
            {loading ? 'Вход...' : 'Войти'}
          </button>
        </form>

        {/* Ссылка на главную */}
        <div style={{ textAlign: 'center', marginTop: 20 }}>
          <a href="/" style={{ color: '#4a5568', fontSize: 12, textDecoration: 'none' }}>
            ← На главную
          </a>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
