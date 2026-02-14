-- ============================================================================
-- WMS Database Schema
-- ============================================================================
-- PostgreSQL 15+
-- This schema implements the canonical domain model defined in the spec
-- ============================================================================

-- Enable UUID extension for generating unique IDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- ENUMS
-- ============================================================================

CREATE TYPE order_status AS ENUM (
  'PENDING',
  'PICKING',
  'PICKED',
  'PACKING',
  'PACKED',
  'SHIPPED',
  'CANCELLED',
  'BACKORDER'
);

CREATE TYPE order_priority AS ENUM (
  'LOW',
  'NORMAL',
  'HIGH',
  'URGENT'
);

CREATE TYPE order_item_status AS ENUM (
  'PENDING',
  'PARTIAL_PICKED',
  'FULLY_PICKED'
);

CREATE TYPE task_status AS ENUM (
  'PENDING',
  'IN_PROGRESS',
  'COMPLETED',
  'SKIPPED'
);

CREATE TYPE user_role AS ENUM (
  'PICKER',
  'PACKER',
  'SUPERVISOR',
  'ADMIN'
);

CREATE TYPE bin_type AS ENUM (
  'SHELF',
  'FLOOR',
  'RACK',
  'BIN'
);

CREATE TYPE transaction_type AS ENUM (
  'RESERVATION',
  'DEDUCTION',
  'CANCELLATION',
  'ADJUSTMENT',
  'RECEIPT'
);

-- ============================================================================
-- TABLES
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Users Table
-- ----------------------------------------------------------------------------
CREATE TABLE users (
  user_id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  role user_role NOT NULL DEFAULT 'PICKER',
  active BOOLEAN,
  current_task_id VARCHAR(20),
  current_view VARCHAR(50),
  current_view_updated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  last_login_at TIMESTAMP WITH TIME ZONE,
  deleted_at TIMESTAMP WITH TIME ZONE
);

