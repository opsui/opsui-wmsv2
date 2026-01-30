-- ============================================================================
-- PHASE 3: ADVANCED FEATURES - DATABASE MIGRATION
-- Creates tables for Business Rules Engine, Advanced Reporting, and Integrations
-- ============================================================================

-- ============================================================================
-- BUSINESS RULES ENGINE TABLES
-- ============================================================================

-- Main business rules table
CREATE TABLE IF NOT EXISTS business_rules (
  rule_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('ALLOCATION', 'PICKING', 'SHIPPING', 'INVENTORY', 'PRICING', 'VALIDATION', 'NOTIFICATION')),
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'INACTIVE', 'ARCHIVED')),
  priority INTEGER NOT NULL DEFAULT 0,
  start_date TIMESTAMP,
  end_date TIMESTAMP,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255),
  updated_at TIMESTAMP,
  version INTEGER NOT NULL DEFAULT 1,
  last_executed_at TIMESTAMP,
  execution_count INTEGER NOT NULL DEFAULT 0
);

-- Index for finding active rules by type and priority
CREATE INDEX idx_business_rules_active ON business_rules(rule_type, priority DESC)
WHERE status = 'ACTIVE';

-- Rule trigger events (many-to-many relationship)
CREATE TABLE IF NOT EXISTS rule_trigger_events (
  rule_id VARCHAR(255) NOT NULL REFERENCES business_rules(rule_id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN (
    'ORDER_CREATED', 'ORDER_UPDATED', 'INVENTORY_ADDED', 'INVENTORY_REMOVED',
    'LOCATION_CAPACITY_CHANGED', 'USER_ASSIGNED', 'SHIPMENT_CREATED', 'PICK_TASK_COMPLETED'
  )),
  PRIMARY KEY (rule_id, event_type)
);

-- Rule conditions
CREATE TABLE IF NOT EXISTS rule_conditions (
  condition_id VARCHAR(255) PRIMARY KEY,
  rule_id VARCHAR(255) NOT NULL REFERENCES business_rules(rule_id) ON DELETE CASCADE,
  field VARCHAR(255) NOT NULL,
  operator VARCHAR(50) NOT NULL CHECK (operator IN (
    'EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN',
    'GREATER_THAN_OR_EQUAL', 'LESS_THAN_OR_EQUAL', 'CONTAINS', 'NOT_CONTAINS',
    'STARTS_WITH', 'ENDS_WITH', 'IN', 'NOT_IN', 'BETWEEN',
    'IS_NULL', 'IS_NOT_NULL', 'MATCHES_REGEX'
  )),
  value JSONB NOT NULL,
  value2 JSONB,
  logical_operator VARCHAR(10) CHECK (logical_operator IN ('AND', 'OR')),
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_rule_conditions_rule ON rule_conditions(rule_id, "order");

-- Rule actions
CREATE TABLE IF NOT EXISTS rule_actions (
  action_id VARCHAR(255) PRIMARY KEY,
  rule_id VARCHAR(255) NOT NULL REFERENCES business_rules(rule_id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN (
    'SET_PRIORITY', 'ALLOCATE_LOCATION', 'ASSIGN_USER', 'SEND_NOTIFICATION',
    'CALCULATE_FIELD', 'BLOCK_ACTION', 'REQUIRE_APPROVAL', 'UPDATE_INVENTORY',
    'CREATE_TASK', 'MODIFY_FIELD'
  )),
  parameters JSONB NOT NULL DEFAULT '{}',
  "order" INTEGER NOT NULL DEFAULT 0
);

CREATE INDEX idx_rule_actions_rule ON rule_actions(rule_id, "order");

-- Rule execution logs
CREATE TABLE IF NOT EXISTS rule_execution_logs (
  log_id VARCHAR(255) PRIMARY KEY,
  rule_id VARCHAR(255) NOT NULL REFERENCES business_rules(rule_id),
  event_type VARCHAR(50) NOT NULL,
  entity_id VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  triggered_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  triggered_by VARCHAR(255) NOT NULL,
  conditions_met BOOLEAN NOT NULL,
  execution_time_ms INTEGER NOT NULL,
  error_message TEXT,
  execution_results JSONB NOT NULL DEFAULT '[]'
);

CREATE INDEX idx_rule_execution_logs_rule ON rule_execution_logs(rule_id, triggered_at DESC);
CREATE INDEX idx_rule_execution_logs_entity ON rule_execution_logs(entity_type, entity_id);

-- ============================================================================
-- ADVANCED REPORTING TABLES
-- ============================================================================

-- Reports definition
CREATE TABLE IF NOT EXISTS reports (
  report_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  report_type VARCHAR(50) NOT NULL CHECK (report_type IN (
    'INVENTORY', 'ORDERS', 'SHIPPING', 'RECEIVING', 'PICKING_PERFORMANCE',
    'PACKING_PERFORMANCE', 'CYCLE_COUNTS', 'LOCATION_UTILIZATION',
    'USER_PERFORMANCE', 'CUSTOM'
  )),
  status VARCHAR(50) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255),
  updated_at TIMESTAMP,
  fields JSONB NOT NULL DEFAULT '[]',
  filters JSONB NOT NULL DEFAULT '[]',
  groups JSONB NOT NULL DEFAULT '[]',
  chart_config JSONB NOT NULL DEFAULT '{"enabled": false}',
  default_format VARCHAR(20) NOT NULL DEFAULT 'PDF' CHECK (default_format IN ('PDF', 'EXCEL', 'CSV', 'HTML', 'JSON')),
  allow_export BOOLEAN NOT NULL DEFAULT true,
  allow_schedule BOOLEAN NOT NULL DEFAULT true,
  is_public BOOLEAN NOT NULL DEFAULT false,
  tags VARCHAR(500)[],
  category VARCHAR(100)
);

