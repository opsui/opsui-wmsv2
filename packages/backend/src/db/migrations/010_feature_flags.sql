-- Migration 010: Feature Flags and Seed Scenarios
-- This migration adds feature flags support and seed scenario management

-- Feature Flags Table
CREATE TABLE IF NOT EXISTS feature_flags (
  flag_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  is_enabled BOOLEAN DEFAULT false,
  category VARCHAR(50) NOT NULL CHECK (category IN ('picking', 'packing', 'inventory', 'shipping', 'experimental')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed Scenarios Table
CREATE TABLE IF NOT EXISTS seed_scenarios (
  scenario_id VARCHAR(36) PRIMARY KEY DEFAULT gen_random_uuid(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  data JSONB NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(100)
);

-- Migration History Table
CREATE TABLE IF NOT EXISTS migration_history (
  history_id SERIAL PRIMARY KEY,
  migration_name VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  applied_by VARCHAR(100),
  rollback_sql TEXT
);

-- Index for feature flags
CREATE INDEX IF NOT EXISTS idx_feature_flags_category ON feature_flags(category);
CREATE INDEX IF NOT EXISTS idx_feature_flags_enabled ON feature_flags(is_enabled);

-- Index for seed scenarios
CREATE INDEX IF NOT EXISTS idx_seed_scenarios_created_at ON seed_scenarios(created_at DESC);

-- Seed initial feature flags
INSERT INTO feature_flags (flag_key, name, description, is_enabled, category) VALUES
  ('wave_picking', 'Wave Picking', 'Enable wave-based batch picking workflow', false, 'picking'),
  ('zone_picking', 'Zone Picking', 'Enable zone-based picking optimization', false, 'picking'),
  ('slotting_optimization', 'Slotting Optimization', 'Enable AI-powered slotting recommendations', false, 'inventory'),
  ('barcode_verification', 'Barcode Verification', 'Require double-scanning verification', false, 'packing'),
  ('auto_carrier_selection', 'Auto Carrier Selection', 'Automatically select optimal carrier', false, 'shipping'),
  ('batch_picking', 'Batch Picking', 'Enable multi-order batch picking', false, 'picking'),
  ('dynamic_slotting', 'Dynamic Slotting', 'Automatically adjust bin locations based on demand', false, 'inventory'),
  ('smart_packing', 'Smart Packing', 'AI-powered box size recommendations', false, 'packing')
ON CONFLICT (flag_key) DO NOTHING;

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_feature_flag_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to auto-update updated_at
DROP TRIGGER IF EXISTS trigger_update_feature_flag_updated_at ON feature_flags;
CREATE TRIGGER trigger_update_feature_flag_updated_at
  BEFORE UPDATE ON feature_flags
  FOR EACH ROW
  EXECUTE FUNCTION update_feature_flag_updated_at();

-- Record this migration
INSERT INTO migration_history (migration_name, applied_by, rollback_sql) VALUES
  ('010_feature_flags', 'system',
   'DROP TABLE IF EXISTS feature_flags CASCADE;
    DROP TABLE IF EXISTS seed_scenarios CASCADE;
    DROP TABLE IF EXISTS migration_history CASCADE;
    DROP FUNCTION IF EXISTS update_feature_flag_updated_at();');
