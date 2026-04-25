-- Add tracking_number column to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS tracking_number VARCHAR(128);
CREATE INDEX IF NOT EXISTS idx_orders_tracking_number ON orders(tracking_number);
