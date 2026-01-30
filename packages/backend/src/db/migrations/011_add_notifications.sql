-- ============================================================================
-- Notifications System Migration
--
-- Creates a comprehensive multi-channel notification system
-- Supports email, SMS, push notifications, and in-app notifications
-- ============================================================================

-- ----------------------------------------------------------------------------
-- NOTIFICATIONS TABLE (In-app notification history)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  -- Primary key
  id BIGSERIAL PRIMARY KEY,

  -- Public identifier
  notification_id VARCHAR(36) UNIQUE NOT NULL DEFAULT gen_random_uuid(),

  -- Recipient
  user_id VARCHAR(50) NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,

  -- Notification type and channel
  type VARCHAR(50) NOT NULL,
  -- Types: ORDER_CLAIMED, ORDER_COMPLETED, PICK_UPDATED, INVENTORY_LOW,
  --       EXCEPTION_REPORTED, ZONE_ASSIGNED, WAVE_CREATED, SYSTEM_ALERT

  channel VARCHAR(20) NOT NULL,
  -- Channels: EMAIL, SMS, PUSH, IN_APP, BULK

  -- Content
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  data JSONB,

  -- Delivery status
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  -- PENDING, SENT, DELIVERED, FAILED, READ

  -- Delivery tracking
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,

  -- External provider IDs for tracking
  email_id VARCHAR(255),
  sms_id VARCHAR(255),
  push_message_id VARCHAR(255),

  -- Priority
  priority VARCHAR(20) DEFAULT 'NORMAL',
  -- LOW, NORMAL, HIGH, URGENT

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  scheduled_for TIMESTAMP WITH TIME ZONE,

  -- TTL for automatic cleanup (30 days default)
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT (CURRENT_TIMESTAMP + INTERVAL '30 days'),

  -- Constraints
  CONSTRAINT notifications_type_check CHECK (type IS NOT NULL),
  CONSTRAINT notifications_channel_check CHECK (channel IN ('EMAIL', 'SMS', 'PUSH', 'IN_APP', 'BULK')),
  CONSTRAINT notifications_status_check CHECK (status IN ('PENDING', 'SENT', 'DELIVERED', 'FAILED', 'READ')),
  CONSTRAINT notifications_priority_check CHECK (priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
);

