-- Add billing_address column to orders table
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS billing_address JSONB;
