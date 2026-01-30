-- ============================================================================
-- Migration: Add picker_status column to orders table
-- Purpose: Track real-time picker activity (ACTIVE/IDLE) based on window visibility
-- Date: 2026-01-13
-- ============================================================================

-- Add picker_status column to orders table
ALTER TABLE orders
ADD COLUMN picker_status VARCHAR(10) DEFAULT 'IDLE';

-- Add constraint to ensure only valid values
ALTER TABLE orders
ADD CONSTRAINT check_picker_status CHECK (picker_status IN ('ACTIVE', 'IDLE'));

-- Update default to IDLE for all existing records
UPDATE orders SET picker_status = 'IDLE' WHERE picker_status IS NULL;