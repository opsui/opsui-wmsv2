-- Migration 017: Recurring Count Schedules
-- Creates table for automated recurring cycle count schedules
-- Supports daily, weekly, monthly, and quarterly recurring counts

-- Create recurring count schedules table
CREATE TABLE IF NOT EXISTS recurring_count_schedules (
  schedule_id VARCHAR(50) PRIMARY KEY,
  schedule_name VARCHAR(200) NOT NULL,
  count_type VARCHAR(20) NOT NULL CHECK (count_type IN ('ABC', 'BLANKET', 'SPOT_CHECK', 'RECEIVING', 'SHIPPING', 'AD_HOC')),
  frequency_type VARCHAR(20) NOT NULL CHECK (frequency_type IN ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY')),
  frequency_interval INTEGER DEFAULT 1 CHECK (frequency_interval > 0),
  location VARCHAR(50),
  sku VARCHAR(500),
  assigned_to VARCHAR(50) NOT NULL,
  next_run_date TIMESTAMP NOT NULL,
  last_run_date TIMESTAMP,
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  CONSTRAINT fk_schedule_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(user_id) ON DELETE RESTRICT,
  CONSTRAINT fk_schedule_created_by FOREIGN KEY (created_by) REFERENCES users(user_id) ON DELETE RESTRICT
);

-- Create indexes for schedule processing and queries
CREATE INDEX IF NOT EXISTS idx_schedule_next_run ON recurring_count_schedules(next_run_date, is_active);
CREATE INDEX IF NOT EXISTS idx_schedule_frequency ON recurring_count_schedules(frequency_type);
CREATE INDEX IF NOT EXISTS idx_schedule_type ON recurring_count_schedules(count_type);
CREATE INDEX IF NOT EXISTS idx_schedule_assigned ON recurring_count_schedules(assigned_to);
CREATE INDEX IF NOT EXISTS idx_schedule_active ON recurring_count_schedules(is_active);

-- Add comments for documentation
COMMENT ON TABLE recurring_count_schedules IS 'Stores automated recurring cycle count schedules';
COMMENT ON COLUMN recurring_count_schedules.schedule_name IS 'Human-readable name for the schedule';
COMMENT ON COLUMN recurring_count_schedules.count_type IS 'Type of cycle count to generate (ABC, BLANKET, etc.)';
COMMENT ON COLUMN recurring_count_schedules.frequency_type IS 'How often the count recurs (DAILY, WEEKLY, MONTHLY, QUARTERLY)';
COMMENT ON COLUMN recurring_count_schedules.frequency_interval IS 'Interval multiplier (e.g., 2 for every 2 weeks)';
COMMENT ON COLUMN recurring_count_schedules.location IS 'Optional: Specific location for scheduled counts';
COMMENT ON COLUMN recurring_count_schedules.sku IS 'Optional: Comma-separated list of SKUs to count';
COMMENT ON COLUMN recurring_count_schedules.next_run_date IS 'When this schedule will next generate a cycle count plan';
COMMENT ON COLUMN recurring_count_schedules.last_run_date IS 'When this schedule last generated a cycle count plan';
