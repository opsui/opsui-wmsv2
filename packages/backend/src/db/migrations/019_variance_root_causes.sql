-- Migration 019: Variance Root Causes
-- Creates link table between cycle count entries and root cause categories
-- Enables Pareto analysis and trend tracking

-- Create variance root causes table
CREATE TABLE IF NOT EXISTS variance_root_causes (
  root_cause_id VARCHAR(50) PRIMARY KEY,
  entry_id VARCHAR(50) NOT NULL,
  category_id VARCHAR(50) NOT NULL,
  additional_notes TEXT,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_root_cause_entry FOREIGN KEY (entry_id) REFERENCES cycle_count_entries(entry_id) ON DELETE CASCADE,
  CONSTRAINT fk_root_cause_category FOREIGN KEY (category_id) REFERENCES root_cause_categories(category_id),
  CONSTRAINT fk_root_cause_created_by FOREIGN KEY (created_by) REFERENCES users(user_id)
);

-- Create indexes for analysis queries
CREATE INDEX IF NOT EXISTS idx_root_cause_entry ON variance_root_causes(entry_id);
CREATE INDEX IF NOT EXISTS idx_root_cause_category ON variance_root_causes(category_id);
CREATE INDEX IF NOT EXISTS idx_root_cause_created ON variance_root_causes(created_at);
CREATE INDEX IF NOT EXISTS idx_root_cause_created_by ON variance_root_causes(created_by);

-- Create unique constraint to prevent duplicate root causes per entry
CREATE UNIQUE INDEX IF NOT EXISTS idx_root_cause_unique_entry ON variance_root_causes(entry_id);

-- Add comments for documentation
COMMENT ON TABLE variance_root_causes IS 'Links cycle count variances to their root cause categories';
COMMENT ON COLUMN variance_root_causes.entry_id IS 'Reference to the cycle count entry with variance';
COMMENT ON COLUMN variance_root_causes.category_id IS 'Categorized root cause for the variance';
COMMENT ON COLUMN variance_root_causes.additional_notes IS 'Optional additional context about the root cause';
COMMENT ON COLUMN variance_root_causes.created_by IS 'User who recorded the root cause';
