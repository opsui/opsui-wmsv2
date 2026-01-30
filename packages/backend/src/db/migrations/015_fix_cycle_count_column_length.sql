-- Migration: Fix cycle_count column lengths for user ID references
-- Date: 2025-01-27
-- Description: Updates counted_by and reviewed_by columns to VARCHAR(50)
--              to match schema expectations and support longer user IDs

-- ============================================
-- cycle_count_plans table
-- ============================================

-- Alter count_type column to VARCHAR(50)
ALTER TABLE cycle_count_plans
ALTER COLUMN count_type TYPE VARCHAR(50);

COMMENT ON COLUMN cycle_count_plans.count_type IS 'Type of cycle count: ABC, BLANKET, SPOT_CHECK, RECEIVING, SHIPPING, AD_HOC';

-- Alter count_by column to VARCHAR(50) to match users table
ALTER TABLE cycle_count_plans
ALTER COLUMN count_by TYPE VARCHAR(50);

COMMENT ON COLUMN cycle_count_plans.count_by IS 'User ID of the person who will perform/is performing the count';

-- Alter created_by column to VARCHAR(50) to match users table
ALTER TABLE cycle_count_plans
ALTER COLUMN created_by TYPE VARCHAR(50);

COMMENT ON COLUMN cycle_count_plans.created_by IS 'User ID of the person who created the plan';

-- ============================================
-- cycle_count_entries table
-- ============================================

-- Alter counted_by column to VARCHAR(50) to match users table
ALTER TABLE cycle_count_entries
ALTER COLUMN counted_by TYPE VARCHAR(50);

COMMENT ON COLUMN cycle_count_entries.counted_by IS 'User ID of the person who counted this item';

-- Alter reviewed_by column to VARCHAR(50) to match users table
ALTER TABLE cycle_count_entries
ALTER COLUMN reviewed_by TYPE VARCHAR(50);

COMMENT ON COLUMN cycle_count_entries.reviewed_by IS 'User ID of the person who reviewed this variance';
