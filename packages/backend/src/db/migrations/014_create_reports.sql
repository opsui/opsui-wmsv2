-- Reports Tables Migration
-- Creates tables for reports, dashboards, executions, schedules, and exports

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  report_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN ('INVENTORY', 'THROUGHPUT', 'PERFORMANCE', 'EXCEPTIONS', 'SHIPPING', 'FINANCIAL', 'CUSTOM')),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DRAFT')),
  fields JSONB NOT NULL DEFAULT '[]',
  filters JSONB NOT NULL DEFAULT '{}',
  groups JSONB NOT NULL DEFAULT '[]',
  chart_config JSONB,
  default_format VARCHAR(20) NOT NULL DEFAULT 'JSON' CHECK (default_format IN ('JSON', 'CSV', 'PDF', 'XLSX')),
  allow_export BOOLEAN DEFAULT TRUE,
  allow_schedule BOOLEAN DEFAULT TRUE,
  is_public BOOLEAN DEFAULT FALSE,
  tags JSONB DEFAULT '[]',
  category VARCHAR(100),
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Report Executions table
CREATE TABLE IF NOT EXISTS report_executions (
  execution_id VARCHAR(50) PRIMARY KEY,
  report_id VARCHAR(50) NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
  executed_by VARCHAR(50) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
  format VARCHAR(20) NOT NULL DEFAULT 'JSON',
  parameters JSONB DEFAULT '{}',
  result_data JSONB,
  result_count INTEGER,
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  duration_ms INTEGER
);

-- Report Schedules table
CREATE TABLE IF NOT EXISTS report_schedules (
  schedule_id VARCHAR(50) PRIMARY KEY,
  report_id VARCHAR(50) NOT NULL REFERENCES reports(report_id) ON DELETE CASCADE,
  name VARCHAR(255) NOT NULL,
  schedule_type VARCHAR(20) NOT NULL CHECK (schedule_type IN ('HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'CUSTOM')),
  schedule_config JSONB NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dashboards table
CREATE TABLE IF NOT EXISTS dashboards (
  dashboard_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  owner VARCHAR(50) NOT NULL,
  is_public BOOLEAN DEFAULT FALSE,
  layout_config JSONB NOT NULL DEFAULT '{}',
  widgets JSONB NOT NULL DEFAULT '[]',
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Export Jobs table
CREATE TABLE IF NOT EXISTS export_jobs (
  job_id VARCHAR(50) PRIMARY KEY,
  entity_type VARCHAR(50) NOT NULL,
  format VARCHAR(20) NOT NULL DEFAULT 'CSV',
  fields JSONB NOT NULL DEFAULT '[]',
  filters JSONB DEFAULT '{}',
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED')),
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  file_url VARCHAR(512),
  error_message TEXT,
  total_records INTEGER
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_reports_type ON reports(report_type);
CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status);
CREATE INDEX IF NOT EXISTS idx_reports_created_by ON reports(created_by);
CREATE INDEX IF NOT EXISTS idx_report_executions_report_id ON report_executions(report_id);
CREATE INDEX IF NOT EXISTS idx_report_executions_status ON report_executions(status);
CREATE INDEX IF NOT EXISTS idx_report_executions_executed_by ON report_executions(executed_by);
CREATE INDEX IF NOT EXISTS idx_report_schedules_report_id ON report_schedules(report_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_is_active ON report_schedules(is_active);
CREATE INDEX IF NOT EXISTS idx_dashboards_owner ON dashboards(owner);
CREATE INDEX IF NOT EXISTS idx_export_jobs_status ON export_jobs(status);
CREATE INDEX IF NOT EXISTS idx_export_jobs_created_by ON export_jobs(created_by);

-- Create updated_at trigger function (if not exists)
CREATE OR REPLACE FUNCTION update_reports_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers
DROP TRIGGER IF EXISTS reports_updated_at ON reports;
CREATE TRIGGER reports_updated_at
  BEFORE UPDATE ON reports
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

DROP TRIGGER IF EXISTS report_schedules_updated_at ON report_schedules;
CREATE TRIGGER report_schedules_updated_at
  BEFORE UPDATE ON report_schedules
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();

DROP TRIGGER IF EXISTS dashboards_updated_at ON dashboards;
CREATE TRIGGER dashboards_updated_at
  BEFORE UPDATE ON dashboards
  FOR EACH ROW
  EXECUTE FUNCTION update_reports_updated_at();
