-- Migration: Add stock control tables
-- Date: 2025-01-18
-- Description: Creates tables for stock count functionality

-- Stock Counts table
CREATE TABLE IF NOT EXISTS stock_counts (
  count_id VARCHAR(50) PRIMARY KEY,
  bin_location VARCHAR(20) NOT NULL REFERENCES bin_locations(bin_id) ON DELETE RESTRICT,
  type VARCHAR(20) NOT NULL CHECK (type IN ('FULL', 'CYCLIC', 'SPOT')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'VERIFIED')),
  created_by VARCHAR(20) NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  verified_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL
);

-- Stock Count Items table
CREATE TABLE IF NOT EXISTS stock_count_items (
  count_item_id VARCHAR(50) PRIMARY KEY,
  count_id VARCHAR(50) NOT NULL REFERENCES stock_counts(count_id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL REFERENCES skus(sku) ON DELETE RESTRICT,
  expected_quantity INTEGER NOT NULL DEFAULT 0,
  counted_quantity INTEGER NOT NULL DEFAULT 0,
  variance INTEGER NOT NULL DEFAULT 0,
  notes TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_stock_counts_bin_location ON stock_counts(bin_location);
CREATE INDEX IF NOT EXISTS idx_stock_counts_status ON stock_counts(status);
CREATE INDEX IF NOT EXISTS idx_stock_counts_created_at ON stock_counts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_stock_count_items_count_id ON stock_count_items(count_id);
CREATE INDEX IF NOT EXISTS idx_stock_count_items_sku ON stock_count_items(sku);
