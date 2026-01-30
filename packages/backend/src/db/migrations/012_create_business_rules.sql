-- Business Rules Tables Migration
-- Creates tables for managing business rules, conditions, actions, and execution logs

-- Business rules table
CREATE TABLE IF NOT EXISTS business_rules (
  rule_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  rule_type VARCHAR(50) NOT NULL CHECK (rule_type IN ('ALLOCATION', 'PICKING', 'SHIPPING', 'INVENTORY', 'VALIDATION', 'NOTIFICATION')),
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT' CHECK (status IN ('ACTIVE', 'INACTIVE', 'DRAFT')),
  priority INTEGER DEFAULT 5 CHECK (priority BETWEEN 1 AND 10),
  start_date TIMESTAMP WITH TIME ZONE,
  end_date TIMESTAMP WITH TIME ZONE,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_by VARCHAR(50),
  version INTEGER DEFAULT 1,
  execution_count INTEGER DEFAULT 0,
  last_executed_at TIMESTAMP WITH TIME ZONE
);

-- Rule conditions table
CREATE TABLE IF NOT EXISTS rule_conditions (
  condition_id VARCHAR(50) PRIMARY KEY,
  rule_id VARCHAR(50) NOT NULL REFERENCES business_rules(rule_id) ON DELETE CASCADE,
  field_name VARCHAR(100) NOT NULL,
  operator VARCHAR(20) NOT NULL CHECK (operator IN ('EQUALS', 'NOT_EQUALS', 'GREATER_THAN', 'LESS_THAN', 'CONTAINS', 'STARTS_WITH', 'ENDS_WITH', 'IS_NULL', 'NOT_NULL', 'IN', 'NOT_IN')),
  value TEXT,
  condition_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rule actions table
CREATE TABLE IF NOT EXISTS rule_actions (
  action_id VARCHAR(50) PRIMARY KEY,
  rule_id VARCHAR(50) NOT NULL REFERENCES business_rules(rule_id) ON DELETE CASCADE,
  action_type VARCHAR(50) NOT NULL CHECK (action_type IN ('NOTIFY', 'SET_STATUS', 'ALTERNATE_LOCATION', 'BLOCK', 'ADJUST_QUANTITY', 'CREATE_EXCEPTION', 'CALCULATE_FIELD')),
  parameters JSONB NOT NULL,
  action_order INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Rule trigger events (junction table for many-to-many)
CREATE TABLE IF NOT EXISTS rule_trigger_events (
  rule_id VARCHAR(50) NOT NULL REFERENCES business_rules(rule_id) ON DELETE CASCADE,
  event_type VARCHAR(50) NOT NULL CHECK (event_type IN ('ORDER_CREATED', 'ORDER_UPDATED', 'ORDER_CANCELLED', 'ORDER_SHIPPED', 'ITEM_PICKED', 'EXCEPTION_REPORTED', 'INVENTORY_LOW', 'USER_LOGIN', 'CUSTOM')),
  PRIMARY KEY (rule_id, event_type)
);

-- Rule execution logs table
CREATE TABLE IF NOT EXISTS rule_execution_logs (
  log_id VARCHAR(50) PRIMARY KEY,
  rule_id VARCHAR(50) NOT NULL REFERENCES business_rules(rule_id) ON DELETE CASCADE,
  triggered_by VARCHAR(100),
  triggered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  entity_type VARCHAR(100),
  entity_id VARCHAR(100),
  should_execute BOOLEAN NOT NULL,
  conditions_met JSONB,
  execution_result JSONB,
  error_message TEXT,
  execution_duration_ms INTEGER
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_business_rules_status ON business_rules(status);
CREATE INDEX IF NOT EXISTS idx_business_rules_type ON business_rules(rule_type);
CREATE INDEX IF NOT EXISTS idx_business_rules_created_by ON business_rules(created_by);
CREATE INDEX IF NOT EXISTS idx_rule_conditions_rule_id ON rule_conditions(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_actions_rule_id ON rule_actions(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_rule_id ON rule_execution_logs(rule_id);
CREATE INDEX IF NOT EXISTS idx_rule_execution_logs_triggered_at ON rule_execution_logs(triggered_at);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_business_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER business_rules_updated_at
  BEFORE UPDATE ON business_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_business_rules_updated_at();