CREATE INDEX idx_reports_type ON reports(report_type);
CREATE INDEX idx_reports_public ON reports(is_public) WHERE is_public = true;

-- Report executions
CREATE TABLE IF NOT EXISTS report_executions (
  execution_id VARCHAR(255) PRIMARY KEY,
  report_id VARCHAR(255) NOT NULL REFERENCES reports(report_id),
  executed_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  executed_by VARCHAR(255) NOT NULL,
  status VARCHAR(50) NOT NULL CHECK (status IN ('DRAFT', 'SCHEDULED', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  format VARCHAR(20) NOT NULL CHECK (format IN ('PDF', 'EXCEL', 'CSV', 'HTML', 'JSON')),
  parameters JSONB NOT NULL DEFAULT '{}',
  file_url TEXT,
  file_size_bytes BIGINT,
  row_count INTEGER,
  execution_time_ms INTEGER,
  error_message TEXT
);

CREATE INDEX idx_report_executions_report ON report_executions(report_id, executed_at DESC);

-- Report schedules
CREATE TABLE IF NOT EXISTS report_schedules (
  schedule_id VARCHAR(255) PRIMARY KEY,
  report_id VARCHAR(255) NOT NULL REFERENCES reports(report_id),
  name VARCHAR(255) NOT NULL,
  enabled BOOLEAN NOT NULL DEFAULT true,
  frequency VARCHAR(50) NOT NULL CHECK (frequency IN (
    'ON_DEMAND', 'HOURLY', 'DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'
  )),
  schedule_config JSONB NOT NULL DEFAULT '{}',
  recipients VARCHAR(255)[] NOT NULL DEFAULT '{}',
  format VARCHAR(20) NOT NULL CHECK (format IN ('PDF', 'EXCEL', 'CSV', 'HTML', 'JSON')),
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255),
  updated_at TIMESTAMP,
  next_run_at TIMESTAMP,
  last_run_at TIMESTAMP
);

CREATE INDEX idx_report_schedules_enabled ON report_schedules(enabled, next_run_at) WHERE enabled = true;

-- Dashboards
CREATE TABLE IF NOT EXISTS dashboards (
  dashboard_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  layout JSONB NOT NULL DEFAULT '{"columns": 3, "rows": 3}',
  widgets JSONB NOT NULL DEFAULT '[]',
  owner VARCHAR(255) NOT NULL,
  is_public BOOLEAN NOT NULL DEFAULT false,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255),
  updated_at TIMESTAMP
);

-- Report templates (predefined)
CREATE TABLE IF NOT EXISTS report_templates (
  template_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category VARCHAR(100) NOT NULL,
  report_type VARCHAR(50) NOT NULL,
  thumbnail TEXT,
  fields JSONB NOT NULL DEFAULT '[]',
  filters JSONB NOT NULL DEFAULT '[]',
  groups JSONB NOT NULL DEFAULT '[]',
  chart_config JSONB NOT NULL DEFAULT '{"enabled": false}',
  is_system_template BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Export jobs
CREATE TABLE IF NOT EXISTS export_jobs (
  job_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  entity_type VARCHAR(100) NOT NULL,
  format VARCHAR(20) NOT NULL CHECK (format IN ('PDF', 'EXCEL', 'CSV', 'HTML', 'JSON')),
  filters JSONB NOT NULL DEFAULT '[]',
  fields VARCHAR(255)[] NOT NULL DEFAULT '{}',
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  file_url TEXT,
  file_size_bytes BIGINT,
  record_count INTEGER,
  error_message TEXT
);

CREATE INDEX idx_export_jobs_status ON export_jobs(status, created_at DESC);

-- ============================================================================
-- INTEGRATIONS TABLES
-- ============================================================================

-- Integrations
CREATE TABLE IF NOT EXISTS integrations (
  integration_id VARCHAR(255) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('ERP', 'ECOMMERCE', 'CARRIER', 'PAYMENT', 'WAREHOUSE', 'CUSTOM')),
  provider VARCHAR(100) NOT NULL CHECK (provider IN (
    'SAP', 'ORACLE', 'NETSUITE', 'MICROSOFT_DYNAMICS', 'QUICKBOOKS', 'XERO',
    'SHOPIFY', 'WOOCOMMERCE', 'MAGENTO', 'BIGCOMMERCE', 'SALESFORCE_COMMERCE', 'AMAZON', 'EBAY',
    'FEDEX', 'UPS', 'DHL', 'USPS', 'ONTRAC',
    'STRIPE', 'PAYPAL', 'SQUARE',
    'CUSTOM'
  )),
  status VARCHAR(50) NOT NULL DEFAULT 'DISCONNECTED' CHECK (status IN ('DISCONNECTED', 'CONNECTING', 'CONNECTED', 'ERROR', 'PAUSED')),
  configuration JSONB NOT NULL DEFAULT '{}',
  sync_settings JSONB NOT NULL DEFAULT '{}',
  webhook_settings JSONB,
  enabled BOOLEAN NOT NULL DEFAULT true,
  created_by VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_by VARCHAR(255),
  updated_at TIMESTAMP,
  last_sync_at TIMESTAMP,
  last_error TEXT
);

