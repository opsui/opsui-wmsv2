-- Migration 018: Root Cause Categories
-- Creates reference table for variance root cause categories
-- Provides standardized categorization for variance analysis

-- Create root cause categories table
CREATE TABLE IF NOT EXISTS root_cause_categories (
  category_id VARCHAR(50) PRIMARY KEY,
  category_name VARCHAR(100) NOT NULL,
  category_code VARCHAR(20) UNIQUE NOT NULL,
  description TEXT,
  display_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insert default root cause categories
INSERT INTO root_cause_categories (category_id, category_name, category_code, description, display_order) VALUES
('rc-data-entry', 'Data Entry Error', 'DATA_ENTRY', 'Typo or input mistake during counting', 1),
('rc-damage', 'Product Damage', 'DAMAGE', 'Product damaged during handling or storage', 2),
('rc-theft', 'Theft/Loss', 'THEFT', 'Missing items due to theft or unexplained loss', 3),
('rc-receiving', 'Receiving Error', 'RECEIVING', 'Wrong quantity received from supplier', 4),
('rc-shipping', 'Shipping Error', 'SHIPPING', 'Wrong quantity shipped to customer', 5),
('rc-system', 'System Error', 'SYSTEM', 'Inventory system discrepancy or timing issue', 6),
('rc-count-slip', 'Cycle Count Slip', 'COUNT_SLIP', 'Item missed during counting process', 7),
('rc-unknown', 'Unknown', 'UNKNOWN', 'Cause could not be determined', 99)
ON CONFLICT (category_id) DO NOTHING;

-- Create index for active categories
CREATE INDEX IF NOT EXISTS idx_root_cause_active ON root_cause_categories(is_active, display_order);

-- Add comments for documentation
COMMENT ON TABLE root_cause_categories IS 'Reference table for variance root cause categories';
COMMENT ON COLUMN root_cause_categories.category_code IS 'Short code for programmatic access';
COMMENT ON COLUMN root_cause_categories.display_order IS 'Order for displaying in UI dropdowns';
