-- ============================================================================
-- Migration: Add Pricing Fields
-- ============================================================================
-- Adds pricing information to SKUs, Order Items, and Orders
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Add pricing to SKUs table
-- ----------------------------------------------------------------------------
ALTER TABLE skus
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS unit_cost NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Add comment
COMMENT ON COLUMN skus.unit_price IS 'Selling price per unit';
COMMENT ON COLUMN skus.unit_cost IS 'Cost price for inventory valuation';
COMMENT ON COLUMN skus.currency IS 'Currency code (e.g., USD, EUR, NZD)';

-- ----------------------------------------------------------------------------
-- Add pricing to order_items table
-- ----------------------------------------------------------------------------
ALTER TABLE order_items
  ADD COLUMN IF NOT EXISTS unit_price NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS line_total NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Add comment
COMMENT ON COLUMN order_items.unit_price IS 'Price per unit at time of order';
COMMENT ON COLUMN order_items.line_total IS 'Total for this line item (quantity * unitPrice)';
COMMENT ON COLUMN order_items.currency IS 'Currency code for this line item';

-- ----------------------------------------------------------------------------
-- Add pricing to orders table
-- ----------------------------------------------------------------------------
ALTER TABLE orders
  ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shipping_cost NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2),
  ADD COLUMN IF NOT EXISTS currency VARCHAR(3) DEFAULT 'USD';

-- Add comment
COMMENT ON COLUMN orders.subtotal IS 'Sum of all line item totals';
COMMENT ON COLUMN orders.tax_amount IS 'Total tax for the order';
COMMENT ON COLUMN orders.shipping_cost IS 'Shipping cost';
COMMENT ON COLUMN orders.discount_amount IS 'Total discount applied';
COMMENT ON COLUMN orders.total_amount IS 'Final total (subtotal + tax + shipping - discount)';
COMMENT ON COLUMN orders.currency IS 'Currency code for the order';

-- ----------------------------------------------------------------------------
-- Add index for pricing queries
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_orders_total_amount ON orders(total_amount) WHERE total_amount IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_order_items_line_total ON order_items(line_total) WHERE line_total IS NOT NULL;
