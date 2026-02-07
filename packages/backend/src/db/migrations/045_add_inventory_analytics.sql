-- Migration: Add Inventory Analytics Tables
-- Date: 2026-02-07
-- Description: Creates tables for inventory aging, turnover tracking, and analytics

-- Inventory snapshots for aging analysis
CREATE TABLE IF NOT EXISTS inventory_snapshots (
  snapshot_id VARCHAR(50) PRIMARY KEY,
  snapshot_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  sku VARCHAR(50) NOT NULL REFERENCES skus(sku) ON DELETE RESTRICT,
  bin_location VARCHAR(20) REFERENCES bin_locations(bin_id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL,
  lot_number VARCHAR(100),
  expiration_date TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Stock movement summary for turnover calculations
CREATE TABLE IF NOT EXISTS stock_movement_summary (
  summary_id VARCHAR(50) PRIMARY KEY,
  sku VARCHAR(50) NOT NULL REFERENCES skus(sku) ON DELETE RESTRICT,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  receipts_quantity INTEGER NOT NULL DEFAULT 0,
  deductions_quantity INTEGER NOT NULL DEFAULT 0,
  average_inventory INTEGER NOT NULL DEFAULT 0,
  turnover_count NUMERIC(10,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT sku_period_unique UNIQUE (sku, period_start, period_end)
);

-- Create indexes for analytics queries
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_sku_date ON inventory_snapshots(sku, snapshot_date DESC);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_bin ON inventory_snapshots(bin_location);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_lot ON inventory_snapshots(lot_number);
CREATE INDEX IF NOT EXISTS idx_inventory_snapshots_expiration ON inventory_snapshots(expiration_date);

CREATE INDEX IF NOT EXISTS idx_stock_movement_summary_sku ON stock_movement_summary(sku);
CREATE INDEX IF NOT EXISTS idx_stock_movement_summary_period ON stock_movement_summary(period_start, period_end);

-- Add comments for documentation
COMMENT ON TABLE inventory_snapshots IS 'Historical snapshots of inventory levels for aging analysis';
COMMENT ON TABLE stock_movement_summary IS 'Aggregated stock movement data for turnover calculations';

COMMENT ON COLUMN stock_movement_summary.turnover_count IS 'Turnover rate: cost of goods sold / average inventory';
COMMENT ON COLUMN stock_movement_summary.average_inventory IS 'Average inventory level during the period';
