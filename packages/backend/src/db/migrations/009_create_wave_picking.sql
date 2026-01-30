-- ============================================================================
-- Wave Picking Tables Migration
--
-- Creates tables for wave picking functionality
-- ============================================================================

-- Create waves table
CREATE TABLE IF NOT EXISTS waves (
  id BIGSERIAL PRIMARY KEY,
  wave_id VARCHAR(50) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PLANNED',
  criteria JSONB NOT NULL,
  order_ids TEXT[] NOT NULL,
  pick_tasks JSONB,
  assigned_pickers TEXT[],
  estimated_time INTEGER, -- In seconds
  estimated_distance NUMERIC(10, 2), -- In warehouse units
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(50) NOT NULL,

  CONSTRAINT waves_wave_id_check CHECK (wave_id IS NOT NULL),
  CONSTRAINT waves_status_check CHECK (status IN ('PLANNED', 'RELEASED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'))
);

-- Create wave_pick_tasks table
CREATE TABLE IF NOT EXISTS wave_pick_tasks (
  id BIGSERIAL PRIMARY KEY,
  wave_id VARCHAR(50) NOT NULL,
  task_id VARCHAR(50) NOT NULL,
  sequence INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  CONSTRAINT wave_pick_tasks_wave_fk FOREIGN KEY (wave_id) REFERENCES waves(wave_id) ON DELETE CASCADE,
  CONSTRAINT wave_pick_tasks_unique UNIQUE (wave_id, task_id)
);

-- Create zone_assignments table
CREATE TABLE IF NOT EXISTS zone_assignments (
  id BIGSERIAL PRIMARY KEY,
  picker_id VARCHAR(50) NOT NULL,
  zone_id VARCHAR(10) NOT NULL,
  assigned_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  assigned_by VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  completed_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT zone_assignments_status_check CHECK (status IN ('ACTIVE', 'ON_BREAK', 'COMPLETED'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_waves_status ON waves(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_waves_assigned_pickers ON waves USING GIN (assigned_pickers);
CREATE INDEX IF NOT EXISTS idx_waves_order_ids ON waves USING GIN (order_ids);
CREATE INDEX IF NOT EXISTS idx_wave_pick_tasks_wave ON wave_pick_tasks(wave_id);
CREATE INDEX IF NOT EXISTS idx_wave_pick_tasks_task ON wave_pick_tasks(task_id);
CREATE INDEX IF NOT EXISTS idx_zone_assignments_picker ON zone_assignments(picker_id, status);
CREATE INDEX IF NOT EXISTS idx_zone_assignments_zone ON zone_assignments(zone_id, status);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE waves IS 'Wave picking plans for batch order fulfillment';
COMMENT ON TABLE wave_pick_tasks IS 'Association between waves and individual pick tasks';
COMMENT ON TABLE zone_assignments IS 'Picker assignments to warehouse zones';

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Wave picking tables created successfully';
END $$;
