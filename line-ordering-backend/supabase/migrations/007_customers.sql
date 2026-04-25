-- ── customers ─────────────────────────────────────────────────────────────────
-- Maps a LINE userId to a customer's phone number (the bridge key).
-- Populated manually by admin via the admin portal.

CREATE TABLE IF NOT EXISTS customers (
  id              SERIAL        PRIMARY KEY,
  line_user_id    VARCHAR(64)   UNIQUE,           -- LINE userId (stable, never changes)
  phone           VARCHAR(20)   NOT NULL UNIQUE,  -- from external system A
  name            VARCHAR(128),                   -- from external system A (for display)
  line_display_name VARCHAR(128),                 -- cached from LINE API
  note            TEXT,                           -- admin free-text note
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_phone        ON customers(phone);
CREATE INDEX IF NOT EXISTS idx_customers_line_user_id ON customers(line_user_id);

DROP TRIGGER IF EXISTS customers_updated_at ON customers;
CREATE TRIGGER customers_updated_at
  BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
