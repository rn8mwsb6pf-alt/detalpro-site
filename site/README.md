# ДЕТАЛЬПРО — Интернет-магазин автозапчастей

Next.js 14 · PostgreSQL · Redis · 1С:УТ · QWEP · СДЭК

---

## Быстрый старт

### 1. Требования

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- Доступ к HTTP-сервису 1С:УТ
- Токен API QWEP
- Учётные данные СДЭК API

### 2. Установка

```bash
# Клонировать / распаковать проект
cd "C:\Users\timmon\Desktop\Сайт"

# Установить зависимости
npm install

# Скопировать конфиг переменных окружения
copy .env.example .env.local
# Заполните .env.local своими данными!
```

### 3. База данных

```bash
# Создать БД в PostgreSQL
psql -U postgres -c "CREATE DATABASE detalpro;"
psql -U postgres -c "CREATE USER detalpro WITH PASSWORD 'password';"
psql -U postgres -c "GRANT ALL ON DATABASE detalpro TO detalpro;"

# Применить схему
psql -U detalpro -d detalpro -f "C:\Users\timmon\Desktop\Сайт\001_initial_schema.sql"
# (файл лежит рядом — из предыдущего шага)
```

### 4. Запуск в разработке

```bash
# Терминал 1 — Next.js сервер
npm run dev

# Терминал 2 — Синхронизация с 1С (опционально в dev)
npx ts-node scripts/sync.ts
```

Откройте http://localhost:3000

---

## Структура проекта

```
Сайт/
├── app/                        # Next.js App Router
│   ├── layout.tsx              # Корневой layout (шрифты, провайдеры)
│   ├── page.tsx                # Главная (SSR, SEO)
│   ├── search/page.tsx         # Поиск (SSR, dynamic metadata)
│   ├── cart/page.tsx           # Корзина
│   ├── checkout/page.tsx       # Оформление заказа
│   ├── account/page.tsx        # Личный кабинет (защищён)
│   └── api/
│       ├── search/route.ts     # GET  /api/search?query=...
│       ├── orders/route.ts     # POST /api/orders
│       ├── auth/               # NextAuth + регистрация
│       └── cdek/               # ПВЗ + расчёт доставки
│
├── components/
│   ├── Header.tsx              # Шапка с поиском и авторизацией
│   ├── Providers.tsx           # SessionProvider + CartProvider
│   ├── auth/AuthModal.tsx      # Модалка входа/регистрации
│   ├── cart/CartContext.tsx    # Контекст корзины (localStorage)
│   ├── search/SearchClient.tsx # Таблица результатов (роль-зависимая)
│   ├── checkout/CdekWidget.tsx # Виджет карты СДЭК
│   ├── account/AccountClient.tsx # ЛК: заказы + профиль
│   └── ui/Toast.tsx            # Тост-уведомления
│
├── lib/
│   ├── db.ts                   # PostgreSQL (postgres.js)
│   ├── redis.ts                # Redis (ioredis)
│   ├── auth.ts                 # NextAuth конфиг
│   ├── 1c.ts                   # Интеграция с 1С:УТ
│   ├── qwep.ts                 # Интеграция с QWEP
│   └── cdek.ts                 # Интеграция с СДЭК API
│
├── types/index.ts              # TypeScript типы
├── middleware.ts               # Защита /account, /admin
├── scripts/sync.ts             # Cron синхронизации с 1С
└── .env.example                # Шаблон переменных окружения
```

---

## Ключевые интеграции

### 1С:УТ

HTTP-сервис в 1С должен реализовывать два метода:

| Метод | URL                 | Описание                          |
|-------|---------------------|-----------------------------------|
| GET   | `/hs/site/products` | Каталог с ценами и остатками      |
| POST  | `/hs/site/orders`   | Создание «Заказа клиента»         |

Синхронизация запускается каждый час через `scripts/sync.ts`.

### QWEP

Поиск по артикулу: `GET /v1/search?article=...`  
Авторизация через Bearer-токен.

### СДЭК

- `GET  /v2/deliverypoints` — список ПВЗ
- `POST /v2/calculator/tariff` — расчёт стоимости
- `POST /v2/orders` — создание заявки

Виджет карты — `@cdek-it/widget` (CDN).  
Тестовые данные: `EMscd6r9JnFiQ3bLoyjJY6eM` / `PjLZkKBHEiLK3YsjtNrt3TGNG0ahs3kG`

---

## Роли пользователей

| Роль       | Что видит                                                        |
|------------|------------------------------------------------------------------|
| `customer` | Розничные цены, кнопку «В корзину» или «Позвонить»             |
| `manager`  | Оптовые цены, имена поставщиков QWEP, склад, кнопку «Добавить» |
| `admin`    | Как менеджер + доступ к `/admin`                                 |

---

## Production деплой

```bash
npm run build
npm run start

# Синхронизация 1С — отдельный процесс
pm2 start "npx ts-node scripts/sync.ts" --name "1c-sync"
```
