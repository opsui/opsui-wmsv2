ALTER TABLE order_items
ADD COLUMN IF NOT EXISTS netsuite_available_quantity NUMERIC(12,3);

CREATE INDEX IF NOT EXISTS idx_order_items_netsuite_available_quantity
ON order_items (netsuite_available_quantity)
WHERE netsuite_available_quantity IS NOT NULL;
