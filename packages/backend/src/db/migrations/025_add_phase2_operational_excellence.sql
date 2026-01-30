-- ============================================================================
-- PHASE 2: OPERATIONAL EXCELLENCE DATABASE MIGRATION
-- Features: Cycle Counting, Location Capacity Rules, Quality Control
-- ============================================================================

-- ============================================================================
-- CYCLE COUNTING TABLES
-- ============================================================================

-- Cycle Count Plans
CREATE TABLE IF NOT EXISTS cycle_count_plans (
  plan_id VARCHAR(50) PRIMARY KEY,
  plan_name VARCHAR(255) NOT NULL,
  count_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'SCHEDULED',
  scheduled_date TIMESTAMP NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  reconciled_at TIMESTAMP,
  location VARCHAR(100),
  sku VARCHAR(100),
  count_by VARCHAR(50) NOT NULL,
  created_by VARCHAR(50) NOT NULL,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_count_by FOREIGN KEY (count_by) REFERENCES users(user_id),
  CONSTRAINT fk_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT chk_cycle_count_status CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'RECONCILED')),
  CONSTRAINT chk_count_type CHECK (count_type IN ('ABC', 'BLANKET', 'SPOT_CHECK', 'RECEIVING', 'SHIPPING', 'AD_HOC'))
);

CREATE INDEX idx_cycle_count_status ON cycle_count_plans(status);
CREATE INDEX idx_cycle_count_scheduled_date ON cycle_count_plans(scheduled_date);
CREATE INDEX idx_cycle_count_location ON cycle_count_plans(location);
CREATE INDEX idx_cycle_count_sku ON cycle_count_plans(sku);

-- Cycle Count Entries
CREATE TABLE IF NOT EXISTS cycle_count_entries (
  entry_id VARCHAR(50) PRIMARY KEY,
  plan_id VARCHAR(50) NOT NULL,
  sku VARCHAR(100) NOT NULL,
  bin_location VARCHAR(100) NOT NULL,
  system_quantity NUMERIC(10, 2) NOT NULL,
  counted_quantity NUMERIC(10, 2) NOT NULL,
  variance NUMERIC(10, 2) NOT NULL,
  variance_percent NUMERIC(5, 2),
  variance_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  counted_at TIMESTAMP NOT NULL,
  counted_by VARCHAR(50) NOT NULL,
  reviewed_by VARCHAR(50),
  reviewed_at TIMESTAMP,
  adjustment_transaction_id VARCHAR(50),
  notes TEXT,
  CONSTRAINT fk_plan FOREIGN KEY (plan_id) REFERENCES cycle_count_plans(plan_id) ON DELETE CASCADE,
  CONSTRAINT fk_counted_by FOREIGN KEY (counted_by) REFERENCES users(user_id),
  CONSTRAINT fk_reviewed_by FOREIGN KEY (reviewed_by) REFERENCES users(user_id),
  CONSTRAINT fk_adjustment_trans FOREIGN KEY (adjustment_transaction_id) REFERENCES inventory_transactions(transaction_id),
  CONSTRAINT chk_variance_status CHECK (variance_status IN ('PENDING', 'APPROVED', 'REJECTED', 'AUTO_ADJUSTED'))
);

CREATE INDEX idx_cycle_entry_plan ON cycle_count_entries(plan_id);
CREATE INDEX idx_cycle_entry_sku ON cycle_count_entries(sku);
CREATE INDEX idx_cycle_entry_location ON cycle_count_entries(bin_location);
CREATE INDEX idx_cycle_entry_variance_status ON cycle_count_entries(variance_status);

