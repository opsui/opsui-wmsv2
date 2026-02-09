-- ============================================================================
-- Migration 054: Advanced Manufacturing Enhancement
-- Phase 4: Advanced Manufacturing (Weeks 13-16)
--
-- This migration adds:
-- 1. Work Centers - Production capacity and resource definition
-- 2. Manufacturing Routings - Process definitions with operations
-- 3. Master Production Schedule (MPS) - Production planning at master schedule level
-- 4. Material Requirements Planning (MRP) - Detailed material planning
-- 5. Shop Floor Control - Real-time production tracking
-- 6. Production Quality Management - QC for manufactured goods
-- 7. Capacity Planning - Resource capacity management
--
-- Author: ERP Transformation - Phase 4
-- Date: 2025
-- ============================================================================

-- ============================================================================
-- TYPES AND ENUMS
-- ============================================================================

-- Work Center Status
CREATE TYPE work_center_status AS ENUM (
  'ACTIVE',
  'INACTIVE',
  'MAINTENANCE',
  'DOWN'
);

-- Routing Status
CREATE TYPE routing_status AS ENUM (
  'DRAFT',
  'ACTIVE',
  'INACTIVE',
  'SUPERSEDED'
);

-- Operation Type
CREATE TYPE operation_type AS ENUM (
  'SETUP',
  'MACHINING',
  'ASSEMBLY',
  'INSPECTION',
  'PACKAGING',
  'OUTSIDE_PROCESS'
);

-- Production Order Status
CREATE TYPE production_order_status AS ENUM (
  'DRAFT',
  'PLANNED',
  'RELEASED',
  'IN_PROGRESS',
  'COMPLETED',
  'CLOSED',
  'CANCELLED'
);

-- MPS Status
CREATE TYPE mps_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'FIRM',
  'RELEASED'
);

-- MRP Plan Status
CREATE TYPE mrp_plan_status AS ENUM (
  'DRAFT',
  'CALCULATING',
  'COMPLETED',
  'APPROVED',
  'RELEASED',
  'ARCHIVED'
);

-- MRP Action Type
CREATE TYPE mrp_action_type AS ENUM (
  'RELEASE_ORDER',
  'RESCHEDULE_IN',
  'RESCHEDULE_OUT',
  'CANCEL_ORDER',
  'ADJUST_QUANTITY',
  'EXPEDITE',
  'DE_EXPEDITE'
);

-- Shop Floor Transaction Type
CREATE TYPE shop_floor_transaction_type AS ENUM (
  'CLOCK_ON',
  'CLOCK_OFF',
  'REPORT_QUANTITY',
  'REPORT_SCRAP',
  'REPORT_REWORK',
  'MOVE_OPERATION',
  'COMPLETE_OPERATION',
  'SUSPEND',
  'RESUME'
);

-- Defect Type
CREATE TYPE defect_type AS ENUM (
  'DIMENSIONAL',
  'COSMETIC',
  'FUNCTIONAL',
  'MATERIAL',
  'ASSEMBLY',
  'PACKAGING',
  'DOCUMENTATION',
  'OTHER'
);

-- Defect Severity
CREATE TYPE defect_severity AS ENUM (
  'MINOR',
  'MAJOR',
  'CRITICAL'
);

-- Defect Disposition
CREATE TYPE defect_disposition AS ENUM (
  'ACCEPT',
  'REWORK',
  'SCRAP',
  'RETURN_TO_VENDOR',
  'CONCESSION',
  'QUARANTINE'
);

-- Capacity Plan Status
CREATE TYPE capacity_plan_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'APPROVED',
  'ACTIVE',
  'COMPLETED'
);

-- ============================================================================
-- TABLES: WORK CENTERS
-- ============================================================================

-- Work Centers
-- Define production resources and their capacity
CREATE TABLE IF NOT EXISTS work_centers (
  work_center_id VARCHAR(20) PRIMARY KEY,
  work_center_code VARCHAR(20) UNIQUE NOT NULL,
  work_center_name VARCHAR(255) NOT NULL,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,

  -- Classification
  department VARCHAR(100),
  cost_center VARCHAR(50),
  location VARCHAR(100),
  site_id VARCHAR(20),

  -- Capacity
  capacity_per_shift DECIMAL(10,2) DEFAULT 8.0, -- Hours per shift
  shifts_per_day INTEGER DEFAULT 1,
  efficiency_percent DECIMAL(5,2) DEFAULT 100.0,
  utilization_percent DECIMAL(5,2) DEFAULT 85.0,
  available_capacity DECIMAL(10,2) GENERATED ALWAYS AS (
    capacity_per_shift * shifts_per_day * (utilization_percent / 100.0)
  ) STORED,

  -- Costing
  labor_rate_per_hour DECIMAL(12,2),
  machine_rate_per_hour DECIMAL(12,2),
  overhead_rate_per_hour DECIMAL(12,2),
  burden_rate DECIMAL(5,2), -- Overhead as % of labor

  -- Scheduling
  setup_time_required BOOLEAN DEFAULT true,
  calendar_id VARCHAR(50), -- Shop calendar

  -- Status
  work_center_status work_center_status NOT NULL DEFAULT 'ACTIVE',
  active BOOLEAN DEFAULT true,

  -- Description
  description TEXT,
  equipment_list JSONB, -- Array of equipment
  skills_required JSONB, -- Array of required skills

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_capacity_positive CHECK (capacity_per_shift > 0),
  CONSTRAINT chk_shifts_positive CHECK (shifts_per_day > 0),
  CONSTRAINT chk_rates_positive CHECK (
    (labor_rate_per_hour IS NULL OR labor_rate_per_hour >= 0) AND
    (machine_rate_per_hour IS NULL OR machine_rate_per_hour >= 0)
  )
);

