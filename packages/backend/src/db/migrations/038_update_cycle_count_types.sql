-- Migration: Update cycle count types to match frontend enum
-- Date: 2026-01-26

-- Drop old constraint
ALTER TABLE cycle_count_plans DROP CONSTRAINT IF EXISTS chk_count_type;

-- Add new constraint with updated values
ALTER TABLE cycle_count_plans
ADD CONSTRAINT chk_count_type
CHECK (count_type IN ('ABC', 'BLANKET', 'SPOT_CHECK', 'RECEIVING', 'SHIPPING', 'AD_HOC'));