CREATE INDEX idx_integrations_type ON integrations(type, status);
CREATE INDEX idx_integrations_provider ON integrations(provider, status);

-- Sync jobs
CREATE TABLE IF NOT EXISTS sync_jobs (
  job_id VARCHAR(255) PRIMARY KEY,
  integration_id VARCHAR(255) NOT NULL REFERENCES integrations(integration_id),
  sync_type VARCHAR(20) NOT NULL CHECK (sync_type IN ('FULL', 'INCREMENTAL')),
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL')),
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED', 'PARTIAL')),
  started_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  started_by VARCHAR(255) NOT NULL,
  records_processed INTEGER NOT NULL DEFAULT 0,
  records_succeeded INTEGER NOT NULL DEFAULT 0,
  records_failed INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE INDEX idx_sync_jobs_integration ON sync_jobs(integration_id, started_at DESC);
CREATE INDEX idx_sync_jobs_status ON sync_jobs(status, started_at DESC);

-- Sync job logs
CREATE TABLE IF NOT EXISTS sync_job_logs (
  log_id VARCHAR(255) PRIMARY KEY,
  job_id VARCHAR(255) NOT NULL REFERENCES sync_jobs(job_id) ON DELETE CASCADE,
  timestamp TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  level VARCHAR(20) NOT NULL CHECK (level IN ('INFO', 'WARN', 'ERROR', 'DEBUG')),
  message TEXT NOT NULL,
  entity_type VARCHAR(100),
  entity_id VARCHAR(255),
  external_id VARCHAR(255),
  error_details JSONB
);

CREATE INDEX idx_sync_job_logs_job ON sync_job_logs(job_id, timestamp DESC);

-- Webhook events
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id VARCHAR(255) PRIMARY KEY,
  integration_id VARCHAR(255) NOT NULL REFERENCES integrations(integration_id),
  event_type VARCHAR(100) NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  processed_at TIMESTAMP,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSED', 'FAILED')),
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  error_message TEXT
);

CREATE INDEX idx_webhook_events_integration ON webhook_events(integration_id, received_at DESC);
CREATE INDEX idx_webhook_events_status ON webhook_events(status, received_at DESC) WHERE status != 'PROCESSED';

-- Carrier accounts
CREATE TABLE IF NOT EXISTS carrier_accounts (
  account_id VARCHAR(255) PRIMARY KEY,
  carrier VARCHAR(50) NOT NULL CHECK (carrier IN ('FEDEX', 'UPS', 'DHL', 'USPS', 'ONTRAC')),
  account_number VARCHAR(255) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  services JSONB NOT NULL DEFAULT '[]',
  configured_services VARCHAR(100)[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE business_rules IS 'Configurable business rules for automated decision making';
COMMENT ON TABLE rule_conditions IS 'Conditions that must be met for a rule to execute';
COMMENT ON TABLE rule_actions IS 'Actions to execute when rule conditions are met';
COMMENT ON TABLE rule_execution_logs IS 'Audit log of rule executions for debugging';

COMMENT ON TABLE reports IS 'Custom report definitions';
COMMENT ON TABLE report_executions IS 'History of report generation runs';
COMMENT ON TABLE report_schedules IS 'Scheduled report configurations';

COMMENT ON TABLE integrations IS 'External system integrations (ERP, E-commerce, Carriers)';
COMMENT ON TABLE sync_jobs IS 'Data synchronization job history';
COMMENT ON TABLE webhook_events IS 'Incoming webhook events from external systems';
COMMENT ON TABLE carrier_accounts IS 'Configured carrier shipping accounts';