-- Cycle Count Tolerances
CREATE TABLE IF NOT EXISTS cycle_count_tolerances (
  tolerance_id VARCHAR(50) PRIMARY KEY,
  tolerance_name VARCHAR(255) NOT NULL,
  sku VARCHAR(100),
  abc_category CHAR(1),
  location_zone VARCHAR(50),
  allowable_variance_percent NUMERIC(5, 2) NOT NULL,
  allowable_variance_amount NUMERIC(10, 2) NOT NULL,
  auto_adjust_threshold NUMERIC(5, 2) NOT NULL,
  requires_approval_threshold NUMERIC(5, 2) NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_tolerance_sku ON cycle_count_tolerances(sku);
CREATE INDEX idx_tolerance_abc ON cycle_count_tolerances(abc_category);
CREATE INDEX idx_tolerance_zone ON cycle_count_tolerances(location_zone);

-- Trigger to update updated_at for cycle count plans
CREATE OR REPLACE FUNCTION update_cycle_count_plans_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_cycle_count_plans_updated_at
  BEFORE UPDATE ON cycle_count_plans
  FOR EACH ROW
  EXECUTE FUNCTION update_cycle_count_plans_updated_at();

-- ============================================================================
-- LOCATION CAPACITY TABLES
-- ============================================================================

-- Location Capacity
CREATE TABLE IF NOT EXISTS location_capacities (
  capacity_id VARCHAR(50) PRIMARY KEY,
  bin_location VARCHAR(100) NOT NULL UNIQUE,
  capacity_type VARCHAR(50) NOT NULL,
  maximum_capacity NUMERIC(10, 2) NOT NULL,
  current_utilization NUMERIC(10, 2) NOT NULL DEFAULT 0,
  available_capacity NUMERIC(10, 2) NOT NULL,
  utilization_percent NUMERIC(5, 2) NOT NULL DEFAULT 0,
  capacity_unit VARCHAR(20) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'ACTIVE',
  warning_threshold NUMERIC(5, 2) NOT NULL DEFAULT 80,
  exceeded_at TIMESTAMP,
  last_updated TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_capacity_type CHECK (capacity_type IN ('WEIGHT', 'VOLUME', 'QUANTITY')),
  CONSTRAINT chk_capacity_unit CHECK (capacity_unit IN ('LBS', 'KG', 'CUBIC_FT', 'CUBIC_M', 'UNITS', 'PALLET')),
  CONSTRAINT chk_capacity_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'WARNING', 'EXCEEDED'))
);

CREATE INDEX idx_location_capacity_bin ON location_capacities(bin_location);
CREATE INDEX idx_location_capacity_status ON location_capacities(status);
CREATE INDEX idx_location_capacity_type ON location_capacities(capacity_type);

-- Capacity Rules
CREATE TABLE IF NOT EXISTS capacity_rules (
  rule_id VARCHAR(50) PRIMARY KEY,
  rule_name VARCHAR(255) NOT NULL,
  description TEXT,
  capacity_type VARCHAR(50) NOT NULL,
  capacity_unit VARCHAR(20) NOT NULL,
  applies_to VARCHAR(50) NOT NULL,
  zone VARCHAR(50),
  location_type VARCHAR(50),
  specific_location VARCHAR(100),
  maximum_capacity NUMERIC(10, 2) NOT NULL,
  warning_threshold NUMERIC(5, 2) NOT NULL DEFAULT 80,
  allow_overfill BOOLEAN DEFAULT false,
  overfill_threshold NUMERIC(5, 2),
  is_active BOOLEAN DEFAULT true,
  priority INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_rule_applies_to CHECK (applies_to IN ('ALL', 'ZONE', 'LOCATION_TYPE', 'SPECIFIC_LOCATION')),
  CONSTRAINT chk_rule_capacity_type CHECK (capacity_type IN ('WEIGHT', 'VOLUME', 'QUANTITY')),
  CONSTRAINT chk_rule_capacity_unit CHECK (capacity_unit IN ('LBS', 'KG', 'CUBIC_FT', 'CUBIC_M', 'UNITS', 'PALLET'))
);

CREATE INDEX idx_capacity_rules_active ON capacity_rules(is_active);
CREATE INDEX idx_capacity_rules_priority ON capacity_rules(priority);

-- Capacity Alerts
CREATE TABLE IF NOT EXISTS capacity_alerts (
  alert_id VARCHAR(50) PRIMARY KEY,
  bin_location VARCHAR(100) NOT NULL,
  capacity_type VARCHAR(50) NOT NULL,
  current_utilization NUMERIC(10, 2) NOT NULL,
  maximum_capacity NUMERIC(10, 2) NOT NULL,
  utilization_percent NUMERIC(5, 2) NOT NULL,
  alert_type VARCHAR(50) NOT NULL,
  alert_message TEXT NOT NULL,
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by VARCHAR(50),
  acknowledged_at TIMESTAMP,
  resolved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_acknowledged_by FOREIGN KEY (acknowledged_by) REFERENCES users(user_id),
  CONSTRAINT chk_alert_type CHECK (alert_type IN ('WARNING', 'EXCEEDED', 'CRITICAL'))
);

