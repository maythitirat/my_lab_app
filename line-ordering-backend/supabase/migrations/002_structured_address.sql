-- ─────────────────────────────────────────────────────────────────────────────
-- 002_structured_address.sql  —  Add structured Thai address columns + photo URLs
-- Run in Supabase SQL Editor or via psql
-- ─────────────────────────────────────────────────────────────────────────────

-- ── Structured address fields ─────────────────────────────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS address_line   TEXT         NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS sub_district   VARCHAR(128) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS district       VARCHAR(128) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS province       VARCHAR(128) NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS postal_code    VARCHAR(10)  NOT NULL DEFAULT '';

-- ── Photo URL fields (nullable — upload is optional) ─────────────────────────
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS address_photo_url TEXT DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS phone_photo_url   TEXT DEFAULT NULL;

-- ── Indexes for reporting / filtering ────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_orders_province    ON orders(province);
CREATE INDEX IF NOT EXISTS idx_orders_district    ON orders(district);
CREATE INDEX IF NOT EXISTS idx_orders_postal_code ON orders(postal_code);

-- ── Back-fill existing rows (address → address_line) ─────────────────────────
-- Sets address_line to the existing freeform address so old rows stay queryable.
UPDATE orders
SET address_line = address
WHERE address_line = '' AND address IS NOT NULL AND address <> '';

COMMENT ON COLUMN orders.address       IS 'Legacy single-string address (kept for backwards compatibility)';
COMMENT ON COLUMN orders.address_line  IS 'บ้านเลขที่ หมู่ ซอย รายละเอียดเพิ่มเติม';
COMMENT ON COLUMN orders.sub_district  IS 'แขวง / ตำบล';
COMMENT ON COLUMN orders.district      IS 'เขต / อำเภอ';
COMMENT ON COLUMN orders.province      IS 'จังหวัด';
COMMENT ON COLUMN orders.postal_code   IS 'รหัสไปรษณีย์';
COMMENT ON COLUMN orders.address_photo_url IS 'URL of uploaded address / house-sign photo';
COMMENT ON COLUMN orders.phone_photo_url   IS 'URL of uploaded business-card / contact photo';
