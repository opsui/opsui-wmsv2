-- ============================================================================
-- Audit Logs Table Migration
--
-- Creates a comprehensive audit trail system for SOC2/ISO27001 compliance
-- Tracks all critical actions in the WMS
-- ============================================================================

-- Create audit_logs table
CREATE TABLE IF NOT EXISTS audit_logs (
  -- Primary key
  id BIGSERIAL PRIMARY KEY,

  -- Audit metadata
  audit_id VARCHAR(36) UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  occurred_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,

  -- Who performed the action
  user_id VARCHAR(50),
  user_email VARCHAR(255),
  user_role VARCHAR(50),
  session_id VARCHAR(255),

  -- What was done
  action_type VARCHAR(100) NOT NULL,
  action_category VARCHAR(50) NOT NULL, -- AUTH, INVENTORY, ORDER, USER, SYSTEM, etc.
  resource_type VARCHAR(100), -- Order, SKU, User, etc.
  resource_id VARCHAR(255),

  -- Details of the action
  action_description TEXT NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_fields TEXT[],

  -- Context
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR(50),
  correlation_id VARCHAR(50),

  -- Result
  status VARCHAR(20) NOT NULL DEFAULT 'SUCCESS', -- SUCCESS, FAILURE, PARTIAL
  error_code VARCHAR(50),
  error_message TEXT,

  -- Additional metadata
  metadata JSONB,

  -- Data retention (for automatic cleanup)
  retention_until TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '2 years'),

  -- Indexes
  CONSTRAINT audit_logs_audit_id_check CHECK (audit_id IS NOT NULL),
  CONSTRAINT audit_logs_action_type_check CHECK (action_type IS NOT NULL),
  CONSTRAINT audit_logs_status_check CHECK (status IN ('SUCCESS', 'FAILURE', 'PARTIAL'))
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Primary index for user queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id, occurred_at DESC);

-- Index for resource tracking
CREATE INDEX IF NOT EXISTS idx_audit_logs_resource ON audit_logs(resource_type, resource_id, occurred_at DESC);

-- Index for action type filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_action_type ON audit_logs(action_type, occurred_at DESC);

-- Index for category filtering
CREATE INDEX IF NOT EXISTS idx_audit_logs_category ON audit_logs(action_category, occurred_at DESC);

-- Index for time-based queries
CREATE INDEX IF NOT EXISTS idx_audit_logs_occurred_at ON audit_logs(occurred_at DESC);

-- Index for compliance queries (by date range)
CREATE INDEX IF NOT EXISTS idx_audit_logs_compliance ON audit_logs(action_category, status, occurred_at DESC);

-- Index for session tracking
CREATE INDEX IF NOT EXISTS idx_audit_logs_session ON audit_logs(session_id, occurred_at DESC);

-- Partial index for failures only
CREATE INDEX IF NOT EXISTS idx_audit_logs_failures ON audit_logs(user_id, occurred_at DESC)
  WHERE status = 'FAILURE';

-- GIN index for JSONB searches (old_values, new_values, metadata)
CREATE INDEX IF NOT EXISTS idx_audit_logs_values_gin ON audit_logs USING GIN (old_values);
CREATE INDEX IF NOT EXISTS idx_audit_logs_new_values_gin ON audit_logs USING GIN (new_values);
CREATE INDEX IF NOT EXISTS idx_audit_logs_metadata_gin ON audit_logs USING GIN (metadata);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE audit_logs IS 'Immutable audit trail for SOC2/ISO27001 compliance';
COMMENT ON COLUMN audit_logs.id IS 'Internal database primary key';
COMMENT ON COLUMN audit_logs.audit_id IS 'Public UUID for external references (immutable)';
COMMENT ON COLUMN audit_logs.occurred_at IS 'Timestamp when the action occurred';
COMMENT ON COLUMN audit_logs.user_id IS 'ID of the user who performed the action';
COMMENT ON COLUMN audit_logs.user_email IS 'Email of the user (for quick lookup)';
COMMENT ON COLUMN audit_logs.user_role IS 'Role of the user at time of action';
COMMENT ON COLUMN audit_logs.session_id IS 'Session identifier for tracking user sessions';
COMMENT ON COLUMN audit_logs.action_type IS 'Specific action performed (e.g., order.created, user.login)';
COMMENT ON COLUMN audit_logs.action_category IS 'High-level category (AUTH, INVENTORY, ORDER, USER, SYSTEM)';
COMMENT ON COLUMN audit_logs.resource_type IS 'Type of resource affected';
COMMENT ON COLUMN audit_logs.resource_id IS 'ID of the affected resource';
COMMENT ON COLUMN audit_logs.action_description IS 'Human-readable description of the action';
COMMENT ON COLUMN audit_logs.old_values IS 'Previous state of the resource (before change)';
COMMENT ON COLUMN audit_logs.new_values IS 'New state of the resource (after change)';
COMMENT ON COLUMN audit_logs.changed_fields IS 'List of fields that were modified';
COMMENT ON COLUMN audit_logs.ip_address IS 'IP address of the requester';
COMMENT ON COLUMN audit_logs.user_agent IS 'Browser/client user agent';
COMMENT ON COLUMN audit_logs.request_id IS 'Unique request identifier for tracing';
COMMENT ON COLUMN audit_logs.correlation_id IS 'Correlation ID for distributed tracing';
COMMENT ON COLUMN audit_logs.status IS 'Result of the action (SUCCESS, FAILURE, PARTIAL)';
COMMENT ON COLUMN audit_logs.error_code IS 'Error code if action failed';
COMMENT ON COLUMN audit_logs.error_message IS 'Error message if action failed';
COMMENT ON COLUMN audit_logs.metadata IS 'Additional context information';
COMMENT ON COLUMN audit_logs.retention_until IS 'Date until which this record must be retained';