-- ----------------------------------------------------------------------------
-- SKU Catalog
-- ----------------------------------------------------------------------------
CREATE TABLE skus (
  sku VARCHAR(50) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  image VARCHAR(500),
  category VARCHAR(100) NOT NULL,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ----------------------------------------------------------------------------
-- Bin Locations
-- ----------------------------------------------------------------------------
CREATE TABLE bin_locations (
  bin_id VARCHAR(20) PRIMARY KEY, -- Format: Z-A-S (e.g., A-12-03)
  zone CHAR(1) NOT NULL,
  aisle VARCHAR(3) NOT NULL,
  shelf VARCHAR(2) NOT NULL,
  type bin_type NOT NULL DEFAULT 'SHELF',
  active BOOLEAN NOT NULL DEFAULT true,
  CONSTRAINT bin_format CHECK (bin_id ~ '^[A-Z]-[0-9]{1,3}-[0-9]{2}$')
);

-- ----------------------------------------------------------------------------
-- Inventory Units
-- ----------------------------------------------------------------------------
CREATE TABLE inventory_units (
  unit_id VARCHAR(20) PRIMARY KEY,
  sku VARCHAR(50) NOT NULL REFERENCES skus(sku) ON DELETE RESTRICT,
  bin_location VARCHAR(20) NOT NULL REFERENCES bin_locations(bin_id) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved INTEGER NOT NULL DEFAULT 0,
  available INTEGER NOT NULL GENERATED ALWAYS AS (quantity - reserved) STORED,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  CONSTRAINT inventory_non_negative CHECK (quantity >= 0),
  CONSTRAINT reserved_not_exceed_quantity CHECK (reserved <= quantity),
  CONSTRAINT unique_sku_bin UNIQUE (sku, bin_location)
);

-- ----------------------------------------------------------------------------
-- Orders
-- ----------------------------------------------------------------------------
CREATE TABLE orders (
  order_id VARCHAR(30) PRIMARY KEY,
  customer_id VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  priority order_priority NOT NULL DEFAULT 'NORMAL',
  status order_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  claimed_at TIMESTAMP WITH TIME ZONE,
  picked_at TIMESTAMP WITH TIME ZONE,
  packed_at TIMESTAMP WITH TIME ZONE,
  shipped_at TIMESTAMP WITH TIME ZONE,
  cancelled_at TIMESTAMP WITH TIME ZONE,
  picker_id VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  packer_id VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  progress INTEGER NOT NULL DEFAULT 0,
  CONSTRAINT progress_range CHECK (progress BETWEEN 0 AND 100)
);

-- ----------------------------------------------------------------------------
-- Order Items
-- ----------------------------------------------------------------------------
CREATE TABLE order_items (
  order_item_id VARCHAR(20) PRIMARY KEY,
  order_id VARCHAR(30) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL REFERENCES skus(sku) ON DELETE RESTRICT,
  name VARCHAR(255) NOT NULL,
  quantity INTEGER NOT NULL,
  picked_quantity INTEGER NOT NULL DEFAULT 0,
  bin_location VARCHAR(20) NOT NULL,
  status order_item_status NOT NULL DEFAULT 'PENDING',
  CONSTRAINT positive_quantity CHECK (quantity > 0),
  CONSTRAINT picked_not_exceed_quantity CHECK (picked_quantity <= quantity)
);

-- ----------------------------------------------------------------------------
-- Pick Tasks
-- ----------------------------------------------------------------------------
CREATE TABLE pick_tasks (
  pick_task_id VARCHAR(20) PRIMARY KEY,
  order_id VARCHAR(30) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  order_item_id VARCHAR(20) NOT NULL REFERENCES order_items(order_item_id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL,
  name VARCHAR(255) NOT NULL,
  target_bin VARCHAR(20) NOT NULL,
  quantity INTEGER NOT NULL,
  picked_quantity INTEGER NOT NULL DEFAULT 0,
  status task_status NOT NULL DEFAULT 'PENDING',
  picker_id VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  skipped_at TIMESTAMP WITH TIME ZONE,
  skip_reason TEXT,
  CONSTRAINT positive_pick_quantity CHECK (quantity > 0),
  CONSTRAINT picked_not_exceed_pick_quantity CHECK (picked_quantity <= quantity)
);

-- ----------------------------------------------------------------------------
-- Inventory Transactions (Audit Log)
-- ----------------------------------------------------------------------------
CREATE TABLE inventory_transactions (
  transaction_id VARCHAR(50) PRIMARY KEY,
  type transaction_type NOT NULL,
  sku VARCHAR(50) NOT NULL REFERENCES skus(sku) ON DELETE RESTRICT,
  quantity INTEGER NOT NULL,
  order_id VARCHAR(30) REFERENCES orders(order_id) ON DELETE SET NULL,
  user_id VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reason TEXT NOT NULL,
  bin_location VARCHAR(20)
);

-- ----------------------------------------------------------------------------
-- Order State Changes (Audit Log)
-- ----------------------------------------------------------------------------
CREATE TABLE order_state_changes (
  change_id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(30) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  from_status order_status NOT NULL,
  to_status order_status NOT NULL,
  user_id VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- INDEXES (Performance Optimization)
-- ============================================================================

-- Orders indexes
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_priority ON orders(priority);
CREATE INDEX idx_orders_picker_id ON orders(picker_id) WHERE picker_id IS NOT NULL;
CREATE INDEX idx_orders_status_priority ON orders(status, priority);

-- Order items indexes
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_sku ON order_items(sku);

-- Pick tasks indexes
CREATE INDEX idx_pick_tasks_order_id ON pick_tasks(order_id);
CREATE INDEX idx_pick_tasks_picker_id ON pick_tasks(picker_id) WHERE picker_id IS NOT NULL;
CREATE INDEX idx_pick_tasks_status ON pick_tasks(status);
CREATE INDEX idx_pick_tasks_picker_status ON pick_tasks(picker_id, status);

-- Inventory indexes
CREATE INDEX idx_inventory_sku ON inventory_units(sku);
CREATE INDEX idx_inventory_bin_location ON inventory_units(bin_location);
CREATE INDEX idx_inventory_sku_bin ON inventory_units(sku, bin_location);

-- SKU indexes
CREATE INDEX idx_skus_category ON skus(category);
CREATE INDEX idx_skus_active ON skus(active) WHERE active = true;

-- User indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_active ON users(active) WHERE active = true;

-- Transaction indexes (for audit queries)
CREATE INDEX idx_inventory_transactions_sku ON inventory_transactions(sku);
CREATE INDEX idx_inventory_transactions_timestamp ON inventory_transactions(timestamp DESC);
CREATE INDEX idx_inventory_transactions_order_id ON inventory_transactions(order_id);

CREATE INDEX idx_order_state_changes_order_id ON order_state_changes(order_id);
CREATE INDEX idx_order_state_changes_timestamp ON order_state_changes(timestamp DESC);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Update order progress based on items
-- Note: order_items.status is handled by application layer to avoid trigger recursion
CREATE OR REPLACE FUNCTION update_order_progress()
RETURNS TRIGGER AS $$
DECLARE
  total_items INTEGER;
  total_picked_ratio FLOAT;
  new_progress INTEGER;
BEGIN
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' THEN
    -- Calculate progress as average of item completion ratios
    SELECT 
      ROUND(AVG(picked_quantity::FLOAT / quantity * 100))
    INTO new_progress
    FROM order_items
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);

    -- Update order progress only (no order_items update to prevent recursion)
    UPDATE orders
    SET progress = new_progress,
        updated_at = NOW()
    WHERE order_id = COALESCE(NEW.order_id, OLD.order_id);
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_progress
  AFTER INSERT OR UPDATE ON order_items
  FOR EACH ROW
  EXECUTE FUNCTION update_order_progress();

-- Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_orders_updated_at
  BEFORE UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER trigger_skus_updated_at
  BEFORE UPDATE ON skus
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at();

-- Log order state changes
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
      NEW.picker_id
    );
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_log_order_state_change
  AFTER UPDATE ON orders
  FOR EACH ROW
  EXECUTE FUNCTION log_order_state_change();

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Generate state change ID (matches the pattern from shared/utils/generators)
CREATE OR REPLACE FUNCTION generate_state_change_id()
RETURNS VARCHAR(50) AS $$
  SELECT 'OSC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 8, '0');
$$ LANGUAGE SQL;

-- Get available inventory for SKU
CREATE OR REPLACE FUNCTION get_available_inventory(p_sku VARCHAR)
RETURNS TABLE (
  bin_location VARCHAR,
  available INTEGER
) AS $$
  SELECT bin_location, available
  FROM inventory_units
  WHERE sku = p_sku AND available > 0
  ORDER BY available DESC;
$$ LANGUAGE SQL;

-- Reserve inventory for an order (transaction wrapper)
CREATE OR REPLACE FUNCTION reserve_inventory(
  p_order_id VARCHAR,
  p_sku VARCHAR,
  p_quantity INTEGER,
  p_bin_location VARCHAR
)
RETURNS BOOLEAN AS $$
DECLARE
  v_available INTEGER;
BEGIN
  -- Check availability
  SELECT available INTO v_available
  FROM inventory_units
  WHERE sku = p_sku AND bin_location = p_bin_location;

  IF v_available < p_quantity THEN
    RAISE EXCEPTION 'Insufficient inventory at bin % for SKU %', p_bin_location, p_sku;
  END IF;

  -- Reserve the inventory
  UPDATE inventory_units
  SET reserved = reserved + p_quantity,
      last_updated = NOW()
  WHERE sku = p_sku AND bin_location = p_bin_location;

  -- Log the reservation
  INSERT INTO inventory_transactions (transaction_id, type, sku, quantity, order_id, reason, bin_location)
  VALUES (
    generate_transaction_id(),
    'RESERVATION',
    p_sku,
    p_quantity,
    p_order_id,
    'Order allocation',
    p_bin_location
  );

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql;

-- Generate transaction ID
CREATE OR REPLACE FUNCTION generate_transaction_id()
RETURNS VARCHAR(50) AS $$
  SELECT 'TXN-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(EXTRACT(EPOCH FROM NOW())::TEXT, 8, '0');
$$ LANGUAGE SQL;

-- ============================================================================
-- VIEWS (for common queries)
-- ============================================================================

-- Order queue view
CREATE VIEW order_queue_view AS
SELECT
  o.order_id,
  o.customer_name,
  o.priority,
  o.status,
  COUNT(oi.order_item_id) as item_count,
  SUM(oi.quantity) as total_quantity,
  o.created_at
FROM orders o
LEFT JOIN order_items oi ON o.order_id = oi.order_id
WHERE o.status IN ('PENDING', 'PICKING')
GROUP BY o.order_id, o.customer_name, o.priority, o.status, o.created_at
ORDER BY
  o.priority DESC,
  o.created_at ASC;

-- Active pickers view
CREATE VIEW active_pickers_view AS
SELECT
  u.user_id,
  u.name,
  o.order_id,
  o.progress,
  COUNT(pt.pick_task_id) FILTER (WHERE pt.status = 'COMPLETED') as tasks_completed,
  COUNT(pt.pick_task_id) as total_tasks
FROM users u
INNER JOIN orders o ON u.user_id = o.picker_id
LEFT JOIN pick_tasks pt ON o.order_id = pt.order_id
WHERE o.status = 'PICKING'
GROUP BY u.user_id, u.name, o.order_id, o.progress;

-- ============================================================================
-- INITIAL DATA (optional - for development)
-- ============================================================================

-- Default admin user (password: admin123 - change in production!)
-- Password hash is bcrypt hash of 'admin123'
INSERT INTO users (user_id, name, email, password_hash, role)
VALUES ('USR-ADMIN01', 'System Administrator', 'admin@wms.local', '$2b$10$rOzJQvNqPvJzNQZPNnPX6e9nXNzxNJz3GNdXnQNPNnZXNPNnZXNPN', 'ADMIN')
ON CONFLICT (user_id) DO NOTHING;

-- ============================================================================
-- GRANTS (configure based on your security requirements)
-- ============================================================================

-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO wms_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO wms_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO wms_user;

-- ============================================================================
-- END OF SCHEMA
-- ============================================================================