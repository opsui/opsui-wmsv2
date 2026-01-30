-- Migration: Add cycle count variance support to order_exceptions table
-- Date: 2026-01-26
-- Description: Adds optional columns to support cycle count variance exceptions

-- Add CYCLE_COUNT_VARIANCE to the exception type constraint
ALTER TABLE order_exceptions DROP CONSTRAINT IF EXISTS check_exception_type;

ALTER TABLE order_exceptions
ADD CONSTRAINT check_exception_type
CHECK (type IN ('SHORT_PICK', 'SHORT_PICK_BACKORDER', 'DAMAGE', 'DEFECTIVE',
                 'WRONG_ITEM', 'SUBSTITUTION', 'OUT_OF_STOCK', 'BIN_MISMATCH',
                 'BARCODE_MISMATCH', 'EXPIRED', 'CYCLE_COUNT_VARIANCE', 'OTHER'));

-- Make order_id and order_item_id nullable for cycle count variances
ALTER TABLE order_exceptions ALTER COLUMN order_id DROP NOT NULL;
ALTER TABLE order_exceptions ALTER COLUMN order_item_id DROP NOT NULL;

-- Drop foreign key constraints that require NOT NULL (we'll handle this in the application)
ALTER TABLE order_exceptions DROP CONSTRAINT IF EXISTS order_exceptions_order_id_fkey;
ALTER TABLE order_exceptions DROP CONSTRAINT IF EXISTS order_exceptions_order_item_id_fkey;

-- Re-add foreign key constraints without ON DELETE CASCADE (since columns can be null)
ALTER TABLE order_exceptions
ADD CONSTRAINT order_exceptions_order_id_fkey
FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE;

ALTER TABLE order_exceptions
ADD CONSTRAINT order_exceptions_order_item_id_fkey
FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id) ON DELETE CASCADE;

-- Add cycle count variance specific columns
ALTER TABLE order_exceptions
ADD COLUMN IF NOT EXISTS cycle_count_entry_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS cycle_count_plan_id VARCHAR(50),
ADD COLUMN IF NOT EXISTS bin_location VARCHAR(100),
ADD COLUMN IF NOT EXISTS system_quantity NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS counted_quantity NUMERIC(10, 2),
ADD COLUMN IF NOT EXISTS variance_percent NUMERIC(5, 2),
ADD COLUMN IF NOT EXISTS variance_reason_code VARCHAR(50);

-- Add foreign key to cycle count entries
ALTER TABLE order_exceptions
ADD CONSTRAINT order_exceptions_cycle_count_entry_id_fkey
FOREIGN KEY (cycle_count_entry_id) REFERENCES cycle_count_entries(entry_id) ON DELETE SET NULL;

-- Add index for cycle count variance queries
CREATE INDEX IF NOT EXISTS idx_order_exceptions_cycle_count_entry_id
ON order_exceptions(cycle_count_entry_id);

CREATE INDEX IF NOT EXISTS idx_order_exceptions_cycle_count_plan_id
ON order_exceptions(cycle_count_plan_id);

CREATE INDEX IF NOT EXISTS idx_order_exceptions_bin_location
ON order_exceptions(bin_location);

-- Add comments
COMMENT ON COLUMN order_exceptions.cycle_count_entry_id IS 'For CYCLE_COUNT_VARIANCE exceptions, links to the cycle count entry';
COMMENT ON COLUMN order_exceptions.cycle_count_plan_id IS 'For CYCLE_COUNT_VARIANCE exceptions, links to the cycle count plan';
COMMENT ON COLUMN order_exceptions.bin_location IS 'For CYCLE_COUNT_VARIANCE exceptions, the bin location where variance was detected';
COMMENT ON COLUMN order_exceptions.system_quantity IS 'For CYCLE_COUNT_VARIANCE exceptions, the expected quantity from system';
COMMENT ON COLUMN order_exceptions.counted_quantity IS 'For CYCLE_COUNT_VARIANCE exceptions, the actual counted quantity';
COMMENT ON COLUMN order_exceptions.variance_percent IS 'For CYCLE_COUNT_VARIANCE exceptions, variance as percentage';
COMMENT ON COLUMN order_exceptions.variance_reason_code IS 'For CYCLE_COUNT_VARIANCE exceptions, reason code (DATA_ENTRY_ERROR, DAMAGE, THEFT, etc.)';