-- ============================================================================
-- RETENTION POLICY FUNCTION
-- ============================================================================

-- Function to mark records for deletion after retention period
CREATE OR REPLACE FUNCTION audit_cleanup_old_records()
RETURNS void AS $$
BEGIN
  -- Mark records older than retention period as ready for archival
  UPDATE audit_logs
  SET retention_until = CURRENT_TIMESTAMP
  WHERE occurred_at < CURRENT_TIMESTAMP - INTERVAL '2 years'
    AND retention_until > CURRENT_TIMESTAMP;

  -- Delete records that have passed retention period
  DELETE FROM audit_logs
  WHERE retention_until < CURRENT_TIMESTAMP;

  RAISE NOTICE 'Old audit records cleaned up';
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- TRIGGERS FOR AUTOMATIC AUDITING
-- ============================================================================

-- Function to create audit log for orders table changes
CREATE OR REPLACE FUNCTION audit_order_changes()
RETURNS TRIGGER AS $$
DECLARE
  old_data JSONB;
  new_data JSONB;
  changed TEXT[];
BEGIN
  -- Convert row data to JSONB
  IF TG_OP = 'DELETE' THEN
    old_data := to_jsonb(OLD);
    new_data := NULL;
  ELSIF TG_OP = 'INSERT' THEN
    old_data := NULL;
    new_data := to_jsonb(NEW);
  ELSE
    old_data := to_jsonb(OLD);
    new_data := to_jsonb(NEW);
  END IF;

  -- Insert audit log
  INSERT INTO audit_logs (
    user_id,
    user_email,
    action_type,
    action_category,
    resource_type,
    resource_id,
    action_description,
    old_values,
    new_values,
    status
  ) VALUES (
    COALESCE(NEW.updated_by, OLD.updated_by, 'SYSTEM'),
    NULL, -- Would need to join with users table
    TG_OP || '_order',
    'ORDER',
    'Order',
    COALESCE(NEW.order_id, OLD.order_id),
    'Order ' || TG_OP || ' operation',
    old_data,
    new_data,
    'SUCCESS'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Triggers are commented out to avoid affecting performance
-- Enable them based on specific requirements

-- CREATE TRIGGER order_audit_trigger
-- AFTER INSERT OR UPDATE OR DELETE ON orders
-- FOR EACH ROW EXECUTE FUNCTION audit_order_changes();

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for compliance reporting
CREATE OR REPLACE VIEW audit_compliance_view AS
SELECT
  date_trunc('day', occurred_at) AS date,
  action_category,
  status,
  COUNT(*) AS action_count,
  COUNT(DISTINCT user_id) AS unique_users
FROM audit_logs
WHERE occurred_at >= CURRENT_TIMESTAMP - INTERVAL '90 days'
GROUP BY date_trunc('day', occurred_at), action_category, status
ORDER BY date DESC, action_category;

COMMENT ON VIEW audit_compliance_view IS 'Daily summary of audit logs for compliance reporting';

-- View for user activity
CREATE OR REPLACE VIEW audit_user_activity_view AS
SELECT
  user_id,
  user_email,
  user_role,
  date_trunc('day', occurred_at) AS date,
  COUNT(*) FILTER (WHERE status = 'SUCCESS') AS successful_actions,
  COUNT(*) FILTER (WHERE status = 'FAILURE') AS failed_actions,
  COUNT(*) AS total_actions
FROM audit_logs
WHERE occurred_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
  AND user_id IS NOT NULL
GROUP BY user_id, user_email, user_role, date_trunc('day', occurred_at)
ORDER BY date DESC, total_actions DESC;

COMMENT ON VIEW audit_user_activity_view IS 'Daily user activity summary for security analysis';

-- View for security events (failures, suspicious activity)
CREATE OR REPLACE VIEW audit_security_events_view AS
SELECT
  occurred_at,
  user_id,
  user_email,
  ip_address,
  action_type,
  action_category,
  status,
  error_code,
  error_message
FROM audit_logs
WHERE
  status = 'FAILURE'
  OR action_category = 'AUTH'
  OR action_type LIKE '%login%'
  OR action_type LIKE '%permission%'
  OR action_type LIKE '%unauthorized%'
ORDER BY occurred_at DESC;

COMMENT ON VIEW audit_security_events_view IS 'Security-relevant audit events for monitoring';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Read-only access for compliance auditors (create a separate role if needed)
-- GRANT SELECT ON audit_logs TO audit_reader;
-- GRANT SELECT ON audit_compliance_view TO audit_reader;
-- GRANT SELECT ON audit_user_activity_view TO audit_reader;
-- GRANT SELECT ON audit_security_events_view TO audit_reader;

-- Application role needs full access
-- GRANT SELECT, INSERT ON audit_logs TO wms_app_user;
-- GRANT USAGE, SELECT ON SEQUENCE audit_logs_id_seq TO wms_app_user;

-- ============================================================================
-- COMPLETION
-- ============================================================================

-- Log the migration
DO $$
BEGIN
  RAISE NOTICE 'Audit logs table created successfully';
  RAISE NOTICE 'Remember to run: SELECT audit_cleanup_old_records(); periodically';
END $$;
