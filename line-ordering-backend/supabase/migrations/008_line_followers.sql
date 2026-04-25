-- ── line_followers ────────────────────────────────────────────────────────
-- Stores LINE users who typed the keyword "รับออเดอร์" to the OA.
-- Used by admin to look up and link customers.

CREATE TABLE IF NOT EXISTS line_followers (
  id              SERIAL        PRIMARY KEY,
  line_user_id    VARCHAR(64)   NOT NULL UNIQUE,
  display_name    VARCHAR(128),
  picture_url     TEXT,
  last_seen_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_line_followers_display_name ON line_followers(display_name);

ALTER TABLE line_followers ENABLE ROW LEVEL SECURITY;
