-- ============================================================
-- SUPPLYFLOW — Automated Trade Monitoring Schema Migration
-- Run this in: Supabase Dashboard → SQL Editor
-- ============================================================

-- 1. Add monitoring columns to existing trades table
--    All columns are nullable so existing rows are unaffected.
ALTER TABLE trades
  ADD COLUMN IF NOT EXISTS status           TEXT DEFAULT 'CLOSED',
  ADD COLUMN IF NOT EXISTS last_price       NUMERIC,
  ADD COLUMN IF NOT EXISTS last_price_at    TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS exit_price_raw   NUMERIC,
  ADD COLUMN IF NOT EXISTS exit_reason      TEXT,
  ADD COLUMN IF NOT EXISTS opened_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at        TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS r_multiple       NUMERIC;

-- Useful indexes for the monitor engine
CREATE INDEX IF NOT EXISTS idx_trades_status        ON trades(status);
CREATE INDEX IF NOT EXISTS idx_trades_user_status   ON trades(user_id, status);

-- 2. Trade Events — immutable audit log of every price update and status change
CREATE TABLE IF NOT EXISTS trade_events (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id    TEXT        NOT NULL REFERENCES trades(id) ON DELETE CASCADE,
  event_type  TEXT        NOT NULL,
  price       NUMERIC,
  note        TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_trade_events_trade_id   ON trade_events(trade_id);
CREATE INDEX IF NOT EXISTS idx_trade_events_created_at ON trade_events(created_at DESC);

-- 3. Market Prices — latest price per symbol (upserted by backend)
CREATE TABLE IF NOT EXISTS market_prices (
  symbol      TEXT        PRIMARY KEY,
  price       NUMERIC     NOT NULL,
  bid         NUMERIC,
  ask         NUMERIC,
  source      TEXT        DEFAULT 'twelvedata',
  updated_at  TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Notifications — per-user trade alerts
CREATE TABLE IF NOT EXISTS notifications (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  trade_id    TEXT        REFERENCES trades(id) ON DELETE CASCADE,
  type        TEXT        NOT NULL,
  message     TEXT        NOT NULL,
  price       NUMERIC,
  r_multiple  NUMERIC,
  read        BOOLEAN     DEFAULT FALSE,
  created_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_user_id   ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_read       ON notifications(user_id, read);

-- 5. Enable Supabase Realtime for tables the frontend subscribes to
ALTER PUBLICATION supabase_realtime ADD TABLE trades;
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE market_prices;

-- 6. Row Level Security for new tables
ALTER TABLE trade_events ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own trade events" ON trade_events;
CREATE POLICY "Users can read their own trade events"
  ON trade_events FOR SELECT
  USING (
    trade_id IN (
      SELECT id FROM trades WHERE user_id = auth.uid()
    )
  );

ALTER TABLE market_prices ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Anyone can read market prices" ON market_prices;
CREATE POLICY "Anyone can read market prices"
  ON market_prices FOR SELECT USING (true);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can read their own notifications" ON notifications;
CREATE POLICY "Users can read their own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "Users can update their own notifications" ON notifications;
CREATE POLICY "Users can update their own notifications"
  ON notifications FOR UPDATE
  USING (user_id = auth.uid());
