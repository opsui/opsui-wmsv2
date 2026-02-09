-- ============================================================================
-- ADD ORDER STATE CHANGES TABLE
-- ============================================================================
-- This migration creates the order_state_changes table that was defined in
-- schema.sql but missing from migrations. This table is used by the
-- log_order_state_change() trigger to track order status transitions.

-- Create the table
CREATE TABLE IF NOT EXISTS order_state_changes (
  change_id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(30) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  from_status order_status NOT NULL,
  to_status order_status NOT NULL,
  user_id VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_order_state_changes_order_id ON order_state_changes(order_id);
CREATE INDEX IF NOT EXISTS idx_order_state_changes_timestamp ON order_state_changes(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_order_state_changes_order ON order_state_changes(order_id, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_order_state_changes_from_to ON order_state_changes(from_status, to_status, timestamp DESC);

-- Ensure the trigger function exists
CREATE OR REPLACE FUNCTION log_order_state_change()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO order_state_changes (change_id, order_id, from_status, to_status, user_id)
    VALUES (
      generate_state_change_id(),
      NEW.order_id,
      OLD.status,
      NEW.status,
      current_setting('app.current_user_id', true)
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Ensure the trigger exists and is attached to orders table
DROP TRIGGER IF EXISTS trigger_log_order_state_change ON orders;
CREATE TRIGGER trigger_log_order_state_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  WHEN (OLD.status IS DISTINCT FROM NEW.status)
  EXECUTE FUNCTION log_order_state_change();
