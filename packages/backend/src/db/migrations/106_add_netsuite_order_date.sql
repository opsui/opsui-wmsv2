ALTER TABLE orders
ADD COLUMN IF NOT EXISTS netsuite_order_date DATE;