-- ----------------------------------------------------------------------------
-- NOTIFICATION PREFERENCES TABLE (User delivery settings)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_preferences (
  id BIGSERIAL PRIMARY KEY,
  user_id VARCHAR(50) NOT NULL UNIQUE REFERENCES users(user_id) ON DELETE CASCADE,

  -- Channel enablement (global settings)
  email_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  push_enabled BOOLEAN DEFAULT true,
  in_app_enabled BOOLEAN DEFAULT true,

  -- Quiet hours (no notifications during this time)
  quiet_hours_enabled BOOLEAN DEFAULT false,
  quiet_hours_start TIME,
  quiet_hours_end TIME,
  quiet_hours_timezone VARCHAR(50) DEFAULT 'UTC',

  -- Notification type preferences (can override global settings)
  -- JSON structure: { "ORDER_CLAIMED": { "email": true, "sms": false, "push": true }, ... }
  type_preferences JSONB DEFAULT '{}',

  -- Phone for SMS
  sms_phone VARCHAR(20),

  -- Push notification subscription info
  push_subscription JSONB,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- ----------------------------------------------------------------------------
-- NOTIFICATION TEMPLATES TABLE (Reusable message templates)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_templates (
  id BIGSERIAL PRIMARY KEY,
  template_id VARCHAR(36) UNIQUE NOT NULL DEFAULT gen_random_uuid(),

  -- Template identification
  name VARCHAR(100) NOT NULL UNIQUE,
  type VARCHAR(50) NOT NULL,
  description TEXT,

  -- Template content (supports variables like {{order_id}}, {{sku}}, etc.)
  subject_template TEXT,
  body_template TEXT NOT NULL,

  -- Channels this template supports
  supported_channels VARCHAR(20)[] NOT NULL DEFAULT ARRAY['IN_APP'],

  -- Priority for this template type
  default_priority VARCHAR(20) DEFAULT 'NORMAL',

  -- Metadata
  variables JSONB DEFAULT '{}',
  -- Lists available variables: { "order_id": "string", "quantity": "number" }

  -- Status
  is_active BOOLEAN DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_by VARCHAR(50),

  CONSTRAINT notification_templates_name_unique UNIQUE (name),
  CONSTRAINT notification_templates_priority_check CHECK (default_priority IN ('LOW', 'NORMAL', 'HIGH', 'URGENT'))
);

-- ----------------------------------------------------------------------------
-- NOTIFICATION QUEUE TABLE (Background job processing)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notification_queue (
  id BIGSERIAL PRIMARY KEY,
  queue_id VARCHAR(36) UNIQUE NOT NULL DEFAULT gen_random_uuid(),

  -- Job reference
  notification_id VARCHAR(36) REFERENCES notifications(notification_id) ON DELETE SET NULL,

  -- Job details
  job_type VARCHAR(50) NOT NULL,
  -- Types: EMAIL_SEND, SMS_SEND, PUSH_SEND, BULK_SEND

  -- Payload
  payload JSONB NOT NULL,

  -- Job status
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  -- PENDING, PROCESSING, COMPLETED, FAILED, RETRYING

  -- Retry logic
  attempts INTEGER DEFAULT 0,
  max_attempts INTEGER DEFAULT 3,
  next_retry_at TIMESTAMP WITH TIME ZONE,

  -- Priority queue processing
  priority INTEGER DEFAULT 5,
  -- 1 = highest, 10 = lowest

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  failed_at TIMESTAMP WITH TIME ZONE,

  -- Error tracking
  error_message TEXT,
  last_error_at TIMESTAMP WITH TIME ZONE,

  CONSTRAINT notification_queue_status_check CHECK (status IN ('PENDING', 'PROCESSING', 'COMPLETED', 'FAILED', 'RETRYING')),
  CONSTRAINT notification_queue_priority_range CHECK (priority BETWEEN 1 AND 10)
);

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Notifications indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_status ON notifications(status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_channel ON notifications(channel, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread ON notifications(user_id, status)
  WHERE status IN ('PENDING', 'SENT', 'DELIVERED');
CREATE INDEX IF NOT EXISTS idx_notifications_priority ON notifications(priority, created_at DESC)
  WHERE priority IN ('HIGH', 'URGENT');
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(scheduled_for, status)
  WHERE status = 'PENDING' AND scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_notifications_expires_at ON notifications(expires_at);

-- Notification preferences indexes
CREATE INDEX IF NOT EXISTS idx_notification_preferences_user_id ON notification_preferences(user_id);

-- Notification templates indexes
CREATE INDEX IF NOT EXISTS idx_notification_templates_type ON notification_templates(type);
CREATE INDEX IF NOT EXISTS idx_notification_templates_active ON notification_templates(is_active, type);

-- Notification queue indexes
CREATE INDEX IF NOT EXISTS idx_notification_queue_status ON notification_queue(status, priority, next_retry_at);
CREATE INDEX IF NOT EXISTS idx_notification_queue_retry ON notification_queue(next_retry_at, status)
  WHERE status IN ('PENDING', 'RETRYING');
CREATE INDEX IF NOT EXISTS idx_notification_queue_notification_id ON notification_queue(notification_id);

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE notifications IS 'In-app and external notification history';
COMMENT ON COLUMN notifications.user_id IS 'Recipient user ID';
COMMENT ON COLUMN notifications.type IS 'Notification type (ORDER_CLAIMED, INVENTORY_LOW, etc.)';
COMMENT ON COLUMN notifications.channel IS 'Delivery channel (EMAIL, SMS, PUSH, IN_APP)';
COMMENT ON COLUMN notifications.status IS 'Delivery status (PENDING, SENT, DELIVERED, FAILED, READ)';
COMMENT ON COLUMN notifications.priority IS 'Notification priority for queue processing';
COMMENT ON COLUMN notifications.expires_at IS 'TTL for automatic cleanup';

COMMENT ON TABLE notification_preferences IS 'User notification delivery preferences';
COMMENT ON COLUMN notification_preferences.quiet_hours_enabled IS 'Enable quiet hours (no notifications during set times)';
COMMENT ON COLUMN notification_preferences.type_preferences IS 'Per-type channel preferences as JSONB';

COMMENT ON TABLE notification_templates IS 'Reusable notification message templates';
COMMENT ON COLUMN notification_templates.supported_channels IS 'Array of channels this template can use';
COMMENT ON COLUMN notification_templates.variables IS 'Available template variables with types';

COMMENT ON TABLE notification_queue IS 'Background job queue for notification processing';
COMMENT ON COLUMN notification_queue.priority IS 'Job priority (1=highest, 10=lowest)';

-- ============================================================================
-- FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp for notifications
CREATE OR REPLACE FUNCTION update_notifications_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notifications table
DROP TRIGGER IF EXISTS trigger_update_notifications_updated_at ON notifications;
CREATE TRIGGER trigger_update_notifications_updated_at
  BEFORE UPDATE ON notifications
  FOR EACH ROW
  EXECUTE FUNCTION update_notifications_updated_at();

-- Function to update updated_at timestamp for notification_preferences
CREATE OR REPLACE FUNCTION update_notification_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notification_preferences table
DROP TRIGGER IF EXISTS trigger_update_notification_preferences_updated_at ON notification_preferences;
CREATE TRIGGER trigger_update_notification_preferences_updated_at
  BEFORE UPDATE ON notification_preferences
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_preferences_updated_at();

-- Function to update updated_at timestamp for notification_templates
CREATE OR REPLACE FUNCTION update_notification_templates_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger for notification_templates table
DROP TRIGGER IF EXISTS trigger_update_notification_templates_updated_at ON notification_templates;
CREATE TRIGGER trigger_update_notification_templates_updated_at
  BEFORE UPDATE ON notification_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_notification_templates_updated_at();

-- Function to clean up expired notifications
CREATE OR REPLACE FUNCTION cleanup_expired_notifications()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  DELETE FROM notifications
  WHERE expires_at < CURRENT_TIMESTAMP;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  RAISE NOTICE 'Cleaned up % expired notifications', deleted_count;
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Function to get unread notification count for a user
CREATE OR REPLACE FUNCTION get_unread_notification_count(p_user_id VARCHAR(50))
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT COUNT(*)
    FROM notifications
    WHERE user_id = p_user_id
      AND status IN ('PENDING', 'SENT', 'DELIVERED')
  );
END;
$$ LANGUAGE plpgsql;

-- Function to mark all notifications as read for a user
CREATE OR REPLACE FUNCTION mark_all_notifications_read(p_user_id VARCHAR(50))
RETURNS INTEGER AS $$
DECLARE
  updated_count INTEGER;
BEGIN
  UPDATE notifications
  SET status = 'READ',
      read_at = CURRENT_TIMESTAMP,
      updated_at = CURRENT_TIMESTAMP
  WHERE user_id = p_user_id
    AND status IN ('PENDING', 'SENT', 'DELIVERED');

  GET DIAGNOSTICS updated_count = ROW_COUNT;
  RETURN updated_count;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View for active notifications (not expired)
CREATE OR REPLACE VIEW active_notifications_view AS
SELECT
  notification_id,
  user_id,
  type,
  channel,
  title,
  message,
  status,
  priority,
  created_at,
  read_at
FROM notifications
WHERE expires_at > CURRENT_TIMESTAMP
ORDER BY created_at DESC;

COMMENT ON VIEW active_notifications_view IS 'Active notifications for users (not expired)';

-- View for notification queue processing
CREATE OR REPLACE VIEW notification_queue_pending_view AS
SELECT
  queue_id,
  notification_id,
  job_type,
  status,
  priority,
  attempts,
  max_attempts,
  next_retry_at,
  created_at
FROM notification_queue
WHERE status IN ('PENDING', 'RETRYING')
  AND (next_retry_at IS NULL OR next_retry_at <= CURRENT_TIMESTAMP)
ORDER BY priority ASC, created_at ASC;

COMMENT ON VIEW notification_queue_pending_view IS 'Jobs ready for processing from the notification queue';

-- View for notification statistics
CREATE OR REPLACE VIEW notification_stats_view AS
SELECT
  date_trunc('day', created_at) AS date,
  type,
  channel,
  status,
  COUNT(*) AS count
FROM notifications
WHERE created_at >= CURRENT_TIMESTAMP - INTERVAL '30 days'
GROUP BY date_trunc('day', created_at), type, channel, status
ORDER BY date DESC, count DESC;

COMMENT ON VIEW notification_stats_view IS 'Daily notification statistics for monitoring';

-- ============================================================================
-- SEED DATA
-- ============================================================================

-- Insert default notification templates
INSERT INTO notification_templates (name, type, subject_template, body_template, supported_channels, default_priority, variables) VALUES
  (
    'order_claimed',
    'ORDER_CLAIMED',
    'Order {{order_id}} Claimed',
    'Order {{order_id}} has been claimed by {{picker_name}} for picking.',
    ARRAY['IN_APP', 'PUSH'],
    'NORMAL',
    '{"order_id": "string", "picker_name": "string"}'::jsonb
  ),
  (
    'order_completed',
    'ORDER_COMPLETED',
    'Order {{order_id}} Completed',
    'Order {{order_id}} has been completed and is ready for packing.',
    ARRAY['IN_APP', 'PUSH', 'EMAIL'],
    'NORMAL',
    '{"order_id": "string", "item_count": "number"}'::jsonb
  ),
  (
    'pick_updated',
    'PICK_UPDATED',
    'Pick Updated for Order {{order_id}}',
    'Item {{sku}} picked: {{quantity}}/{{required_quantity}}',
    ARRAY['IN_APP'],
    'NORMAL',
    '{"order_id": "string", "sku": "string", "quantity": "number", "required_quantity": "number"}'::jsonb
  ),
  (
    'inventory_low',
    'INVENTORY_LOW',
    'Low Stock Alert: {{sku}}',
    'SKU {{sku}} is running low. Current quantity: {{current_quantity}}',
    ARRAY['IN_APP', 'EMAIL', 'PUSH'],
    'HIGH',
    '{"sku": "string", "current_quantity": "number", "threshold": "number"}'::jsonb
  ),
  (
    'exception_report',
    'EXCEPTION_REPORTED',
    'Exception Reported for Order {{order_id}}',
    'Exception reported: {{exception_type}} - {{reason}}',
    ARRAY['IN_APP', 'EMAIL'],
    'HIGH',
    '{"order_id": "string", "exception_type": "string", "reason": "string"}'::jsonb
  ),
  (
    'zone_assigned',
    'ZONE_ASSIGNED',
    'Zone {{zone_id}} Assigned',
    'You have been assigned to zone {{zone_id}} with {{task_count}} pending tasks.',
    ARRAY['IN_APP', 'PUSH'],
    'NORMAL',
    '{"zone_id": "string", "task_count": "number"}'::jsonb
  ),
  (
    'wave_created',
    'WAVE_CREATED',
    'Wave {{wave_id}} Created',
    'Wave {{wave_id}} has been created with {{order_count}} orders.',
    ARRAY['IN_APP', 'EMAIL'],
    'NORMAL',
    '{"wave_id": "string", "order_count": "number"}'::jsonb
  ),
  (
    'system_alert',
    'SYSTEM_ALERT',
    'System Alert: {{alert_type}}',
    '{{message}}',
    ARRAY['IN_APP', 'EMAIL', 'SMS'],
    'URGENT',
    '{"alert_type": "string", "message": "string"}'::jsonb
  )
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- COMPLETION
-- ============================================================================

DO $$
BEGIN
  RAISE NOTICE 'Notifications system migration completed successfully';
  RAISE NOTICE 'Created tables: notifications, notification_preferences, notification_templates, notification_queue';
  RAISE NOTICE 'Remember to run: SELECT cleanup_expired_notifications(); periodically';
END $$;
