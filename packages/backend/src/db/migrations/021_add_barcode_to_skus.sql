-- ============================================================================
-- Migration: Add barcode field to SKUs
-- ============================================================================
-- Purpose: Add EAN/UPC barcode field to all SKUs
-- ============================================================================

-- Add barcode column
ALTER TABLE skus ADD COLUMN IF NOT EXISTS barcode VARCHAR(20) UNIQUE;

-- Add index for barcode lookups
CREATE INDEX IF NOT EXISTS idx_skus_barcode ON skus(barcode);

-- Comment the column
COMMENT ON COLUMN skus.barcode IS 'EAN/UPC barcode for the SKU (12-13 digits)';

-- ============================================================================
-- UPDATE SEED DATA WITH REAL BARCODES
-- ============================================================================

-- Update existing SKUs with real barcodes
UPDATE skus SET barcode = '0796548106754' WHERE sku = 'WIDGET-A';
UPDATE skus SET barcode = '0796548106761' WHERE sku = 'WIDGET-B';
UPDATE skus SET barcode = '0796548106778' WHERE sku = 'GADGET-X';
UPDATE skus SET barcode = '0796548106785' WHERE sku = 'GADGET-Y';
UPDATE skus SET barcode = '0796548106792' WHERE sku = 'TOOL-001';
UPDATE skus SET barcode = '0796548106808' WHERE sku = 'TOOL-002';
UPDATE skus SET barcode = '0796548106815' WHERE sku = 'PART-123';
UPDATE skus SET barcode = '0796548106822' WHERE sku = 'PART-456';

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================