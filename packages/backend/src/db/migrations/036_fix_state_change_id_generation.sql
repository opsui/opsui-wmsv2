-- Fix state change ID generation to be more unique
-- Migration: 2024-01-15-fix-state-change-id-generation
-- Description: The old function only used seconds from epoch, causing duplicates when multiple orders were updated quickly

-- Drop the old function and create a new one with microsecond precision
CREATE OR REPLACE FUNCTION generate_state_change_id()
RETURNS VARCHAR(50) AS $$
  SELECT 'OSC-' ||
         TO_CHAR(NOW(), 'YYYYMMDD') || '-' ||
         LPAD(FLOOR(EXTRACT(EPOCH FROM NOW()) * 1000)::TEXT, 11, '0') || '-' ||
         LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
$$ LANGUAGE SQL;
