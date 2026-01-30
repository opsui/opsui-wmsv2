-- Migration: Fix order_exceptions foreign key constraint
-- Date: 2025-01-19
-- Description: Remove foreign key constraint on order_item_id since it can reference
--              either order_items or pick_tasks (when order is in PICKING status)

-- Drop the existing table and recreate without the restrictive foreign key
DROP TABLE IF EXISTS order_exceptions CASCADE;

-- Recreate order_exceptions table with relaxed foreign key
CREATE TABLE order_exceptions (
  exception_id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  order_item_id VARCHAR(50) NOT NULL, -- Can reference order_items OR pick_tasks
  sku VARCHAR(50) NOT NULL REFERENCES skus(sku) ON DELETE RESTRICT,
  type VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
  resolution VARCHAR(50),

  -- Quantity tracking
  quantity_expected INTEGER NOT NULL,
  quantity_actual INTEGER NOT NULL,
  quantity_short INTEGER NOT NULL GENERATED ALWAYS AS (quantity_expected - quantity_actual) STORED,

  -- Exception details
  reason TEXT NOT NULL,
  resolution_notes TEXT,
  substitute_sku VARCHAR(50) REFERENCES skus(sku) ON DELETE SET NULL,

  -- Audit trail
  reported_by VARCHAR(20) NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  resolved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  resolved_at TIMESTAMP WITH TIME ZONE,

  -- Constraints
  CONSTRAINT check_exception_type
    CHECK (type IN ('SHORT_PICK', 'SHORT_PICK_BACKORDER', 'DAMAGE', 'DEFECTIVE',
                   'WRONG_ITEM', 'SUBSTITUTION', 'OUT_OF_STOCK', 'BIN_MISMATCH',
                   'BARCODE_MISMATCH', 'EXPIRED', 'OTHER')),
  CONSTRAINT check_exception_status
    CHECK (status IN ('OPEN', 'REVIEWING', 'APPROVED', 'REJECTED', 'RESOLVED', 'CANCELLED')),
  CONSTRAINT check_exception_resolution
    CHECK (resolution IN ('BACKORDER', 'SUBSTITUTE', 'CANCEL_ITEM', 'CANCEL_ORDER',
                          'ADJUST_QUANTITY', 'RETURN_TO_STOCK', 'WRITE_OFF',
                          'TRANSFER_BIN', 'CONTACT_CUSTOMER', 'MANUAL_OVERRIDE'))
);

-- Create indexes for common queries
CREATE INDEX IF NOT EXISTS idx_order_exceptions_order_id ON order_exceptions(order_id);
CREATE INDEX IF NOT EXISTS idx_order_exceptions_sku ON order_exceptions(sku);
CREATE INDEX IF NOT EXISTS idx_order_exceptions_status ON order_exceptions(status);
CREATE INDEX IF NOT EXISTS idx_order_exceptions_type ON order_exceptions(type);
CREATE INDEX IF NOT EXISTS idx_order_exceptions_reported_at ON order_exceptions(reported_at DESC);
CREATE INDEX IF NOT EXISTS idx_order_exceptions_reported_by ON order_exceptions(reported_by);

-- Create index for open exceptions that need attention
CREATE INDEX IF NOT EXISTS idx_order_exceptions_open_needs_attention
  ON order_exceptions(status) WHERE status = 'OPEN';

-- Add comment
COMMENT ON TABLE order_exceptions IS 'Tracks exceptions that occur during order fulfillment such as short picks, damages, substitutions, etc.';
COMMENT ON COLUMN order_exceptions.order_item_id IS 'Can be either an order_item_id (from order_items) or a pick_task_id (from pick_tasks when order is PICKING)';
COMMENT ON COLUMN order_exceptions.quantity_short IS 'Automatically calculated difference between expected and actual quantities';
COMMENT ON COLUMN order_exceptions.substitute_sku IS 'For substitution exceptions, the alternative SKU used';
