-- ============================================================================
-- INTEGRATIONS MODULE
-- Handles external integrations (ERP, e-commerce, carriers)
-- ============================================================================

-- Integrations table
CREATE TABLE IF NOT EXISTS integrations (
  integration_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  type VARCHAR(50) NOT NULL CHECK (type IN ('ERP', 'ECOMMERCE', 'CARRIER', 'MARKETPLACE', 'ACCOUNTING', 'CUSTOM')),
  provider VARCHAR(100) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'INACTIVE', 'PENDING', 'ERROR')),
  configuration JSONB NOT NULL DEFAULT '{}',
  sync_settings JSONB,
  webhook_settings JSONB,
  enabled BOOLEAN DEFAULT TRUE,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(50),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status VARCHAR(50),
  last_error TEXT
);

-- Carrier Accounts table
CREATE TABLE IF NOT EXISTS carrier_accounts (
  carrier_account_id VARCHAR(50) PRIMARY KEY,
  integration_id VARCHAR(50) REFERENCES integrations(integration_id) ON DELETE SET NULL,
  carrier VARCHAR(100) NOT NULL,
  account_number VARCHAR(255) NOT NULL,
  account_name VARCHAR(255),
  is_active BOOLEAN DEFAULT TRUE,
  services JSONB DEFAULT '[]',
  configured_services JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Sync Jobs table
CREATE TABLE IF NOT EXISTS sync_jobs (
  job_id VARCHAR(50) PRIMARY KEY,
  integration_id VARCHAR(50) NOT NULL REFERENCES integrations(integration_id) ON DELETE CASCADE,
  sync_type VARCHAR(50) NOT NULL CHECK (sync_type IN ('FULL_SYNC', 'INCREMENTAL_SYNC', 'PRODUCT_SYNC', 'ORDER_SYNC', 'INVENTORY_SYNC', 'SHIPMENT_SYNC')),
  direction VARCHAR(20) NOT NULL CHECK (direction IN ('INBOUND', 'OUTBOUND', 'BIDIRECTIONAL')),
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'RUNNING', 'COMPLETED', 'FAILED', 'CANCELLED')),
  started_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  completed_at TIMESTAMP WITH TIME ZONE,
  started_by VARCHAR(50),
  records_processed INTEGER DEFAULT 0,
  records_succeeded INTEGER DEFAULT 0,
  records_failed INTEGER DEFAULT 0,
  error_message TEXT
);

-- Sync Job Logs table
CREATE TABLE IF NOT EXISTS sync_job_logs (
  log_id VARCHAR(50) PRIMARY KEY,
  job_id VARCHAR(50) NOT NULL REFERENCES sync_jobs(job_id) ON DELETE CASCADE,
  level VARCHAR(20) NOT NULL CHECK (level IN ('INFO', 'WARNING', 'ERROR', 'DEBUG')),
  message TEXT NOT NULL,
  details JSONB,
  entity_type VARCHAR(100),
  entity_id VARCHAR(100),
  external_id VARCHAR(100),
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Webhook Events table
CREATE TABLE IF NOT EXISTS webhook_events (
  event_id VARCHAR(50) PRIMARY KEY,
  integration_id VARCHAR(50) NOT NULL REFERENCES integrations(integration_id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_CANCELLED', 'SHIPMENT_CREATED', 'SHIPMENT_DELIVERED', 'INVENTORY_UPDATED', 'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'CUSTOM')),
  payload JSONB NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'PROCESSING', 'PROCESSED', 'FAILED')),
  received_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processed_at TIMESTAMP WITH TIME ZONE,
  processing_attempts INTEGER DEFAULT 0,
  error_message TEXT
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_integrations_type ON integrations(type);
CREATE INDEX IF NOT EXISTS idx_integrations_provider ON integrations(provider);
CREATE INDEX IF NOT EXISTS idx_integrations_status ON integrations(status);
CREATE INDEX IF NOT EXISTS idx_carrier_accounts_integration_id ON carrier_accounts(integration_id);
CREATE INDEX IF NOT EXISTS idx_carrier_accounts_carrier ON carrier_accounts(carrier);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_integration_id ON sync_jobs(integration_id);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_status ON sync_jobs(status);
CREATE INDEX IF NOT EXISTS idx_sync_jobs_started_at ON sync_jobs(started_at);
CREATE INDEX IF NOT EXISTS idx_sync_job_logs_job_id ON sync_job_logs(job_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_integration_id ON webhook_events(integration_id);
CREATE INDEX IF NOT EXISTS idx_webhook_events_status ON webhook_events(status);
CREATE INDEX IF NOT EXISTS idx_webhook_events_received_at ON webhook_events(received_at);

-- Create updated_at trigger for integrations
DROP TRIGGER IF EXISTS integrations_updated_at ON integrations;
CREATE TRIGGER integrations_updated_at
  BEFORE UPDATE ON integrations
  FOR EACH ROW
  EXECUTE FUNCTION update_business_rules_updated_at();
