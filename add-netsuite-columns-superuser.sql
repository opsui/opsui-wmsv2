-- Run this script as postgres superuser
-- Command: psql -h localhost -p 5432 -U postgres -d aap_db -f add-netsuite-columns-superuser.sql

-- Add NetSuite columns to orders table
ALTER TABLE orders ADD COLUMN IF NOT EXISTS netsuite_so_internal_id VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS netsuite_so_tran_id VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS netsuite_if_internal_id VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS netsuite_if_tran_id VARCHAR(50);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS netsuite_last_synced_at TIMESTAMP with time zone;
ALTER TABLE orders ADD COLUMN IF NOT exists netsuite_source VARCHAR(20);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2);
ALTER TABLE orders ADD COLUMN IF NOT exists total_amount NUMERIC(12, 2);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_orders_ns_so ON orders(netsuite_so_internal_id);
CREATE INDEX IF NOT EXISTS idx_orders_ns_if ON orders(netsuite_if_internal_id);

-- Verify columns were added
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'orders' AND column_name LIKE 'netsuite_%';
