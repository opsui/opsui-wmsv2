/**
 * Shipping Tables Migration
 *
 * Adds support for shipping carriers, shipments, and shipping labels
 */

-- ============================================================================
-- CARRIERS
-- ============================================================================

CREATE TABLE IF NOT EXISTS carriers (
  carrier_id VARCHAR(50) PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  carrier_code VARCHAR(20) NOT NULL UNIQUE, -- UPS, FedEx, DHL, USPS, etc.
  service_types JSONB NOT NULL DEFAULT '[]'::jsonb, -- Array of service types offered

  -- Contact info
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),
  api_endpoint VARCHAR(255),
  api_key_encrypted TEXT, -- Encrypted API key for external integration

  -- Settings
  is_active BOOLEAN NOT NULL DEFAULT true,
  requires_account_number BOOLEAN NOT NULL DEFAULT false,
  requires_package_dimensions BOOLEAN NOT NULL DEFAULT true,
  requires_weight BOOLEAN NOT NULL DEFAULT true,

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Audit
  created_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX idx_carrier_active ON carriers(is_active);
CREATE INDEX idx_carrier_code ON carriers(carrier_code);

-- ============================================================================
-- SHIPMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS shipments (
  shipment_id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  carrier_id VARCHAR(50) REFERENCES carriers(carrier_id) ON DELETE SET NULL,

  -- Shipping details
  service_type VARCHAR(50) NOT NULL, -- Ground, Next Day, etc.
  shipping_method VARCHAR(50) NOT NULL DEFAULT 'STANDARD',
  tracking_number VARCHAR(100) UNIQUE,
  tracking_url VARCHAR(512),

  -- Addresses (stored as JSONB for flexibility)
  ship_from_address JSONB NOT NULL, -- Warehouse address
  ship_to_address JSONB NOT NULL, -- Customer address

  -- Package details
  total_weight DECIMAL(10, 2) NOT NULL CHECK (total_weight > 0), -- in pounds
  total_packages INTEGER NOT NULL DEFAULT 1 CHECK (total_packages > 0),
  dimensions JSONB, -- { length: number, width: number, height: number, unit: 'IN' | 'CM' }

  -- Cost tracking
  shipping_cost DECIMAL(10, 2) CHECK (shipping_cost >= 0),
  insurance_cost DECIMAL(10, 2) CHECK (insurance_cost >= 0),
  total_cost DECIMAL(10, 2) GENERATED ALWAYS AS (COALESCE(shipping_cost, 0) + COALESCE(insurance_cost, 0)) STORED,

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'LABEL_CREATED', 'SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED', 'EXCEPTION', 'CANCELLED')),

  -- Dates
  ship_date DATE,
  estimated_delivery_date DATE,
  actual_delivery_date DATE,

  -- Carrier integration
  carrier_shipment_id VARCHAR(100), -- External shipment ID from carrier API
  carrier_response JSONB, -- Full API response from carrier

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  shipped_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,

  -- Audit
  created_by VARCHAR(20) NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,
  shipped_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,

  CONSTRAINT order_not_already_shipped UNIQUE (order_id)
);

CREATE INDEX idx_shipment_order ON shipments(order_id);
CREATE INDEX idx_shipment_carrier ON shipments(carrier_id);
CREATE INDEX idx_shipment_status ON shipments(status);
CREATE INDEX idx_shipment_tracking ON shipments(tracking_number);
CREATE INDEX idx_shipment_ship_date ON shipments(ship_date);
CREATE INDEX idx_shipment_created_at ON shipments(created_at);

-- ============================================================================
-- SHIPPING LABELS
-- ============================================================================

CREATE TABLE IF NOT EXISTS shipping_labels (
  label_id VARCHAR(50) PRIMARY KEY,
  shipment_id VARCHAR(50) NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,

  -- Label details
  label_format VARCHAR(20) NOT NULL DEFAULT 'PDF', -- PDF, PNG, ZPLII, etc.
  label_url VARCHAR(512), -- URL to download label
  label_data TEXT, -- Base64 encoded label data for local storage

  -- Package info for this label
  package_number INTEGER NOT NULL DEFAULT 1,
  package_weight DECIMAL(10, 2) NOT NULL CHECK (package_weight > 0),
  package_dimensions JSONB, -- { length: number, width: number, height: number, unit: 'IN' | 'CM' }

  -- Carrier info
  carrier_tracking_number VARCHAR(100),

  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  printed_at TIMESTAMP WITH TIME ZONE,

  -- Audit
  created_by VARCHAR(20) NOT NULL REFERENCES users(user_id) ON DELETE RESTRICT,

  CONSTRAINT shipment_package_unique UNIQUE (shipment_id, package_number)
);

CREATE INDEX idx_label_shipment ON shipping_labels(shipment_id);
CREATE INDEX idx_label_tracking ON shipping_labels(carrier_tracking_number);

