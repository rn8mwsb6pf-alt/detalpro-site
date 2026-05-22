-- 002_activity_logs.sql — Журнал действий менеджеров
-- Запустить: psql $DATABASE_URL -f 002_activity_logs.sql

CREATE TABLE IF NOT EXISTS activity_logs (
  id          SERIAL PRIMARY KEY,
  user_id     INTEGER REFERENCES users(id) ON DELETE SET NULL,
  user_email  VARCHAR(255),
  user_role   VARCHAR(50),
  action      VARCHAR(100) NOT NULL,
  details     JSONB        NOT NULL DEFAULT '{}',
  ip_address  VARCHAR(45),
  created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user     ON activity_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_activity_created  ON activity_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_activity_action   ON activity_logs(action);
CREATE INDEX IF NOT EXISTS idx_activity_role     ON activity_logs(user_role);
