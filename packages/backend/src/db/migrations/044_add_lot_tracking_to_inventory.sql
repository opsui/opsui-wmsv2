-- Migration: Add Lot Tracking to Core Inventory
-- Date: 2026-02-07
-- Description: Adds lot number, expiration date, and serial number tracking to inventory_units table
--              This brings lot tracking capability from receiving/QC into core inventory management

-- Add lot tracking columns to inventory_units
ALTER TABLE inventory_units
  ADD COLUMN IF NOT EXISTS lot_number VARCHAR(100),
  ADD COLUMN IF NOT EXISTS expiration_date TIMESTAMP WITH TIME ZONE,
  ADD COLUMN IF NOT EXISTS serial_numbers TEXT[];

-- Create indexes for lot-based queries
CREATE INDEX IF NOT EXISTS idx_inventory_units_lot ON inventory_units(lot_number);
CREATE INDEX IF NOT EXISTS idx_inventory_units_expiration ON inventory_units(expiration_date);
CREATE INDEX IF NOT EXISTS idx_inventory_units_serial ON inventory_units USING GIN(serial_numbers);

-- Add comment for documentation
COMMENT ON COLUMN inventory_units.lot_number IS 'Lot/batch number for traceability and FEFO picking';
COMMENT ON COLUMN inventory_units.expiration_date IS 'Expiration date for FEFO (First Expired First Out) picking';
COMMENT ON COLUMN inventory_units.serial_numbers IS 'Array of serial numbers for individual item tracking';
