-- Migration 004: add status column to orders
-- Values: 'pending' | 'confirmed' | 'cancelled'

ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS status VARCHAR(20) NOT NULL DEFAULT 'pending';

-- Backfill existing rows
UPDATE orders SET status = 'pending' WHERE status IS NULL OR status = '';

-- Optional index for admin queries filtering by status
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
