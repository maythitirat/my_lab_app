-- ─────────────────────────────────────────────────────────────────────────────
-- 001_init.sql  —  Initial schema for LINE Ordering System
-- Run once in Supabase SQL Editor (Dashboard → SQL Editor → New query)
-- or via psql:  psql "$DATABASE_URL" -f supabase/migrations/001_init.sql
-- ─────────────────────────────────────────────────────────────────────────────

-- Enable UUID extension (already available in Supabase but harmless to declare)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ── orders ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS orders (
  id           SERIAL        PRIMARY KEY,
  line_user_id VARCHAR(64)   NOT NULL,
  name         VARCHAR(128)  NOT NULL,
  phone        VARCHAR(20)   NOT NULL,
  address      TEXT          NOT NULL,
  total_price  NUMERIC(10,2) NOT NULL CHECK (total_price > 0),
  status       VARCHAR(20)   NOT NULL DEFAULT 'pending'
                             CHECK (status IN ('pending','confirmed','completed','cancelled')),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── order_items ───────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS order_items (
  id           SERIAL        PRIMARY KEY,
  order_id     INTEGER       NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  product_id   INTEGER       NOT NULL,
  product_name VARCHAR(128)  NOT NULL,
  price        NUMERIC(10,2) NOT NULL CHECK (price > 0),
  quantity     INTEGER       NOT NULL CHECK (quantity > 0),
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

-- ── Indexes ───────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_line_user_id ON orders(line_user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at   ON orders(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON order_items(order_id);

-- ── Auto-updated updated_at trigger ──────────────────────────────────────────
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS orders_updated_at ON orders;
CREATE TRIGGER orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ── Row-Level Security (optional but recommended) ────────────────────────────
-- The backend uses the service-role key which bypasses RLS.
-- Enable RLS to prevent direct anon/user access to the tables.
ALTER TABLE orders     ENABLE ROW LEVEL SECURITY;
ALTER TABLE order_items ENABLE ROW LEVEL SECURITY;

-- Service-role bypasses RLS automatically; no additional policy needed.
-- If you want to expose orders to authenticated users later, add policies here.