CREATE INDEX idx_wc_entity ON work_centers(entity_id);
CREATE INDEX idx_wc_department ON work_centers(department);
CREATE INDEX idx_wc_status ON work_centers(work_center_status);
CREATE INDEX idx_wc_site ON work_centers(site_id);

COMMENT ON TABLE work_centers IS 'Production work centers with capacity and costing information';

-- Work Center Queues (for scheduling)
CREATE TABLE IF NOT EXISTS work_center_queues (
  queue_id VARCHAR(20) PRIMARY KEY,
  work_center_id VARCHAR(20) NOT NULL REFERENCES work_centers(work_center_id) ON DELETE CASCADE,

  -- Current Load
  current_orders INTEGER DEFAULT 0,
  current_hours DECIMAL(10,2) DEFAULT 0,
  queued_orders INTEGER DEFAULT 0,
  queued_hours DECIMAL(10,2) DEFAULT 0,

  -- Performance Metrics
  average_wait_time_hours DECIMAL(10,2),
  average_cycle_time_hours DECIMAL(10,2),
  on_time_performance_percent DECIMAL(5,2),

  -- Updated At
  last_calculated_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_work_center_queue UNIQUE(work_center_id)
);

CREATE INDEX idx_wcq_work_center ON work_center_queues(work_center_id);

COMMENT ON TABLE work_center_queues IS 'Work center load and queue information for scheduling';

-- ============================================================================
-- TABLES: MANUFACTURING ROUTINGS
-- ============================================================================

-- Routing Headers
-- Define the manufacturing process for items
CREATE TABLE IF NOT EXISTS routings (
  routing_id VARCHAR(20) PRIMARY KEY,
  routing_number VARCHAR(50) UNIQUE NOT NULL,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,

  -- Item
  sku VARCHAR(100) NOT NULL,
  item_description VARCHAR(255),

  -- Routing Details
  routing_name VARCHAR(255) NOT NULL,
  routing_type VARCHAR(50) DEFAULT 'STANDARD', -- STANDARD, ALTERNATE, REWORK, DISASSEMBLY
  routing_status routing_status NOT NULL DEFAULT 'DRAFT',

  -- Version Control
  version_number INTEGER DEFAULT 1,
  effective_date DATE,
  expiration_date DATE,
  supersedes_routing_id VARCHAR(20) REFERENCES routings(routing_id),

  -- Production Data
  standard_lot_size DECIMAL(12,3) DEFAULT 1,
  scrap_percent DECIMAL(5,2) DEFAULT 0,
  yield_percent DECIMAL(5,2) DEFAULT 100,

  -- Costing
  standard_labor_hours DECIMAL(10,2),
  standard_machine_hours DECIMAL(10,2),
  standard_cost DECIMAL(12,2),

  -- Approval
  approved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  engineered_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  engineered_at TIMESTAMP,

  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_routing_dates CHECK (
    expiration_date IS NULL OR effective_date IS NULL OR expiration_date >= effective_date
  ),
  CONSTRAINT chk_routing_yield CHECK (yield_percent > 0 AND yield_percent <= 100)
);

CREATE INDEX idx_routing_sku ON routings(sku);
CREATE INDEX idx_routing_entity ON routings(entity_id);
CREATE INDEX idx_routing_status ON routings(routing_status);

COMMENT ON TABLE routings IS 'Manufacturing routings defining production processes';

-- Routing Operations
-- Individual operations within a routing
CREATE TABLE IF NOT EXISTS routing_operations (
  operation_id VARCHAR(20) PRIMARY KEY,
  routing_id VARCHAR(20) NOT NULL REFERENCES routings(routing_id) ON DELETE CASCADE,

  -- Operation Details
  operation_number INTEGER NOT NULL,
  operation_code VARCHAR(50),
  operation_name VARCHAR(255) NOT NULL,
  operation_type operation_type NOT NULL DEFAULT 'MACHINING',
  description TEXT,

  -- Work Center
  work_center_id VARCHAR(20) REFERENCES work_centers(work_center_id) ON DELETE SET NULL,
  work_center_description VARCHAR(255),

  -- Sequence
  sequence INTEGER,
  sequence_step VARCHAR(20), -- e.g., 0010, 0020
  send_ahead_quantity DECIMAL(12,3), -- Can send to next operation without completing all
  overlap_percent DECIMAL(5,2), -- Percent overlap with previous operation

  -- Times
  setup_hours DECIMAL(10,2) DEFAULT 0,
  run_hours_per_unit DECIMAL(10,2) NOT NULL,
  fixed_hours DECIMAL(10,2) DEFAULT 0,
  labor_hours_per_unit DECIMAL(10,2),
  machine_hours_per_unit DECIMAL(10,2),

  -- Capacity
  minimum_crew_size INTEGER DEFAULT 1,
  maximum_crew_size INTEGER DEFAULT 1,

  -- Costing
  labor_burden_rate DECIMAL(5,2),
  machine_burden_rate DECIMAL(5,2),

  -- Quality
  inspection_required BOOLEAN DEFAULT false,
  inspection_percent DECIMAL(5,2), -- Percent of units to inspect
  control_point VARCHAR(50), -- Control point identifier

  -- Resources
  tooling_required JSONB,
  fixtures_required JSONB,

  -- Subcontracting
  outside_process_vendor_id VARCHAR(20),
  outside_process_cost DECIMAL(12,2),
  outside_process_lead_time_days INTEGER,

  -- Instructions
  standard_operations TEXT,
  operator_instructions TEXT,
  setup_instructions TEXT,

  -- Backflush
  backflush_report_point BOOLEAN DEFAULT false,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_operation_times CHECK (
    setup_hours >= 0 AND
    run_hours_per_unit >= 0 AND
    fixed_hours >= 0
  ),
  CONSTRAINT chk_crew_size CHECK (
    minimum_crew_size > 0 AND
    maximum_crew_size >= minimum_crew_size
  )
);

