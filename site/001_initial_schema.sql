-- =============================================================================
-- Миграция: 001_initial_schema.sql
-- Интернет-магазин автозапчастей
-- Интеграции: 1С:УТ, QWEP, СДЭК
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";   -- gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pg_trgm";    -- быстрый поиск по артикулу LIKE/ILIKE

-- -----------------------------------------------------------------------------
-- 1. Пользователи
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id                     UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email                  VARCHAR(255) UNIQUE NOT NULL,
  phone                  VARCHAR(20),
  password_hash          TEXT NOT NULL,
  role                   VARCHAR(20) NOT NULL DEFAULT 'customer'
                           CHECK (role IN ('customer', 'manager', 'admin')),
  first_name             VARCHAR(100),
  last_name              VARCHAR(100),
  company_name           VARCHAR(255),
  -- Ссылка на контрагента в 1С (UUID справочника Контрагенты)
  one_c_counterparty_id  UUID,
  created_at             TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_users_email ON users (email);
CREATE INDEX idx_users_role  ON users (role);

-- -----------------------------------------------------------------------------
-- 2. Кэш товаров из 1С:УТ (обновляется раз в час через синхронизацию)
-- -----------------------------------------------------------------------------
CREATE TABLE products_cache (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- Артикул — основной ключ поиска (хранится в UPPER CASE)
  article           VARCHAR(100) NOT NULL,
  brand             VARCHAR(100),
  name              VARCHAR(500) NOT NULL,
  description       TEXT,
  unit              VARCHAR(20) DEFAULT 'шт',
  -- Цены из 1С
  price_retail      NUMERIC(12,2) NOT NULL DEFAULT 0,
  price_wholesale   NUMERIC(12,2) NOT NULL DEFAULT 0,
  -- Остатки
  stock_quantity    INTEGER NOT NULL DEFAULT 0,
  warehouse_code    VARCHAR(50),
  -- Мета: когда последний раз синхронизировано с 1С
  synced_from_1c_at TIMESTAMPTZ,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Уникальный индекс: один артикул на склад (склады могут различаться)
CREATE UNIQUE INDEX idx_products_cache_article_warehouse
  ON products_cache (article, COALESCE(warehouse_code, ''));

-- Индекс для поиска по артикулу (точное совпадение и LIKE)
CREATE INDEX idx_products_cache_article     ON products_cache (article);
CREATE INDEX idx_products_cache_article_trgm
  ON products_cache USING gin (article gin_trgm_ops);
CREATE INDEX idx_products_cache_stock       ON products_cache (stock_quantity)
  WHERE stock_quantity > 0;

-- -----------------------------------------------------------------------------
-- 3. Корзина (один пользователь — одна активная корзина)
-- -----------------------------------------------------------------------------
CREATE TABLE cart (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID REFERENCES users (id) ON DELETE CASCADE,
  -- session_id нужен для гостевых корзин (не авторизованных)
  session_id VARCHAR(128),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  -- либо user_id, либо session_id должен быть заполнен
  CONSTRAINT chk_cart_owner CHECK (user_id IS NOT NULL OR session_id IS NOT NULL)
);

CREATE UNIQUE INDEX idx_cart_user    ON cart (user_id)    WHERE user_id IS NOT NULL;
CREATE UNIQUE INDEX idx_cart_session ON cart (session_id) WHERE session_id IS NOT NULL;

CREATE TABLE cart_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cart_id              UUID NOT NULL REFERENCES cart (id) ON DELETE CASCADE,
  article              VARCHAR(100) NOT NULL,
  brand                VARCHAR(100),
  name                 VARCHAR(500),
  -- Источник: 'qwep' или '1c'
  source               VARCHAR(10) NOT NULL DEFAULT '1c'
                         CHECK (source IN ('1c', 'qwep')),
  price_retail         NUMERIC(12,2) NOT NULL,
  price_input          NUMERIC(12,2),     -- входная цена (только для qwep, для БД)
  quantity             INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  delivery_days        INTEGER DEFAULT 0,
  -- Снимок оффера QWEP на момент добавления в корзину
  qwep_offer_snapshot  JSONB,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cart_items_cart ON cart_items (cart_id);

-- -----------------------------------------------------------------------------
-- 4. Наши магазины и склады (для самовывоза)
-- -----------------------------------------------------------------------------
CREATE TABLE stores (
  id        UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name      VARCHAR(255) NOT NULL,
  address   TEXT NOT NULL,
  lat       NUMERIC(9,6),
  lng       NUMERIC(9,6),
  phone     VARCHAR(20),
  is_active BOOLEAN NOT NULL DEFAULT TRUE
);

-- -----------------------------------------------------------------------------
-- 5. Заказы
-- -----------------------------------------------------------------------------
CREATE TABLE orders (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id          UUID REFERENCES users (id) ON DELETE SET NULL,
  status           VARCHAR(30) NOT NULL DEFAULT 'new'
                     CHECK (status IN ('new','confirmed','paid','assembling',
                                       'shipped','done','cancelled')),

  -- Доставка
  delivery_type    VARCHAR(30) NOT NULL DEFAULT 'pickup'
                     CHECK (delivery_type IN ('pickup','cdek_pvz','cdek_courier')),
  store_id         UUID REFERENCES stores (id) ON DELETE SET NULL,
  delivery_address TEXT,          -- для курьерской доставки СДЭК
  cdek_pvz_code    VARCHAR(50),   -- код ПВЗ СДЭК
  delivery_cost    NUMERIC(10,2) NOT NULL DEFAULT 0,

  -- Суммы
  subtotal         NUMERIC(12,2) NOT NULL DEFAULT 0,
  total            NUMERIC(12,2) NOT NULL DEFAULT 0,

  -- Внешние идентификаторы
  cdek_order_uuid  VARCHAR(100),  -- UUID заявки в СДЭК
  one_c_order_id   VARCHAR(100),  -- Номер документа «Заказ клиента» в 1С

  -- Полный payload, отправленный в 1С (для отладки)
  one_c_payload    JSONB,

  manager_comment  TEXT,
  created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_user   ON orders (user_id);
CREATE INDEX idx_orders_status ON orders (status);
CREATE INDEX idx_orders_created ON orders (created_at DESC);

CREATE TABLE order_items (
  id                   UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id             UUID NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  article              VARCHAR(100) NOT NULL,
  brand                VARCHAR(100),
  name                 VARCHAR(500),
  source               VARCHAR(10) NOT NULL DEFAULT '1c'
                         CHECK (source IN ('1c', 'qwep')),
  price_retail         NUMERIC(12,2) NOT NULL,
  quantity             INTEGER NOT NULL DEFAULT 1 CHECK (quantity > 0),
  delivery_days        INTEGER DEFAULT 0,
  qwep_offer_snapshot  JSONB
);

CREATE INDEX idx_order_items_order ON order_items (order_id);

-- -----------------------------------------------------------------------------
-- 6. Лог синхронизаций (для мониторинга интеграций)
-- -----------------------------------------------------------------------------
CREATE TABLE sync_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  type          VARCHAR(50) NOT NULL
                  CHECK (type IN ('1c_products','1c_order','qwep_search',
                                  'cdek_calc','cdek_create')),
  status        VARCHAR(10) NOT NULL CHECK (status IN ('ok','error')),
  error_message TEXT,
  payload       JSONB,       -- запрос или ответ (для отладки)
  duration_ms   INTEGER,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sync_logs_type_created ON sync_logs (type, created_at DESC);
CREATE INDEX idx_sync_logs_status       ON sync_logs (status) WHERE status = 'error';

-- -----------------------------------------------------------------------------
-- 7. Автообновление updated_at через триггер
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_products_cache_updated_at
  BEFORE UPDATE ON products_cache
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_cart_updated_at
  BEFORE UPDATE ON cart
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