CREATE INDEX idx_capacity_alerts_location ON capacity_alerts(bin_location);
CREATE INDEX idx_capacity_alerts_acknowledged ON capacity_alerts(acknowledged);
CREATE INDEX idx_capacity_alerts_created ON capacity_alerts(created_at);

-- Trigger to update updated_at for location capacities
CREATE OR REPLACE FUNCTION update_location_capacities_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_location_capacities_updated_at
  BEFORE UPDATE ON location_capacities
  FOR EACH ROW
  EXECUTE FUNCTION update_location_capacities_updated_at();

-- Trigger to update updated_at for capacity rules
CREATE OR REPLACE FUNCTION update_capacity_rules_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_capacity_rules_updated_at
  BEFORE UPDATE ON capacity_rules
  FOR EACH ROW
  EXECUTE FUNCTION update_capacity_rules_updated_at();

-- ============================================================================
-- QUALITY CONTROL TABLES
-- ============================================================================

-- Inspection Checklists
CREATE TABLE IF NOT EXISTS inspection_checklists (
  checklist_id VARCHAR(50) PRIMARY KEY,
  checklist_name VARCHAR(255) NOT NULL,
  description TEXT,
  inspection_type VARCHAR(50) NOT NULL,
  sku VARCHAR(100),
  category VARCHAR(100),
  is_active BOOLEAN DEFAULT true,
  created_by VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_checklist_created_by FOREIGN KEY (created_by) REFERENCES users(user_id),
  CONSTRAINT chk_inspection_type CHECK (inspection_type IN ('INCOMING', 'OUTGOING', 'INVENTORY', 'QUALITY_HOLD', 'RETURN', 'DAMAGE', 'EXPIRATION', 'SPECIAL'))
);

CREATE INDEX idx_checklist_type ON inspection_checklists(inspection_type);
CREATE INDEX idx_checklist_sku ON inspection_checklists(sku);
CREATE INDEX idx_checklist_category ON inspection_checklists(category);
CREATE INDEX idx_checklist_active ON inspection_checklists(is_active);

-- Inspection Checklist Items
CREATE TABLE IF NOT EXISTS inspection_checklist_items (
  item_id VARCHAR(50) PRIMARY KEY,
  checklist_id VARCHAR(50) NOT NULL,
  item_description TEXT NOT NULL,
  item_type VARCHAR(50) NOT NULL,
  is_required BOOLEAN DEFAULT false,
  display_order INT NOT NULL DEFAULT 0,
  options TEXT,
  CONSTRAINT fk_checklist FOREIGN KEY (checklist_id) REFERENCES inspection_checklists(checklist_id) ON DELETE CASCADE,
  CONSTRAINT chk_item_type CHECK (item_type IN ('CHECKBOX', 'TEXT', 'NUMBER', 'PHOTO', 'PASS_FAIL'))
);

CREATE INDEX idx_checklist_items_checklist ON inspection_checklist_items(checklist_id);