CREATE INDEX idx_ro_routing ON routing_operations(routing_id);
CREATE INDEX idx_ro_work_center ON routing_operations(work_center_id);
CREATE INDEX idx_ro_sequence ON routing_operations(routing_id, sequence_step);

COMMENT ON TABLE routing_operations IS 'Routing operations defining each step in the manufacturing process';

-- Bill of Materials (BOM) for Routing
CREATE TABLE IF NOT EXISTS routing_bom (
  bom_component_id VARCHAR(20) PRIMARY KEY,
  routing_id VARCHAR(20) NOT NULL REFERENCES routings(routing_id) ON DELETE CASCADE,
  operation_id VARCHAR(20) REFERENCES routing_operations(operation_id) ON DELETE SET NULL,

  -- Component
  component_sku VARCHAR(100) NOT NULL,
  component_description VARCHAR(255),
  component_type VARCHAR(50) DEFAULT 'MATERIAL', -- MATERIAL, SUBASSEMBLY, PHANTOM, REFERENCE

  -- Quantity
  quantity_per_assembly DECIMAL(12,4) NOT NULL,
  scrap_percent DECIMAL(5,2) DEFAULT 0,
  effective_quantity DECIMAL(12,4) GENERATED ALWAYS AS (
    quantity_per_assembly * (1 + (scrap_percent / 100.0))
  ) STORED,

  -- Substitution
  substitute_sku VARCHAR(100),
  substitute_priority INTEGER,

  -- Options
  optional BOOLEAN DEFAULT false,
  phantom BOOLEAN DEFAULT false, -- Phantom BOM (virtual assembly)

  -- Sourcing
  sourcing_rule VARCHAR(50), -- MAKE, BUY, MAKE_OR_BUY
  vendor_id VARCHAR(20),

  -- Costing
  component_cost DECIMAL(12,2),
  overhead_percent DECIMAL(5,2),

  -- Effectivity
  effective_from_date DATE,
  effective_to_date DATE,
  effectivity_quantity DECIMAL(12,3),

  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_bom_quantity CHECK (quantity_per_assembly > 0)
);

CREATE INDEX idx_rb_routing ON routing_bom(routing_id);
CREATE INDEX idx_rb_operation ON routing_bom(operation_id);
CREATE INDEX idx_rb_component ON routing_bom(component_sku);

COMMENT ON TABLE routing_bom IS 'Bill of materials for manufacturing routings';

-- ============================================================================
-- TABLES: MASTER PRODUCTION SCHEDULE (MPS)
-- ============================================================================

-- MPS Periods
-- Time buckets for MPS planning
CREATE TABLE IF NOT EXISTS mps_periods (
  period_id VARCHAR(20) PRIMARY KEY,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,

  -- Period Definition
  period_number INTEGER NOT NULL,
  period_type VARCHAR(20) NOT NULL, -- DAILY, WEEKLY, MONTHLY
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- Status
  is_closed BOOLEAN DEFAULT false,
  is_frozen BOOLEAN DEFAULT false,
  frozen_through DATE,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_mps_dates CHECK (end_date > start_date),
  CONSTRAINT uq_mps_period UNIQUE(entity_id, period_number)
);

CREATE INDEX idx_mps_entity ON mps_periods(entity_id);
CREATE INDEX idx_mps_dates ON mps_periods(start_date, end_date);

COMMENT ON TABLE mps_periods IS 'Master Production Schedule time periods';

-- MPS Items
-- Planned production for items
CREATE TABLE IF NOT EXISTS mps_items (
  mps_item_id VARCHAR(20) PRIMARY KEY,
  period_id VARCHAR(20) NOT NULL REFERENCES mps_periods(period_id) ON DELETE CASCADE,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,

  -- Item
  sku VARCHAR(100) NOT NULL,
  item_description VARCHAR(255),

  -- Quantities
  forecast_quantity DECIMAL(12,3) DEFAULT 0,
  customer_orders_quantity DECIMAL(12,3) DEFAULT 0,
  projected_available DECIMAL(12,3) DEFAULT 0,
  planned_production_quantity DECIMAL(12,3) DEFAULT 0,
  available_to_promise DECIMAL(12,3) DEFAULT 0,

  -- Planning
 mps_status mps_status NOT NULL DEFAULT 'DRAFT',
  planning_time_fence DATE,
  demand_time_fence DATE,

  -- Dates
  order_due_date DATE,
  order_start_date DATE,

  -- Production Order (when released)
  production_order_id VARCHAR(20),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_mps_item UNIQUE(period_id, sku)
);

CREATE INDEX idx_mpsi_period ON mps_items(period_id);
CREATE INDEX idx_mpsi_sku ON mps_items(sku);
CREATE INDEX idx_mpsi_status ON mps_items(mps_status);

COMMENT ON TABLE mps_items IS 'Master Production Schedule items by period';

-- ============================================================================
-- TABLES: MATERIAL REQUIREMENTS PLANNING (MRP)
-- ============================================================================

