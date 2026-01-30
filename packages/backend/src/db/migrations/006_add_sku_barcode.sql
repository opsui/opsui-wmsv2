-- Migration: Add barcode column to skus table
-- Date: 2026-01-20

-- Add barcode column to skus table
ALTER TABLE skus
ADD COLUMN IF NOT EXISTS barcode VARCHAR(50) UNIQUE;

-- Add comment for documentation
COMMENT ON COLUMN skus.barcode IS 'Product barcode (EAN-13, UPC, or custom format)';

-- Create index for faster lookups by barcode
CREATE INDEX IF NOT EXISTS idx_skus_barcode ON skus(barcode);