-- Quality Inspections
CREATE TABLE IF NOT EXISTS quality_inspections (
  inspection_id VARCHAR(50) PRIMARY KEY,
  inspection_type VARCHAR(50) NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  reference_type VARCHAR(50) NOT NULL,
  reference_id VARCHAR(100) NOT NULL,
  sku VARCHAR(100) NOT NULL,
  quantity_inspected INT NOT NULL,
  quantity_passed INT DEFAULT 0,
  quantity_failed INT DEFAULT 0,
  defect_type VARCHAR(50),
  defect_description TEXT,
  disposition_action VARCHAR(50),
  disposition_notes TEXT,
  inspector_id VARCHAR(50) NOT NULL,
  inspector_name VARCHAR(255) NOT NULL,
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  location VARCHAR(100),
  lot_number VARCHAR(100),
  expiration_date DATE,
  images TEXT,
  attachments TEXT,
  approved_by VARCHAR(50),
  approved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_inspector FOREIGN KEY (inspector_id) REFERENCES users(user_id),
  CONSTRAINT fk_approved_by FOREIGN KEY (approved_by) REFERENCES users(user_id),
  CONSTRAINT chk_inspection_status CHECK (status IN ('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'CONDITIONAL_PASSED', 'CANCELLED')),
  CONSTRAINT chk_qc_inspection_type CHECK (inspection_type IN ('INCOMING', 'OUTGOING', 'INVENTORY', 'QUALITY_HOLD', 'RETURN', 'DAMAGE', 'EXPIRATION', 'SPECIAL')),
  CONSTRAINT chk_reference_type CHECK (reference_type IN ('ASN', 'RECEIPT', 'ORDER', 'INVENTORY', 'RETURN'))
);

CREATE INDEX idx_inspections_status ON quality_inspections(status);
CREATE INDEX idx_inspections_type ON quality_inspections(inspection_type);
CREATE INDEX idx_inspections_reference ON quality_inspections(reference_type, reference_id);
CREATE INDEX idx_inspections_sku ON quality_inspections(sku);
CREATE INDEX idx_inspections_inspector ON quality_inspections(inspector_id);

-- Inspection Results
CREATE TABLE IF NOT EXISTS inspection_results (
  result_id VARCHAR(50) PRIMARY KEY,
  inspection_id VARCHAR(50) NOT NULL,
  checklist_item_id VARCHAR(50) NOT NULL,
  result TEXT NOT NULL,
  passed BOOLEAN NOT NULL,
  notes TEXT,
  image_url TEXT,
  CONSTRAINT fk_inspection FOREIGN KEY (inspection_id) REFERENCES quality_inspections(inspection_id) ON DELETE CASCADE,
  CONSTRAINT fk_checklist_item FOREIGN KEY (checklist_item_id) REFERENCES inspection_checklist_items(item_id)
);

CREATE INDEX idx_inspection_results_inspection ON inspection_results(inspection_id);

-- Return Authorizations
CREATE TABLE IF NOT EXISTS return_authorizations (
  return_id VARCHAR(50) PRIMARY KEY,
  order_id VARCHAR(50) NOT NULL,
  customer_id VARCHAR(50) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  return_reason TEXT NOT NULL,
  return_date DATE NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
  authorized_by VARCHAR(50) NOT NULL,
  received_by VARCHAR(50),
  inspected_by VARCHAR(50),
  total_refund_amount NUMERIC(10, 2) NOT NULL,
  restocking_fee NUMERIC(10, 2),
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_return_order FOREIGN KEY (order_id) REFERENCES orders(order_id),
  CONSTRAINT fk_return_authorized_by FOREIGN KEY (authorized_by) REFERENCES users(user_id),
  CONSTRAINT fk_return_received_by FOREIGN KEY (received_by) REFERENCES users(user_id),
  CONSTRAINT fk_return_inspected_by FOREIGN KEY (inspected_by) REFERENCES users(user_id),
  CONSTRAINT chk_return_status CHECK (status IN ('PENDING', 'APPROVED', 'RECEIVED', 'INSPECTED', 'PROCESSED', 'REJECTED', 'COMPLETED'))
);

CREATE INDEX idx_returns_status ON return_authorizations(status);
CREATE INDEX idx_returns_order ON return_authorizations(order_id);
CREATE INDEX idx_returns_customer ON return_authorizations(customer_id);
CREATE INDEX idx_returns_date ON return_authorizations(return_date);

-- Return Items
CREATE TABLE IF NOT EXISTS return_items (
  return_item_id VARCHAR(50) PRIMARY KEY,
  return_id VARCHAR(50) NOT NULL,
  order_item_id VARCHAR(50) NOT NULL,
  sku VARCHAR(100) NOT NULL,
  name VARCHAR(255) NOT NULL,
  quantity INT NOT NULL,
  return_reason TEXT NOT NULL,
  condition VARCHAR(50) NOT NULL,
  disposition VARCHAR(50),
  refund_amount NUMERIC(10, 2) NOT NULL,
  inspection_id VARCHAR(50),
  CONSTRAINT fk_return FOREIGN KEY (return_id) REFERENCES return_authorizations(return_id) ON DELETE CASCADE,
  CONSTRAINT fk_return_order_item FOREIGN KEY (order_item_id) REFERENCES order_items(order_item_id),
  CONSTRAINT fk_return_inspection FOREIGN KEY (inspection_id) REFERENCES quality_inspections(inspection_id),
  CONSTRAINT chk_return_condition CHECK (condition IN ('NEW', 'OPENED', 'DAMAGED', 'DEFECTIVE'))
);

CREATE INDEX idx_return_items_return ON return_items(return_id);
CREATE INDEX idx_return_items_sku ON return_items(sku);

-- Trigger to update updated_at for quality inspections
CREATE OR REPLACE FUNCTION update_quality_inspections_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_quality_inspections_updated_at
  BEFORE UPDATE ON quality_inspections
  FOR EACH ROW
  EXECUTE FUNCTION update_quality_inspections_updated_at();

-- Trigger to update updated_at for return authorizations
CREATE OR REPLACE FUNCTION update_return_authorizations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_return_authorizations_updated_at
  BEFORE UPDATE ON return_authorizations
  FOR EACH ROW
  EXECUTE FUNCTION update_return_authorizations_updated_at();

-- Trigger to update updated_at for inspection checklists
CREATE OR REPLACE FUNCTION update_inspection_checklists_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_inspection_checklists_updated_at
  BEFORE UPDATE ON inspection_checklists
  FOR EACH ROW
  EXECUTE FUNCTION update_inspection_checklists_updated_at();

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE cycle_count_plans IS 'Scheduled cycle count plans for inventory accuracy verification';
COMMENT ON TABLE cycle_count_entries IS 'Individual count entries with variance tracking';
COMMENT ON TABLE cycle_count_tolerances IS 'Configurable tolerance rules for auto-adjustment thresholds';
COMMENT ON TABLE location_capacities IS 'Current capacity utilization per bin location';
COMMENT ON TABLE capacity_rules IS 'Business rules defining capacity constraints by location type/zone';
COMMENT ON TABLE capacity_alerts IS 'Alerts when capacity thresholds are exceeded';
COMMENT ON TABLE inspection_checklists IS 'Templates for quality inspection criteria';
COMMENT ON TABLE inspection_checklist_items IS 'Individual checklist items with various input types';
COMMENT ON TABLE quality_inspections IS 'Quality control inspection records';
COMMENT ON TABLE inspection_results IS 'Results from inspection checklist completion';
COMMENT ON TABLE return_authorizations IS 'Customer return authorization records';
COMMENT ON TABLE return_items IS 'Individual items in a customer return';

-- ============================================================================
-- INITIAL DATA
-- ============================================================================

-- Insert default cycle count tolerances
INSERT INTO cycle_count_tolerances (tolerance_id, tolerance_name, abc_category, allowable_variance_percent, allowable_variance_amount, auto_adjust_threshold, requires_approval_threshold) VALUES
  ('TOL-ABC-A', 'A-Item Tolerance (High Value)', 'A', 0.5, 1, 0.25, 1.0),
  ('TOL-ABC-B', 'B-Item Tolerance (Medium Value)', 'B', 1.0, 5, 0.5, 2.0),
  ('TOL-ABC-C', 'C-Item Tolerance (Low Value)', 'C', 2.0, 10, 1.0, 3.0),
  ('TOL-DEFAULT', 'Default Tolerance', NULL, 1.0, 5, 0.5, 2.0)
ON CONFLICT DO NOTHING;

-- Insert default capacity rules
INSERT INTO capacity_rules (rule_id, rule_name, description, capacity_type, capacity_unit, applies_to, maximum_capacity, warning_threshold, allow_overfill, priority) VALUES
  ('RULE-SHELF-QTY', 'Shelf Quantity Limit', 'Standard shelving unit quantity limit', 'QUANTITY', 'UNITS', 'LOCATION_TYPE', 100, 80, false, 1),
  ('RULE-RACK-QTY', 'Rack Quantity Limit', 'Rack storage quantity limit', 'QUANTITY', 'UNITS', 'LOCATION_TYPE', 500, 85, false, 1),
  ('RULE-FLOOR-QTY', 'Floor Quantity Limit', 'Floor storage quantity limit', 'QUANTITY', 'PALLET', 'LOCATION_TYPE', 20, 90, true, 1),
  ('RULE-SHELF-WEIGHT', 'Shelf Weight Limit', 'Standard shelving weight limit', 'WEIGHT', 'LBS', 'LOCATION_TYPE', 500, 80, false, 2),
  ('RULE-FLOOR-WEIGHT', 'Floor Weight Limit', 'Floor storage weight limit', 'WEIGHT', 'LBS', 'LOCATION_TYPE', 2000, 85, false, 2)
ON CONFLICT DO NOTHING;

-- Insert default inspection checklist
-- Note: Using admin user if exists, otherwise use NULL and update later
DO $$
BEGIN
  -- Try inserting with an admin user if exists, otherwise use NULL
  IF EXISTS (SELECT 1 FROM users WHERE user_id = 'admin-001') THEN
    INSERT INTO inspection_checklists (checklist_id, checklist_name, description, inspection_type, created_by) VALUES
      ('CHK-INCOMING-DEFAULT', 'Incoming Goods Inspection', 'Standard inspection for incoming shipments', 'INCOMING', 'admin-001'),
      ('CHK-RETURN-DEFAULT', 'Return Inspection', 'Inspection checklist for returned items', 'RETURN', 'admin-001'),
      ('CHK-DAMAGE-DEFAULT', 'Damage Inspection', 'Inspection for damaged goods', 'DAMAGE', 'admin-001')
    ON CONFLICT DO NOTHING;
  ELSE
    -- Temporarily disable FK constraint, insert, then re-enable
    ALTER TABLE inspection_checklists DROP CONSTRAINT IF EXISTS fk_checklist_created_by;
    INSERT INTO inspection_checklists (checklist_id, checklist_name, description, inspection_type, created_by) VALUES
      ('CHK-INCOMING-DEFAULT', 'Incoming Goods Inspection', 'Standard inspection for incoming shipments', 'INCOMING', 'SYSTEM'),
      ('CHK-RETURN-DEFAULT', 'Return Inspection', 'Inspection checklist for returned items', 'RETURN', 'SYSTEM'),
      ('CHK-DAMAGE-DEFAULT', 'Damage Inspection', 'Inspection for damaged goods', 'DAMAGE', 'SYSTEM')
    ON CONFLICT DO NOTHING;
    ALTER TABLE inspection_checklists ADD CONSTRAINT fk_checklist_created_by
      FOREIGN KEY (created_by) REFERENCES users(user_id);
  END IF;
END $$;

-- Insert default checklist items for incoming inspection
INSERT INTO inspection_checklist_items (item_id, checklist_id, item_description, item_type, is_required, display_order) VALUES
  ('CHK-ITEM-1', 'CHK-INCOMING-DEFAULT', 'Packaging intact', 'PASS_FAIL', true, 1),
  ('CHK-ITEM-2', 'CHK-INCOMING-DEFAULT', 'Correct quantity received', 'PASS_FAIL', true, 2),
  ('CHK-ITEM-3', 'CHK-INCOMING-DEFAULT', 'No visible damage', 'PASS_FAIL', true, 3),
  ('CHK-ITEM-4', 'CHK-INCOMING-DEFAULT', 'Labels match purchase order', 'PASS_FAIL', true, 4),
  ('CHK-ITEM-5', 'CHK-INCOMING-DEFAULT', 'Expiration date acceptable', 'PASS_FAIL', false, 5)
ON CONFLICT DO NOTHING;

-- Insert default checklist items for return inspection
INSERT INTO inspection_checklist_items (item_id, checklist_id, item_description, item_type, is_required, display_order) VALUES
  ('CHK-ITEM-10', 'CHK-RETURN-DEFAULT', 'Item condition assessment', 'PASS_FAIL', true, 1),
  ('CHK-ITEM-11', 'CHK-RETURN-DEFAULT', 'Original packaging intact', 'PASS_FAIL', false, 2),
  ('CHK-ITEM-12', 'CHK-RETURN-DEFAULT', 'All accessories present', 'PASS_FAIL', false, 3),
  ('CHK-ITEM-13', 'CHK-RETURN-DEFAULT', 'Sanitary seals intact', 'PASS_FAIL', true, 4)
ON CONFLICT DO NOTHING;