-- MRP Parameters
-- System parameters for MRP calculation
CREATE TABLE IF NOT EXISTS mrp_parameters (
  parameter_id VARCHAR(20) PRIMARY KEY,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,

  -- Planning Horizon
  planning_horizon_days INTEGER DEFAULT 365,
  planning_time_fence_days INTEGER DEFAULT 30,
  release_time_fence_days INTEGER DEFAULT 7,

  -- Lot Sizing
  lot_sizing_rule VARCHAR(50) DEFAULT 'FIXED_ORDER_QUANTITY', -- FIXED_ORDER_QUANTITY, LOT_FOR_LOT, PERIOD_ORDER_QUANTITY, EOQ
  fixed_order_quantity DECIMAL(12,3),
  minimum_order_quantity DECIMAL(12,3),
  maximum_order_quantity DECIMAL(12,3),
  order_multiple DECIMAL(12,3),

  -- Safety Stock
  safety_stock_rule VARCHAR(50) DEFAULT 'FIXED', -- FIXED, DAYS_OF_SUPPLY, PERCENT_OF_DEMAND
  safety_stock_days INTEGER,
  safety_stock_percent DECIMAL(5,2),

  -- Scrap and Yield
  include_scrap_in_calculation BOOLEAN DEFAULT true,
  component_yield_percent DECIMAL(5,2) DEFAULT 100,

  -- Action Messages
  create_planned_orders BOOLEAN DEFAULT true,
  reschedule_orders BOOLEAN DEFAULT true,
  cancel_orders BOOLEAN DEFAULT true,

  -- Action Message Thresholds
  reschedule_in_days_threshold INTEGER DEFAULT 3,
  reschedule_out_days_threshold INTEGER DEFAULT 3,

  -- Cutoff
  mrp_cutoff_days INTEGER DEFAULT 365,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mrp_params_entity ON mrp_parameters(entity_id);

COMMENT ON TABLE mrp_parameters IS 'MRP calculation parameters by entity';

-- MRP Plans
-- Header for MRP calculation runs
CREATE TABLE IF NOT EXISTS mrp_plans (
  plan_id VARCHAR(20) PRIMARY KEY,
  plan_number VARCHAR(50) UNIQUE NOT NULL,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,

  -- Plan Details
  plan_name VARCHAR(255) NOT NULL,
  plan_type VARCHAR(50) DEFAULT 'REGENERATIVE', -- REGENERATIVE, NET_CHANGE
  plan_status mrp_plan_status NOT NULL DEFAULT 'DRAFT',

  -- Parameters
  parameter_id VARCHAR(20) REFERENCES mrp_parameters(parameter_id) ON DELETE SET NULL,

  -- Planning Dates
  plan_date DATE NOT NULL DEFAULT CURRENT_DATE,
  plan_start_date DATE NOT NULL,
  plan_end_date DATE NOT NULL,

  -- Statistics
  items_planned INTEGER DEFAULT 0,
  orders_created INTEGER DEFAULT 0,
  orders_modified INTEGER DEFAULT 0,
  orders_cancelled INTEGER DEFAULT 0,
  action_messages_generated INTEGER DEFAULT 0,
  calculation_duration_seconds INTEGER,

  -- Processing
  started_at TIMESTAMP,
  completed_at TIMESTAMP,
  error_message TEXT,

  -- User
  created_by VARCHAR(20) NOT NULL REFERENCES users(user_id),
  approved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMP,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mrp_entity ON mrp_plans(entity_id);
CREATE INDEX idx_mrp_status ON mrp_plans(plan_status);
CREATE INDEX idx_mrp_date ON mrp_plans(plan_date);

COMMENT ON TABLE mrp_plans IS 'MRP calculation plans';

-- MRP Plan Details
-- Detailed MRP results for each item
CREATE TABLE IF NOT EXISTS mrp_plan_details (
  detail_id VARCHAR(20) PRIMARY KEY,
  plan_id VARCHAR(20) NOT NULL REFERENCES mrp_plans(plan_id) ON DELETE CASCADE,

  -- Item
  sku VARCHAR(100) NOT NULL,
  item_description VARCHAR(255),
  item_type VARCHAR(50), -- PURCHASED, MANUFACTURED, PHANTOM, OUTSIDE_PROCESS

  -- Current Status
  on_hand_quantity DECIMAL(12,3) DEFAULT 0,
  on_order_quantity DECIMAL(12,3) DEFAULT 0,
  allocated_quantity DECIMAL(12,3) DEFAULT 0,
  available_quantity DECIMAL(12,3) DEFAULT 0,

  -- Planning Parameters
  lead_time_days INTEGER DEFAULT 0,
  safety_stock_quantity DECIMAL(12,3) DEFAULT 0,
  order_policy VARCHAR(50),
  order_quantity DECIMAL(12,3),
  minimum_order_quantity DECIMAL(12,3),
  maximum_order_quantity DECIMAL(12,3),

  -- Results
  gross_requirements DECIMAL(12,3) DEFAULT 0,
  scheduled_receipts DECIMAL(12,3) DEFAULT 0,
  planned_order_releases DECIMAL(12,3) DEFAULT 0,
  planned_order_receipts DECIMAL(12,3) DEFAULT 0,
  projected_available DECIMAL(12,3) DEFAULT 0,

  -- Exception Messages
  action_message_count INTEGER DEFAULT 0,
  exception_message TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_mrp_detail UNIQUE(plan_id, sku)
);

CREATE INDEX idx_mrp_detail_plan ON mrp_plan_details(plan_id);
CREATE INDEX idx_mrp_detail_sku ON mrp_plan_details(sku);

COMMENT ON TABLE mrp_plan_details IS 'Detailed MRP calculations by item';

-- MRP Action Messages
-- Suggested actions from MRP
CREATE TABLE IF NOT EXISTS mrp_action_messages (
  action_id VARCHAR(20) PRIMARY KEY,
  plan_id VARCHAR(20) NOT NULL REFERENCES mrp_plans(plan_id) ON DELETE CASCADE,
  detail_id VARCHAR(20) REFERENCES mrp_plan_details(detail_id) ON DELETE SET NULL,

  -- Item
  sku VARCHAR(100) NOT NULL,

  -- Action
  action_type mrp_action_type NOT NULL,
  action_priority INTEGER DEFAULT 5, -- 1=Highest, 10=Lowest

  -- Order Reference
  order_type VARCHAR(20), -- PURCHASE_ORDER, PRODUCTION_ORDER, TRANSFER_ORDER
  order_id VARCHAR(20),
  order_number VARCHAR(50),

  -- Quantities and Dates
  current_quantity DECIMAL(12,3),
  current_date DATE,
  suggested_quantity DECIMAL(12,3),
  suggested_date DATE,

  -- Status
  is_reviewed BOOLEAN DEFAULT false,
  is_implemented BOOLEAN DEFAULT false,
  implemented_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  implemented_at TIMESTAMP,
  implementation_notes TEXT,

  -- Due Date (when action must be taken)
  action_due_date DATE,

  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mrp_action_plan ON mrp_action_messages(plan_id);
CREATE INDEX idx_mrp_action_sku ON mrp_action_messages(sku);
CREATE INDEX idx_mrp_action_type ON mrp_action_messages(action_type);
CREATE INDEX idx_mrp_action_status ON mrp_action_messages(is_reviewed, is_implemented);

COMMENT ON TABLE mrp_action_messages IS 'MRP action messages for planning';

-- ============================================================================
-- TABLES: SHOP FLOOR CONTROL
-- ============================================================================

-- Production Orders
-- Main production order header
CREATE TABLE IF NOT EXISTS production_orders (
  order_id VARCHAR(20) PRIMARY KEY,
  order_number VARCHAR(50) UNIQUE NOT NULL,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,

  -- Item
  sku VARCHAR(100) NOT NULL,
  item_description VARCHAR(255),

  -- Routing
  routing_id VARCHAR(20) REFERENCES routings(routing_id) ON DELETE SET NULL,

  -- Order Type
  order_type VARCHAR(50) DEFAULT 'MAKE_TO_STOCK', -- MAKE_TO_STOCK, MAKE_TO_ORDER, REWORK, DISASSEMBLY

  -- Quantities
  quantity_ordered DECIMAL(12,3) NOT NULL,
  quantity_completed DECIMAL(12,3) DEFAULT 0,
  quantity_scrapped DECIMAL(12,3) DEFAULT 0,
  quantity_rejected DECIMAL(12,3) DEFAULT 0,
  quantity_remaining DECIMAL(12,3) GENERATED ALWAYS AS (quantity_ordered - quantity_completed - quantity_scrapped) STORED,

  -- Dates
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  actual_start_date DATE,
  actual_finish_date,

  -- Status
  order_status production_order_status NOT NULL DEFAULT 'DRAFT',
  progress_percent DECIMAL(5,2) DEFAULT 0,

  -- Costing
  estimated_labor_cost DECIMAL(12,2) DEFAULT 0,
  estimated_material_cost DECIMAL(12,2) DEFAULT 0,
  estimated_overhead_cost DECIMAL(12,2) DEFAULT 0,
  estimated_total_cost DECIMAL(12,2) GENERATED ALWAYS AS (
    estimated_labor_cost + estimated_material_cost + estimated_overhead_cost
  ) STORED,

  actual_labor_cost DECIMAL(12,2) DEFAULT 0,
  actual_material_cost DECIMAL(12,2) DEFAULT 0,
  actual_overhead_cost DECIMAL(12,2) DEFAULT 0,
  actual_total_cost DECIMAL(12,2) GENERATED ALWAYS AS (
    actual_labor_cost + actual_material_cost + actual_overhead_cost
  ) STORED,

  -- Reference
  customer_id VARCHAR(20),
  sales_order_id VARCHAR(20),
  sales_order_line_id VARCHAR(20),
  job_number VARCHAR(50),

  -- Approval
  created_by VARCHAR(20) NOT NULL REFERENCES users(user_id),
  released_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  released_at TIMESTAMP,
  closed_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  closed_at TIMESTAMP,

  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_po_quantity CHECK (quantity_ordered > 0),
  CONSTRAINT chk_po_dates CHECK (due_date >= start_date),
  CONSTRAINT chk_po_status_dates CHECK (
    (order_status NOT IN ('IN_PROGRESS', 'COMPLETED', 'CLOSED')) OR
    (actual_start_date IS NOT NULL)
  )
);

CREATE INDEX idx_po_entity ON production_orders(entity_id);
CREATE INDEX idx_po_sku ON production_orders(sku);
CREATE INDEX idx_po_status ON production_orders(order_status);
CREATE INDEX idx_po_dates ON production_orders(start_date, due_date);
CREATE INDEX idx_po_sales_order ON production_orders(sales_order_id);

COMMENT ON TABLE production_orders IS 'Production orders for manufacturing';

-- Production Order Operations (Shop Floor)
-- Detailed tracking of operations
CREATE TABLE IF NOT EXISTS production_order_operations (
  operation_id VARCHAR(20) PRIMARY KEY,
  production_order_id VARCHAR(20) NOT NULL REFERENCES production_orders(order_id) ON DELETE CASCADE,
  routing_operation_id VARCHAR(20) REFERENCES routing_operations(operation_id) ON DELETE SET NULL,

  -- Operation Details
  operation_number INTEGER NOT NULL,
  operation_name VARCHAR(255) NOT NULL,
  operation_type operation_type NOT NULL DEFAULT 'MACHINING',

  -- Work Center
  work_center_id VARCHAR(20) REFERENCES work_centers(work_center_id) ON DELETE SET NULL,

  -- Status
  operation_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, IN_PROGRESS, COMPLETED, SKIPPED
  sequence_step VARCHAR(20),

  -- Quantities
  quantity_completed DECIMAL(12,3) DEFAULT 0,
  quantity_scrapped DECIMAL(12,3) DEFAULT 0,
  quantity_rejected DECIMAL(12,3) DEFAULT 0,

  -- Times
  estimated_setup_hours DECIMAL(10,2) DEFAULT 0,
  estimated_run_hours DECIMAL(10,2) DEFAULT 0,
  estimated_total_hours DECIMAL(10,2) GENERATED ALWAYS AS (
    estimated_setup_hours + estimated_run_hours
  ) STORED,

  actual_setup_hours DECIMAL(10,2) DEFAULT 0,
  actual_run_hours DECIMAL(10,2) DEFAULT 0,
  actual_total_hours DECIMAL(10,2) GENERATED ALWAYS AS (
    actual_setup_hours + actual_run_hours
  ) STORED,

  -- Progress
  progress_percent DECIMAL(5,2) DEFAULT 0,

  -- Dates
  scheduled_start_date DATE,
  scheduled_finish_date DATE,
  actual_start_date TIMESTAMP,
  actual_finish_date TIMESTAMP,

  -- Crew
  crew_size INTEGER DEFAULT 1,
  assigned_to JSONB, -- Array of user IDs

  -- Costs
  actual_labor_cost DECIMAL(12,2) DEFAULT 0,
  actual_machine_cost DECIMAL(12,2) DEFAULT 0,

  -- Quality
  inspection_required BOOLEAN DEFAULT false,
  inspection_completed BOOLEAN DEFAULT false,
  inspection_result VARCHAR(50), -- PASSED, FAILED, PENDING

  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_poo_quantity CHECK (
    quantity_completed >= 0 AND
    quantity_scrapped >= 0
  )
);

CREATE INDEX idx_poo_order ON production_order_operations(production_order_id);
CREATE INDEX idx_poo_work_center ON production_order_operations(work_center_id);
CREATE INDEX idx_poo_status ON production_order_operations(operation_status);

COMMENT ON TABLE production_order_operations IS 'Production order operations for shop floor tracking';

-- Shop Floor Transactions
-- Real-time shop floor transactions
CREATE TABLE IF NOT EXISTS shop_floor_transactions (
  transaction_id VARCHAR(20) PRIMARY KEY,
  production_order_id VARCHAR(20) NOT NULL REFERENCES production_orders(order_id) ON DELETE CASCADE,
  operation_id VARCHAR(20) NOT NULL REFERENCES production_order_operations(operation_id) ON DELETE CASCADE,

  -- Transaction Details
  transaction_type shop_floor_transaction_type NOT NULL,
  transaction_date TIMESTAMP NOT NULL DEFAULT NOW(),

  -- User
  user_id VARCHAR(20) NOT NULL REFERENCES users(user_id),
  work_center_id VARCHAR(20) REFERENCES work_centers(work_center_id) ON DELETE SET NULL,

  -- Quantity
  transaction_quantity DECIMAL(12,3) DEFAULT 0,
  scrap_quantity DECIMAL(12,3) DEFAULT 0,
  rework_quantity DECIMAL(12,3) DEFAULT 0,

  -- Time
  hours_reported DECIMAL(10,2) DEFAULT 0,
  labor_cost DECIMAL(12,2) DEFAULT 0,
  machine_cost DECIMAL(12,2) DEFAULT 0,

  -- Movement
  from_work_center_id VARCHAR(20) REFERENCES work_centers(work_center_id) ON DELETE SET NULL,
  to_work_center_id VARCHAR(20) REFERENCES work_centers(work_center_id) ON DELETE SET NULL,

  -- Quality
  lot_number VARCHAR(100),
  serial_numbers JSONB,

  -- Notes
  notes TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sft_order ON shop_floor_transactions(production_order_id);
CREATE INDEX idx_sft_operation ON shop_floor_transactions(operation_id);
CREATE INDEX idx_sft_type ON shop_floor_transactions(transaction_type);
CREATE INDEX idx_sft_date ON shop_floor_transactions(transaction_date);
CREATE INDEX idx_sft_user ON shop_floor_transactions(user_id);

COMMENT ON TABLE shop_floor_transactions IS 'Shop floor transactions for real-time production tracking';

-- ============================================================================
-- TABLES: PRODUCTION QUALITY MANAGEMENT
-- ============================================================================

-- Production Inspections
-- Quality inspections for production
CREATE TABLE IF NOT EXISTS production_inspections (
  inspection_id VARCHAR(20) PRIMARY KEY,
  production_order_id VARCHAR(20) REFERENCES production_orders(order_id) ON DELETE SET NULL,
  operation_id VARCHAR(20) REFERENCES production_order_operations(operation_id) ON DELETE SET NULL,

  -- Inspection Details
  inspection_number VARCHAR(50) UNIQUE NOT NULL,
  inspection_type VARCHAR(50) NOT NULL, -- FIRST_ARTICLE, IN_PROCESS, FINAL, SETUP
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Item
  sku VARCHAR(100) NOT NULL,
  lot_number VARCHAR(100),

  -- Quantities
  quantity_inspected DECIMAL(12,3) NOT NULL,
  quantity_accepted DECIMAL(12,3) DEFAULT 0,
  quantity_rejected DECIMAL(12,3) DEFAULT 0,
  quantity_reworked DECIMAL(12,3) DEFAULT 0,

  -- Inspector
  inspected_by VARCHAR(20) NOT NULL REFERENCES users(user_id),
  inspected_at TIMESTAMP,
  approved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMP,

  -- Results
  inspection_result VARCHAR(20) NOT NULL, -- PASSED, FAILED, CONDITIONAL_PASSED
  overall_grade VARCHAR(20), -- A, B, C, D, F

  -- Defects Found
  defects_found INTEGER DEFAULT 0,
  defect_details JSONB,

  -- Disposition
  disposition VARCHAR(50), -- ACCEPT, REWORK, SCRAP, QUARANTINE
  disposition_notes TEXT,

  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_inspection_qty CHECK (quantity_inspected > 0)
);

CREATE INDEX idx_pi_order ON production_inspections(production_order_id);
CREATE INDEX idx_pi_operation ON production_inspections(operation_id);
CREATE INDEX idx_pi_sku ON production_inspections(sku);
CREATE INDEX idx_pi_date ON production_inspections(inspection_date);

COMMENT ON TABLE production_inspections IS 'Quality inspections for production orders';

-- Production Defects
-- Detailed defect tracking
CREATE TABLE IF NOT EXISTS production_defects (
  defect_id VARCHAR(20) PRIMARY KEY,
  inspection_id VARCHAR(20) REFERENCES production_inspections(inspection_id) ON DELETE SET NULL,
  production_order_id VARCHAR(20) REFERENCES production_orders(order_id) ON DELETE SET NULL,
  operation_id VARCHAR(20) REFERENCES production_order_operations(operation_id) ON DELETE SET NULL,

  -- Defect Details
  defect_type defect_type NOT NULL,
  defect_severity defect_severity NOT NULL,
  defect_code VARCHAR(50),
  defect_description TEXT NOT NULL,

  -- Item
  sku VARCHAR(100) NOT NULL,
  lot_number VARCHAR(100),
  serial_number VARCHAR(100),

  -- Quantity
  defect_quantity DECIMAL(12,3) DEFAULT 1,

  -- Cost Impact
  labor_cost_to_fix DECIMAL(12,2) DEFAULT 0,
  material_cost_to_fix DECIMAL(12,2) DEFAULT 0,
  total_cost_to_fix DECIMAL(12,2) GENERATED ALWAYS AS (
    labor_cost_to_fix + material_cost_to_fix
  ) STORED,

  -- Root Cause
  root_cause_category VARCHAR(50), -- MATERIAL, LABOR, MACHINE, METHOD, DESIGN, ENVIRONMENT
  root_cause_description TEXT,

  -- Disposition
  disposition defect_disposition NOT NULL,
  disposition_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  disposition_at TIMESTAMP,

  -- Correction
  corrective_action TEXT,
  corrective_action_completed BOOLEAN DEFAULT false,
  corrective_action_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  corrective_action_at TIMESTAMP,

  -- Vendor (if material defect)
  vendor_id VARCHAR(20),
  vendor_notified BOOLEAN DEFAULT false,
  vendor_claim_amount DECIMAL(12,2) DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX idx_pd_inspection ON production_defects(inspection_id);
CREATE INDEX idx_pd_order ON production_defects(production_order_id);
CREATE INDEX idx_pd_type ON production_defects(defect_type);
CREATE INDEX idx_pd_severity ON production_defects(defect_severity);
CREATE INDEX idx_pd_sku ON production_defects(sku);

COMMENT ON TABLE production_defects IS 'Detailed defect tracking for production';

-- ============================================================================
-- TABLES: CAPACITY PLANNING
-- ============================================================================

-- Capacity Plans
-- Capacity planning by work center and period
CREATE TABLE IF NOT EXISTS capacity_plans (
  plan_id VARCHAR(20) PRIMARY KEY,
  plan_number VARCHAR(50) UNIQUE NOT NULL,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,

  -- Plan Details
  plan_name VARCHAR(255) NOT NULL,
  plan_type VARCHAR(50) DEFAULT 'DETAILED', -- ROUGH_CUT, DETAILED
  plan_status capacity_plan_status NOT NULL DEFAULT 'DRAFT',

  -- Planning Period
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,

  -- User
  created_by VARCHAR(20) NOT NULL REFERENCES users(user_id),
  approved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMP,

  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_cp_entity ON capacity_plans(entity_id);
CREATE INDEX idx_cp_status ON capacity_plans(plan_status);
CREATE INDEX idx_cp_dates ON capacity_plans(start_date, end_date);

COMMENT ON TABLE capacity_plans IS 'Capacity planning headers';

-- Capacity Plan Details
-- Work center capacity details
CREATE TABLE IF NOT EXISTS capacity_plan_details (
  detail_id VARCHAR(20) PRIMARY KEY,
  plan_id VARCHAR(20) NOT NULL REFERENCES capacity_plans(plan_id) ON DELETE CASCADE,
  work_center_id VARCHAR(20) NOT NULL REFERENCES work_centers(work_center_id) ON DELETE SET NULL,

  -- Period
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,

  -- Available Capacity
  available_hours DECIMAL(10,2) DEFAULT 0,
  available_units DECIMAL(12,3) DEFAULT 0,

  -- Planned Load
  planned_hours DECIMAL(10,2) DEFAULT 0,
  planned_units DECIMAL(12,3) DEFAULT 0,

  -- Actual Load (if tracking actuals)
  actual_hours DECIMAL(10,2) DEFAULT 0,
  actual_units DECIMAL(12,3) DEFAULT 0,

  -- Utilization
  utilization_percent DECIMAL(5,2) GENERATED ALWAYS AS (
    CASE WHEN available_hours > 0
    THEN (planned_hours / available_hours) * 100
    ELSE NULL END
  ) STORED,

  -- Over/Under Capacity
  over_under_hours DECIMAL(10,2) GENERATED ALWAYS AS (
    available_hours - planned_hours
  ) STORED,

  -- Exceptions
  is_overloaded BOOLEAN DEFAULT false,
  overload_quantity DECIMAL(10,2) DEFAULT 0,
  is_underloaded BOOLEAN DEFAULT false,
  underload_quantity DECIMAL(10,2) DEFAULT 0,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_capacity_detail UNIQUE(plan_id, work_center_id, period_start_date)
);

CREATE INDEX idx_cpd_plan ON capacity_plan_details(plan_id);
CREATE INDEX idx_cpd_work_center ON capacity_plan_details(work_center_id);
CREATE INDEX idx_cpd_dates ON capacity_plan_details(period_start_date, period_end_date);
CREATE INDEX idx_cpd_overload ON capacity_plan_details(is_overloaded);

COMMENT ON TABLE capacity_plan_details IS 'Capacity plan details by work center and period';

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Work Center Load Summary
CREATE OR REPLACE VIEW v_work_center_load AS
SELECT
  wc.work_center_id,
  wc.work_center_code,
  wc.work_center_name,
  wc.department,
  wc.available_capacity,
  wcq.current_orders,
  wcq.current_hours,
  wcq.queued_orders,
  wcq.queued_hours,
  (wcq.current_hours + wcq.queued_hours) AS total_load_hours,
  CASE WHEN wc.available_capacity > 0
    THEN ((wcq.current_hours + wcq.queued_hours) / wc.available_capacity) * 100
    ELSE NULL END AS utilization_percent
FROM work_centers wc
LEFT JOIN work_center_queues wcq ON wcq.work_center_id = wc.work_center_id
WHERE wc.work_center_status = 'ACTIVE';

COMMENT ON VIEW v_work_center_load IS 'Work center load summary with utilization';

-- View: Production Orders Status Summary
CREATE OR REPLACE VIEW v_production_orders_summary AS
SELECT
  po.order_id,
  po.order_number,
  po.sku,
  po.item_description,
  po.order_type,
  po.quantity_ordered,
  po.quantity_completed,
  po.quantity_remaining,
  po.progress_percent,
  po.order_status,
  po.start_date,
  po.due_date,
  po.actual_start_date,
  po.actual_finish_date,
  po.estimated_total_cost,
  po.actual_total_cost,
  COUNT(DISTINCT poo.operation_id) FILTER (WHERE poo.operation_status != 'COMPLETED') AS pending_operations,
  COUNT(DISTINCT poo.operation_id) FILTER (WHERE poo.operation_status = 'COMPLETED') AS completed_operations,
  COUNT(DISTINCT poo.operation_id) AS total_operations
FROM production_orders po
LEFT JOIN production_order_operations poo ON poo.production_order_id = po.order_id
GROUP BY po.order_id;

COMMENT ON VIEW v_production_orders_summary IS 'Production orders with operation summary';

-- View: MRP Action Messages by Priority
CREATE OR REPLACE VIEW v_mrp_action_priority AS
SELECT
  am.action_id,
  am.plan_id,
  am.sku,
  am.action_type,
  am.action_priority,
  am.order_number,
  am.current_quantity,
  am.current_date,
  am.suggested_quantity,
  am.suggested_date,
  am.action_due_date,
  am.is_reviewed,
  am.is_implemented,
  mp.plan_number,
  mp.plan_date
FROM mrp_action_messages am
JOIN mrp_plans mp ON mp.plan_id = am.plan_id
WHERE am.plan_status IN ('COMPLETED', 'APPROVED', 'RELEASED')
ORDER BY am.action_priority ASC, am.action_due_date ASC;

COMMENT ON VIEW v_mrp_action_priority IS 'MRP action messages sorted by priority';

-- View: Shop Floor Active Jobs
CREATE OR REPLACE VIEW v_shop_floor_active_jobs AS
SELECT
  po.order_id,
  po.order_number,
  po.sku,
  poo.operation_id,
  poo.operation_number,
  poo.operation_name,
  wc.work_center_code,
  wc.work_center_name,
  poo.operation_status,
  poo.quantity_completed,
  poo.actual_start_date,
  u.email as assigned_to,
  CASE
    WHEN poo.actual_start_date IS NULL THEN 'NOT_STARTED'
    WHEN poo.actual_finish_date IS NOT NULL THEN 'COMPLETED'
    WHEN CURRENT_TIMESTAMP - poo.actual_start_date > INTERVAL '8 hours' THEN 'OVERTIME'
    ELSE 'IN_PROGRESS'
  END AS time_status
FROM production_orders po
JOIN production_order_operations poo ON poo.production_order_id = po.order_id
LEFT JOIN work_centers wc ON wc.work_center_id = poo.work_center_id
LEFT JOIN jsonb_array_elements_text(poo.assigned_to) WITH ORDINALITY AS t(user_id, ord)
  ON true
LEFT JOIN users u ON u.user_id = t.user_id
WHERE po.order_status IN ('RELEASED', 'IN_PROGRESS')
  AND poo.operation_status NOT IN ('COMPLETED', 'SKIPPED')
ORDER BY poo.actual_start_date ASC NULLS LAST;

COMMENT ON VIEW v_shop_floor_active_jobs IS 'Active jobs on shop floor';

-- View: Production Quality Summary
CREATE OR REPLACE VIEW v_production_quality_summary AS
SELECT
  po.order_id,
  po.order_number,
  po.sku,
  COUNT(DISTINCT pinsp.inspection_id) AS total_inspections,
  COUNT(DISTINCT pinsp.inspection_id) FILTER (WHERE pinsp.inspection_result = 'PASSED') AS passed_inspections,
  COUNT(DISTINCT pinsp.inspection_id) FILTER (WHERE pinsp.inspection_result = 'FAILED') AS failed_inspections,
  SUM(pinsp.quantity_inspected) AS total_inspected_qty,
  SUM(pinsp.quantity_accepted) AS total_accepted_qty,
  SUM(pinsp.quantity_rejected) AS total_rejected_qty,
  SUM(pinsp.quantity_reworked) AS total_reworked_qty,
  CASE WHEN SUM(pinsp.quantity_inspected) > 0
    THEN (SUM(pinsp.quantity_accepted)::DECIMAL / SUM(pinsp.quantity_inspected)) * 100
    ELSE NULL END AS first_pass_yield_percent,
  SUM(pd.defect_quantity) AS total_defects
FROM production_orders po
LEFT JOIN production_inspections pinsp ON pinsp.production_order_id = po.order_id
LEFT JOIN production_defects pd ON pd.inspection_id = pinsp.inspection_id
GROUP BY po.order_id, po.order_number, po.sku;

COMMENT ON VIEW v_production_quality_summary IS 'Production quality summary by order';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant appropriate permissions (adjust based on your database user)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- ============================================================================
-- END OF MIGRATION 054
-- ============================================================================