-- ============================================================================
-- SHIPMENT TRACKING EVENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS shipment_tracking_events (
  event_id VARCHAR(50) PRIMARY KEY,
  shipment_id VARCHAR(50) NOT NULL REFERENCES shipments(shipment_id) ON DELETE CASCADE,

  -- Event details
  event_code VARCHAR(50) NOT NULL,
  event_description TEXT NOT NULL,
  event_location VARCHAR(255),

  -- Timestamp
  event_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),

  -- Source
  event_source VARCHAR(50) NOT NULL DEFAULT 'API', -- API, MANUAL, WEBHOOK

  -- Raw data from carrier
  raw_event_data JSONB
);

CREATE INDEX idx_tracking_event_shipment ON shipment_tracking_events(shipment_id);
CREATE INDEX idx_tracking_event_date ON shipment_tracking_events(event_date DESC);

-- ============================================================================
-- TRIGGER: UPDATE SHIPMENT STATUS BASED ON TRACKING EVENTS
-- ============================================================================

-- Trigger function to update shipment status based on latest tracking event
CREATE OR REPLACE FUNCTION update_shipment_status_from_tracking()
RETURNS TRIGGER AS $$
BEGIN
  -- Update shipment status based on event code
  UPDATE shipments
  SET status = CASE
    WHEN NEW.event_code IN ('DELIVERED', 'DELIVERY_CONFIRMED') THEN 'DELIVERED'
    WHEN NEW.event_code IN ('OUT_FOR_DELIVERY', 'OFC') THEN 'OUT_FOR_DELIVERY'
    WHEN NEW.event_code IN ('IN_TRANSIT', 'DEPARTED', 'ARRIVED') THEN 'IN_TRANSIT'
    WHEN NEW.event_code IN ('EXCEPTION', 'DELIVERY_EXCEPTION', 'DELAYED') THEN 'EXCEPTION'
    WHEN NEW.event_code IN ('SHIPPED', 'PICKED_UP', 'LABEL_CREATED') THEN 'SHIPPED'
    ELSE status
  END,
  actual_delivery_date = CASE
    WHEN NEW.event_code IN ('DELIVERED', 'DELIVERY_CONFIRMED') THEN NEW.event_date::date
    ELSE actual_delivery_date
  END,
  delivered_at = CASE
    WHEN NEW.event_code IN ('DELIVERED', 'DELIVERY_CONFIRMED') THEN NEW.event_date
    ELSE delivered_at
  END,
  updated_at = NOW()
  WHERE shipment_id = NEW.shipment_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_shipment_status
AFTER INSERT ON shipment_tracking_events
FOR EACH ROW
EXECUTE FUNCTION update_shipment_status_from_tracking();

-- ============================================================================
-- TRIGGER: UPDATE ORDER STATUS WHEN SHIPPED
-- ============================================================================

CREATE OR REPLACE FUNCTION update_order_status_when_shipped()
RETURNS TRIGGER AS $$
BEGIN
  -- If shipment status changed to SHIPPED or higher, update order status
  IF NEW.status IN ('SHIPPED', 'IN_TRANSIT', 'OUT_FOR_DELIVERY', 'DELIVERED') THEN
    -- Only update if order isn't already in a shipped state
    UPDATE orders
    SET status = 'SHIPPED',
        shipped_at = COALESCE(orders.shipped_at, NEW.shipped_at, NOW()),
        updated_at = NOW()
    WHERE order_id = NEW.order_id
    AND status NOT IN ('SHIPPED', 'CANCELLED');
  END IF;

  -- If delivered, update order status
  IF NEW.status = 'DELIVERED' AND NEW.delivered_at IS NOT NULL THEN
    UPDATE orders
    SET status = 'DELIVERED',
        updated_at = NOW()
    WHERE order_id = NEW.order_id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_order_shipped
AFTER UPDATE OF status ON shipments
FOR EACH ROW
WHEN (OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_order_status_when_shipped();

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE carriers IS 'Shipping carriers (UPS, FedEx, DHL, USPS, etc.)';
COMMENT ON TABLE shipments IS 'Shipment records for orders including tracking and status';
COMMENT ON TABLE shipping_labels IS 'Shipping labels for individual packages within a shipment';
COMMENT ON TABLE shipment_tracking_events IS 'Tracking event history for shipments';

-- ============================================================================
-- DEFAULT CARRIERS (for common carriers)
-- ============================================================================

INSERT INTO carriers (carrier_id, name, carrier_code, service_types, is_active) VALUES
  ('CARRIER-UPS', 'United Parcel Service', 'UPS', '["Ground", "Next Day Air", "2nd Day Air", "Express Saver"]'::jsonb, true),
  ('CARRIER-FEDEX', 'FedEx Corporation', 'FDX', '["Ground", "Express", "2Day", "Standard Overnight"]'::jsonb, true),
  ('CARRIER-USPS', 'United States Postal Service', 'USPS', '["Priority Mail", "First Class", "Parcel Select", "Express"]'::jsonb, true),
  ('CARRIER-DHL', 'DHL Express', 'DHL', '["Express Worldwide", "Express 12:00", "Ground"]'::jsonb, true)
ON CONFLICT (carrier_code) DO NOTHING;
