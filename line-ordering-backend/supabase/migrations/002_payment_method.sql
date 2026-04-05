-- Add payment_method column to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS payment_method VARCHAR(10) NOT NULL DEFAULT 'cod';
