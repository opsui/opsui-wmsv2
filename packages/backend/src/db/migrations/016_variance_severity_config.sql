-- Migration 016: Variance Severity Configuration
-- Creates table for configurable variance severity thresholds
-- Allows admins to define severity levels based on variance percentage

-- Create variance severity configuration table
CREATE TABLE IF NOT EXISTS variance_severity_config (
  config_id VARCHAR(50) PRIMARY KEY,
  severity_level VARCHAR(20) NOT NULL CHECK (severity_level IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  min_variance_percent DECIMAL(5,2) NOT NULL,
  max_variance_percent DECIMAL(5,2) NOT NULL,
  requires_approval BOOLEAN DEFAULT true,
  requires_manager_approval BOOLEAN DEFAULT false,
  auto_adjust BOOLEAN DEFAULT false,
  color_code VARCHAR(20) DEFAULT '#000000',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT valid_variance_range CHECK (max_variance_percent > min_variance_percent)
);

-- Create indexes for lookups
CREATE INDEX IF NOT EXISTS idx_severity_variance_range ON variance_severity_config(min_variance_percent, max_variance_percent);
CREATE INDEX IF NOT EXISTS idx_severity_level ON variance_severity_config(severity_level);
CREATE INDEX IF NOT EXISTS idx_severity_active ON variance_severity_config(is_active);

-- Insert default severity configurations
INSERT INTO variance_severity_config (config_id, severity_level, min_variance_percent, max_variance_percent, requires_approval, auto_adjust, color_code) VALUES
('severity-low', 'LOW', 0, 2, false, true, '#10B981'),
('severity-medium', 'MEDIUM', 2, 5, true, false, '#F59E0B'),
('severity-high', 'HIGH', 5, 10, true, false, '#F97316'),
('severity-critical', 'CRITICAL', 10, 999999, true, false, '#EF4444')
ON CONFLICT (config_id) DO NOTHING;

-- Add comment for documentation
COMMENT ON TABLE variance_severity_config IS 'Stores configurable variance severity thresholds for cycle counting';
COMMENT ON COLUMN variance_severity_config.min_variance_percent IS 'Minimum variance percentage for this severity level';
COMMENT ON COLUMN variance_severity_config.max_variance_percent IS 'Maximum variance percentage for this severity level';
COMMENT ON COLUMN variance_severity_config.requires_approval IS 'Whether variances in this range require supervisor approval';
COMMENT ON COLUMN variance_severity_config.requires_manager_approval IS 'Whether variances in this range require manager approval';
COMMENT ON COLUMN variance_severity_config.auto_adjust IS 'Whether variances in this range should be auto-adjusted without approval';
COMMENT ON COLUMN variance_severity_config.color_code IS 'Color code for UI display (hex format)';
