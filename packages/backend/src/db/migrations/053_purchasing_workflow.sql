-- ============================================================================
-- Migration 053: Purchasing Workflow Enhancement
-- Phase 3: Purchasing Module Enhancement (40% -> 100%)
--
-- This migration adds:
-- 1. Purchase Requisitions - Internal request to buy goods/services
-- 2. RFQ (Request for Quotation) - Vendor quotation management
-- 3. Enhanced Purchase Orders - Link to requisitions and RFQs
-- 4. Three-Way Matching - PO vs Receipt vs Invoice validation
-- 5. Vendor Performance Tracking - Quality, delivery, cost metrics
-- 6. Vendor Catalogs - Vendor-specific item catalogs and pricing
--
-- Author: ERP Transformation - Phase 3
-- Date: 2025
-- ============================================================================

-- ============================================================================
-- TYPES AND ENUMS
-- ============================================================================

-- Requisition Status Enum
CREATE TYPE requisition_status AS ENUM (
  'DRAFT',
  'SUBMITTED',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'CANCELLED',
  'CONVERTED_TO_PO'
);

-- RFQ Status Enum
CREATE TYPE rfq_status AS ENUM (
  'DRAFT',
  'SENT',
  'RESPONSES_PENDING',
  'RESPONSES_RECEIVED',
  'UNDER_REVIEW',
  'AWARDED',
  'CANCELLED'
);

-- Vendor Response Status Enum
CREATE TYPE vendor_response_status AS ENUM (
  'PENDING',
  'RECEIVED',
  'ACCEPTED',
  'REJECTED',
  'WITHDRAWN'
);

-- Three-Way Match Status Enum
CREATE TYPE three_way_match_status AS ENUM (
  'PENDING_RECEIPT',
  'PARTIALLY_RECEIVED',
  'FULLY_RECEIVED',
  'PENDING_INVOICE',
  'INVOICE_RECEIVED',
  'MATCHED',
  'VARIANCE_DETECTED',
  'DISCREPANCY_RESOLVED',
  'READY_TO_PAY',
  'PAID'
);

-- Vendor Rating Category Enum
CREATE TYPE vendor_rating_category AS ENUM (
  'QUALITY',
  'DELIVERY',
  'COMMUNICATION',
  'PRICE',
  'OVERALL'
);

-- ============================================================================
-- TABLES: PURCHASE REQUISITIONS
-- ============================================================================

-- Purchase Requisitions Header
-- Internal request to purchase goods/services before creating PO
CREATE TABLE IF NOT EXISTS purchase_requisitions (
  requisition_id VARCHAR(20) PRIMARY KEY,
  requisition_number VARCHAR(50) UNIQUE NOT NULL,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,

  -- Requester Information
  requested_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL NOT NULL,
  request_date DATE NOT NULL DEFAULT CURRENT_DATE,
  department VARCHAR(100) NOT NULL,
  cost_center VARCHAR(50),
  job_number VARCHAR(50), -- Link to project job

  -- Approval
  approval_status requisition_status NOT NULL DEFAULT 'DRAFT',
  approved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejection_reason TEXT,

  -- Conversion to PO
  converted_to_po_id VARCHAR(20), -- Links to PO when converted
  converted_at TIMESTAMP,

  -- Dates
  required_by DATE NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Notes
  justification TEXT,
  delivery_instructions TEXT,
  notes TEXT,

  CONSTRAINT chk_required_by_after_request CHECK (required_by >= request_date)
);

CREATE INDEX idx_pr_entity ON purchase_requisitions(entity_id);
CREATE INDEX idx_pr_requested_by ON purchase_requisitions(requested_by);
CREATE INDEX idx_pr_status ON purchase_requisitions(approval_status);
CREATE INDEX idx_pr_required_by ON purchase_requisitions(required_by);
CREATE INDEX idx_pr_department ON purchase_requisitions(department);
CREATE INDEX idx_pr_job_number ON purchase_requisitions(job_number);
CREATE INDEX idx_pr_approval_status ON purchase_requisitions(approval_status);

COMMENT ON TABLE purchase_requisitions IS 'Internal purchase requisitions - request to buy goods/services before PO creation';
COMMENT ON COLUMN purchase_requisitions.entity_id IS 'Multi-entity: which entity is requesting';
COMMENT ON COLUMN purchase_requisitions.job_number IS 'Optional: link to project/job if for a specific project';

-- Purchase Requisition Lines
CREATE TABLE IF NOT EXISTS purchase_requisition_lines (
  line_id VARCHAR(20) PRIMARY KEY,
  requisition_id VARCHAR(20) NOT NULL REFERENCES purchase_requisitions(requisition_id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,

  -- Item Details
  sku VARCHAR(100),
  item_description TEXT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  uom VARCHAR(20) DEFAULT 'EA',

  -- Suggested Vendor
  suggested_vendor_id VARCHAR(20),
  suggested_vendor_item_code VARCHAR(100),

  -- Cost Estimates
  estimated_unit_cost DECIMAL(12,2),
  estimated_total_cost DECIMAL(12,2),

  -- Additional Info
  notes TEXT,
  attachment_url VARCHAR(500), -- Link to spec sheet, quote, etc.

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_pr_line_quantity CHECK (quantity > 0),
  CONSTRAINT chk_pr_line_cost CHECK (estimated_unit_cost IS NULL OR estimated_unit_cost >= 0)
);

CREATE INDEX idx_prl_requisition ON purchase_requisition_lines(requisition_id);
CREATE INDEX idx_prl_sku ON purchase_requisition_lines(sku);
CREATE INDEX idx_prl_vendor ON purchase_requisition_lines(suggested_vendor_id);

COMMENT ON TABLE purchase_requisition_lines IS 'Line items for purchase requisitions';

-- Requisition Approval Workflow
CREATE TABLE IF NOT EXISTS requisition_approvals (
  approval_id VARCHAR(20) PRIMARY KEY,
  requisition_id VARCHAR(20) NOT NULL REFERENCES purchase_requisitions(requisition_id) ON DELETE CASCADE,
  approval_level INTEGER NOT NULL, -- 1, 2, 3... for multi-level approval
  approver_id VARCHAR(20) NOT NULL REFERENCES users(user_id),
  approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING', -- PENDING, APPROVED, REJECTED
  approved_at TIMESTAMP,
  comments TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  UNIQUE(requisition_id, approval_level, approver_id)
);

CREATE INDEX idx_ra_requisition ON requisition_approvals(requisition_id);
CREATE INDEX idx_ra_approver ON requisition_approvals(approver_id);
CREATE INDEX idx_ra_status ON requisition_approvals(approval_status);

COMMENT ON TABLE requisition_approvals IS 'Multi-level approval workflow for purchase requisitions';

-- ============================================================================
-- TABLES: RFQ MANAGEMENT (Request for Quotation)
-- ============================================================================

-- RFQ Headers
-- Request quotations from multiple vendors for comparison
CREATE TABLE IF NOT EXISTS rfq_headers (
  rfq_id VARCHAR(20) PRIMARY KEY,
  rfq_number VARCHAR(50) UNIQUE NOT NULL,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,

  -- Source
  source_type VARCHAR(20) NOT NULL, -- REQUISITION, STOCK_REQUEST, PROJECT, MANUAL
  source_id VARCHAR(20), -- PR ID, Project ID, etc.
  source_line_id VARCHAR(20), -- PR Line ID if applicable

  -- Dates
  created_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quote_due_date DATE NOT NULL,
  response_by_date DATE NOT NULL,

  -- Status
  rfq_status rfq_status NOT NULL DEFAULT 'DRAFT',
  awarded_to_vendor_id VARCHAR(20),
  awarded_at TIMESTAMP,
  awarded_amount DECIMAL(12,2),
  awarded_notes TEXT,

  -- Created By
  created_by VARCHAR(20) NOT NULL REFERENCES users(user_id),

  -- Delivery & Terms
  delivery_location TEXT,
  payment_terms VARCHAR(100),
  freight_terms VARCHAR(50), -- FOB, CIF, EXW, etc.
  incoterms VARCHAR(10),

  -- Notes
  notes TEXT,
  special_instructions TEXT,
  attachments JSONB, -- Array of file URLs, descriptions

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_rfq_dates CHECK (quote_due_date >= created_date),
  CONSTRAINT chk_rfq_response_date CHECK (response_by_date >= quote_due_date)
);

CREATE INDEX idx_rfq_entity ON rfq_headers(entity_id);
CREATE INDEX idx_rfq_status ON rfq_headers(rfq_status);
CREATE INDEX idx_rfq_source ON rfq_headers(source_type, source_id);
CREATE INDEX idx_rfq_due_date ON rfq_headers(quote_due_date);
CREATE INDEX idx_rfq_created_by ON rfq_headers(created_by);
CREATE INDEX idx_rfq_awarded_vendor ON rfq_headers(awarded_to_vendor_id);

COMMENT ON TABLE rfq_headers IS 'Request for Quotation headers - solicit bids from multiple vendors';

-- RFQ Lines
CREATE TABLE IF NOT EXISTS rfq_lines (
  line_id VARCHAR(20) PRIMARY KEY,
  rfq_id VARCHAR(20) NOT NULL REFERENCES rfq_headers(rfq_id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,

  -- Item Details
  sku VARCHAR(100),
  item_description TEXT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  uom VARCHAR(20) DEFAULT 'EA',

  -- Specifications
  specifications TEXT,
  technical_requirements TEXT,
  quality_requirements TEXT,
  attachment_url VARCHAR(500), -- Spec sheet, drawing, etc.

  -- Budget
  budgeted_unit_cost DECIMAL(12,2),
  budgeted_total_cost DECIMAL(12,2),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_rfq_line_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_rfq_l_header ON rfq_lines(rfq_id);
CREATE INDEX idx_rfq_l_sku ON rfq_lines(sku);

COMMENT ON TABLE rfq_lines IS 'Line items for RFQs';

-- RFQ Vendors (Vendors invited to quote)
CREATE TABLE IF NOT EXISTS rfq_vendors (
  rfq_vendor_id VARCHAR(20) PRIMARY KEY,
  rfq_id VARCHAR(20) NOT NULL REFERENCES rfq_headers(rfq_id) ON DELETE CASCADE,
  vendor_id VARCHAR(20) NOT NULL,
  vendor_contact_id VARCHAR(20), -- Specific contact at vendor

  -- Status
  status vendor_response_status NOT NULL DEFAULT 'PENDING',
  sent_at TIMESTAMP,
  response_received_at TIMESTAMP,

  -- Award Status
  is_awarded BOOLEAN DEFAULT FALSE,
  awarded_at TIMESTAMP,
  awarded_amount DECIMAL(12,2),

  -- Communication
  email_sent BOOLEAN DEFAULT FALSE,
  email_sent_at TIMESTAMP,
  email_count INTEGER DEFAULT 0,
  last_contacted_at TIMESTAMP,

  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_rfq_vendor UNIQUE(rfq_id, vendor_id)
);

CREATE INDEX idx_rfq_v_rfq ON rfq_vendors(rfq_id);
CREATE INDEX idx_rfq_v_vendor ON rfq_vendors(vendor_id);
CREATE INDEX idx_rfq_v_status ON rfq_vendors(status);

COMMENT ON TABLE rfq_vendors IS 'Vendors invited to participate in RFQ';

-- RFQ Vendor Responses (Vendor quotations)
CREATE TABLE IF NOT EXISTS rfq_vendor_responses (
  response_id VARCHAR(20) PRIMARY KEY,
  rfq_vendor_id VARCHAR(20) NOT NULL REFERENCES rfq_vendors(rfq_vendor_id) ON DELETE CASCADE,
  rfq_id VARCHAR(20) NOT NULL, -- Denormalized for easier queries
  vendor_id VARCHAR(20) NOT NULL,

  -- Response Details
  response_date DATE NOT NULL DEFAULT CURRENT_DATE,
  quote_number VARCHAR(100),
  quote_valid_until DATE,
  contact_person VARCHAR(255),
  contact_email VARCHAR(255),
  contact_phone VARCHAR(50),

  -- Totals
  total_amount DECIMAL(12,2) NOT NULL,
  total_tax DECIMAL(12,2) DEFAULT 0,
  total_freight DECIMAL(12,2) DEFAULT 0,
  grand_total DECIMAL(12,2) NOT NULL,

  -- Terms
  payment_terms VARCHAR(100),
  delivery_terms VARCHAR(100),
  estimated_delivery_date DATE,
  lead_time_days INTEGER,

  -- Attachments
  quote_document_url VARCHAR(500),
  additional_attachments JSONB,

  -- Notes
  notes TEXT,
  terms_conditions TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_rfq_response_total CHECK (grand_total > 0)
);

CREATE INDEX idx_rqr_rfq_vendor ON rfq_vendor_responses(rfq_vendor_id);
CREATE INDEX idx_rqr_rfq ON rfq_vendor_responses(rfq_id);
CREATE INDEX idx_rqr_vendor ON rfq_vendor_responses(vendor_id);

COMMENT ON TABLE rfq_vendor_responses IS 'Vendor quotation responses to RFQs';

-- RFQ Response Line Items
CREATE TABLE IF NOT EXISTS rfq_response_lines (
  response_line_id VARCHAR(20) PRIMARY KEY,
  response_id VARCHAR(20) NOT NULL REFERENCES rfq_vendor_responses(response_id) ON DELETE CASCADE,
  rfq_line_id VARCHAR(20) NOT NULL REFERENCES rfq_lines(line_id), -- Link to original RFQ line

  -- Line Details
  line_number INTEGER NOT NULL,
  vendor_item_code VARCHAR(100),
  item_description TEXT NOT NULL,
  quantity DECIMAL(12,3) NOT NULL,
  uom VARCHAR(20),

  -- Pricing
  unit_price DECIMAL(12,2) NOT NULL,
  line_total DECIMAL(12,2) NOT NULL,
  discount_percent DECIMAL(5,2) DEFAULT 0,
  discount_amount DECIMAL(12,2) DEFAULT 0,
  net_amount DECIMAL(12,2) NOT NULL,

  -- Lead Time
  lead_time_days INTEGER,
  availability_date DATE,

  -- Notes
  notes TEXT,
  substitution_notes TEXT, -- If vendor suggests substitute

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_rfq_response_line_qty CHECK (quantity > 0)
);

CREATE INDEX idx_rfqrl_response ON rfq_response_lines(response_id);
CREATE INDEX idx_rfqrl_rfq_line ON rfq_response_lines(rfq_line_id);

COMMENT ON TABLE rfq_response_lines IS 'Line items from vendor RFQ responses';

-- ============================================================================
-- TABLES: VENDOR CATALOGS
-- ============================================================================

-- Vendor Item Catalogs
-- Vendor-specific SKUs and pricing
CREATE TABLE IF NOT EXISTS vendor_item_catalogs (
  catalog_id VARCHAR(20) PRIMARY KEY,
  vendor_id VARCHAR(20) NOT NULL,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,

  -- Item Linking
  internal_sku VARCHAR(100), -- Our SKU
  vendor_sku VARCHAR(100), -- Vendor's item number

  -- Description
  item_name VARCHAR(255),
  item_description TEXT,

  -- Pricing
  list_price DECIMAL(12,2),
  contract_price DECIMAL(12,2), -- Contracted price if applicable
  minimum_order_quantity INTEGER DEFAULT 1,
  price_break_quantity INTEGER, -- Qty for price break
  price_break_price DECIMAL(12,2), -- Price at break qty

  -- Lead Time
  standard_lead_time_days INTEGER,
  current_lead_time_days INTEGER,

  -- Status
  is_preferred BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  last_ordered_date DATE,
  last_price_update DATE,

  -- Additional Info
  vendor_category VARCHAR(100), -- Vendor's category
  internal_category VARCHAR(100), -- Our category
  uom VARCHAR(20),
  weight DECIMAL(12,3),
  dimensions VARCHAR(100),

  -- Links
  product_url VARCHAR(500),
  spec_sheet_url VARCHAR(500),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_vendor_sku UNIQUE(vendor_id, vendor_sku)
);

CREATE INDEX idx_vic_vendor ON vendor_item_catalogs(vendor_id);
CREATE INDEX idx_vic_internal_sku ON vendor_item_catalogs(internal_sku);
CREATE INDEX idx_vic_active ON vendor_item_catalogs(is_active);
CREATE INDEX idx_vic_preferred ON vendor_item_catalogs(is_preferred);
CREATE INDEX idx_vic_entity ON vendor_item_catalogs(entity_id);

COMMENT ON TABLE vendor_item_catalogs IS 'Vendor-specific item catalogs with pricing and lead times';

-- ============================================================================
-- TABLES: THREE-WAY MATCHING
-- ============================================================================

-- Purchase Order Headers (Enhanced)
-- If exists, add columns; if not, create full table
CREATE TABLE IF NOT EXISTS purchase_order_headers (
  po_id VARCHAR(20) PRIMARY KEY,
  po_number VARCHAR(50) UNIQUE NOT NULL,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,

  -- Vendor
  vendor_id VARCHAR(20) NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  vendor_contact_id VARCHAR(20),
  vendor_address TEXT,

  -- Source
  source_type VARCHAR(20), -- REQUISITION, RFQ, MANUAL, STOCK_REQUEST, PROJECT
  source_id VARCHAR(20), -- PR ID, RFQ ID, etc.
  rfq_response_id VARCHAR(20), -- If from RFQ

  -- Dates
  order_date DATE NOT NULL DEFAULT CURRENT_DATE,
  requested_delivery_date DATE NOT NULL,
  promised_delivery_date DATE,
  actual_delivery_date DATE,

  -- Status
  po_status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, ACKNOWLEDGED, PARTIAL, RECEIVED, CLOSED, CANCELLED
  three_way_match_status three_way_match_status DEFAULT 'PENDING_RECEIPT',

  -- Totals
  subtotal DECIMAL(12,2) NOT NULL DEFAULT 0,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  freight_amount DECIMAL(12,2) DEFAULT 0,
  other_charges DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,

  -- Receipt & Invoice Tracking
  quantity_ordered DECIMAL(12,3) DEFAULT 0,
  quantity_received DECIMAL(12,3) DEFAULT 0,
  quantity_invoiced DECIMAL(12,3) DEFAULT 0,
  amount_invoiced DECIMAL(12,2) DEFAULT 0,
  amount_paid DECIMAL(12,2) DEFAULT 0,

  -- Terms
  payment_terms VARCHAR(100),
  payment_terms_days INTEGER DEFAULT 30,
  freight_terms VARCHAR(50),
  incoterms VARCHAR(10),
  currency VARCHAR(3) DEFAULT 'USD',
  exchange_rate DECIMAL(12,6) DEFAULT 1.0,

  -- Approval
  approved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMP,

  -- Created By
  created_by VARCHAR(20) NOT NULL REFERENCES users(user_id),

  -- Notes
  notes TEXT,
  shipping_instructions TEXT,
  vendor_notes TEXT,
  internal_notes TEXT,

  -- Attachments
  attachments JSONB,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_po_delivery CHECK (requested_delivery_date >= order_date)
);

CREATE INDEX idx_poh_entity ON purchase_order_headers(entity_id);
CREATE INDEX idx_poh_vendor ON purchase_order_headers(vendor_id);
CREATE INDEX idx_poh_status ON purchase_order_headers(po_status);
CREATE INDEX idx_poh_3way_status ON purchase_order_headers(three_way_match_status);
CREATE INDEX idx_poh_order_date ON purchase_order_headers(order_date);
CREATE INDEX idx_poh_source ON purchase_order_headers(source_type, source_id);
CREATE INDEX idx_poh_delivery_date ON purchase_order_headers(requested_delivery_date);

COMMENT ON TABLE purchase_order_headers IS 'Purchase order headers with three-way matching support';

-- Purchase Order Lines
CREATE TABLE IF NOT EXISTS purchase_order_lines (
  pol_id VARCHAR(20) PRIMARY KEY,
  po_id VARCHAR(20) NOT NULL REFERENCES purchase_order_headers(po_id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,

  -- Item
  sku VARCHAR(100),
  item_description TEXT NOT NULL,
  vendor_sku VARCHAR(100),

  -- Quantities
  quantity_ordered DECIMAL(12,3) NOT NULL,
  quantity_received DECIMAL(12,3) DEFAULT 0,
  quantity_invoiced DECIMAL(12,3) DEFAULT 0,
  quantity_rejected DECIMAL(12,3) DEFAULT 0,
  quantity_open DECIMAL(12,3) GENERATED ALWAYS AS (quantity_ordered - quantity_received) STORED,

  -- Pricing
  unit_price DECIMAL(12,2) NOT NULL,
  line_total DECIMAL(12,2) GENERATED ALWAYS AS (quantity_ordered * unit_price) STORED,
  tax_amount DECIMAL(12,2) DEFAULT 0,
  freight_amount DECIMAL(12,2) DEFAULT 0,
  total_amount DECIMAL(12,2) GENERATED ALWAYS AS (line_total + tax_amount + freight_amount) STORED,

  -- Receipt & Invoice
  amount_received DECIMAL(12,2) GENERATED ALWAYS AS (quantity_received * unit_price) STORED,
  amount_invoiced DECIMAL(12,2),
  three_way_match_status three_way_match_status DEFAULT 'PENDING_RECEIPT',

  -- Dates
  promised_date DATE,
  requested_date DATE,

  -- Additional Info
  notes TEXT,
  job_number VARCHAR(50), -- For project-related purchases

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_pol_qty CHECK (quantity_ordered > 0),
  CONSTRAINT chk_pol_price CHECK (unit_price >= 0)
);

CREATE INDEX idx_pol_po ON purchase_order_lines(po_id);
CREATE INDEX idx_pol_sku ON purchase_order_lines(sku);
CREATE INDEX idx_pol_3way_status ON purchase_order_lines(three_way_match_status);

COMMENT ON TABLE purchase_order_lines IS 'Purchase order lines with three-way matching at line level';

-- Three-Way Match Details
-- Tracks matching between PO, Receipt, and Invoice
CREATE TABLE IF NOT EXISTS three_way_match_details (
  match_id VARCHAR(20) PRIMARY KEY,
  po_id VARCHAR(20) NOT NULL REFERENCES purchase_order_headers(po_id) ON DELETE CASCADE,
  po_line_id VARCHAR(20) REFERENCES purchase_order_lines(pol_id) ON DELETE SET NULL,

  -- Document References
  receipt_id VARCHAR(20),
  receipt_line_id VARCHAR(20),
  invoice_id VARCHAR(20),
  invoice_line_id VARCHAR(20),

  -- Quantities for Matching
  po_quantity DECIMAL(12,3),
  receipt_quantity DECIMAL(12,3),
  invoice_quantity DECIMAL(12,3),

  -- Amounts for Matching
  po_amount DECIMAL(12,2),
  receipt_amount DECIMAL(12,2),
  invoice_amount DECIMAL(12,2),

  -- Variance Tracking
  quantity_variance DECIMAL(12,3),
  amount_variance DECIMAL(12,2),
  variance_percent DECIMAL(8,4),
  tolerance_percent DECIMAL(8,2) DEFAULT 5.0, -- Acceptable variance

  -- Match Status
  match_status three_way_match_status NOT NULL DEFAULT 'PENDING_RECEIPT',
  is_match_ok BOOLEAN DEFAULT TRUE,
  hold_reason TEXT,

  -- Resolution
  variance_resolved BOOLEAN DEFAULT FALSE,
  resolved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_3wm_po ON three_way_match_details(po_id);
CREATE INDEX idx_3wm_po_line ON three_way_match_details(po_line_id);
CREATE INDEX idx_3wm_receipt ON three_way_match_details(receipt_id);
CREATE INDEX idx_3wm_invoice ON three_way_match_details(invoice_id);
CREATE INDEX idx_3wm_status ON three_way_match_details(match_status);

COMMENT ON TABLE three_way_match_details IS 'Three-way matching details between PO, Receipt, and Invoice';

-- Purchase Receipts (Link to PO)
-- If receipt table exists, ensure it links to PO properly
CREATE TABLE IF NOT EXISTS purchase_receipts (
  receipt_id VARCHAR(20) PRIMARY KEY,
  receipt_number VARCHAR(50) UNIQUE NOT NULL,
  po_id VARCHAR(20) REFERENCES purchase_order_headers(po_id) ON DELETE SET NULL,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,

  -- Vendor
  vendor_id VARCHAR(20) NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  vendor_document_number VARCHAR(100), -- Vendor packing slip, delivery note

  -- Receipt Details
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by VARCHAR(20) NOT NULL REFERENCES users(user_id),
  warehouse_location VARCHAR(50),
  dock_door VARCHAR(20),

  -- Status
  receipt_status VARCHAR(20) DEFAULT 'OPEN', -- OPEN, PARTIALLY_PUTAWAY, PUTAWAY, CLOSED

  -- Notes
  notes TEXT,
  carrier VARCHAR(100),
  tracking_number VARCHAR(100),
  bill_of_lading VARCHAR(100),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_pr_po ON purchase_receipts(po_id);
CREATE INDEX idx_pr_vendor ON purchase_receipts(vendor_id);
CREATE INDEX idx_pr_date ON purchase_receipts(receipt_date);

COMMENT ON TABLE purchase_receipts IS 'Goods receipt notes linked to purchase orders';

-- Purchase Receipt Lines
CREATE TABLE IF NOT EXISTS purchase_receipt_lines (
  receipt_line_id VARCHAR(20) PRIMARY KEY,
  receipt_id VARCHAR(20) NOT NULL REFERENCES purchase_receipts(receipt_id) ON DELETE CASCADE,
  po_line_id VARCHAR(20) REFERENCES purchase_order_lines(pol_id) ON DELETE SET NULL,

  line_number INTEGER NOT NULL,

  -- Item
  sku VARCHAR(100) NOT NULL,
  item_description TEXT,
  vendor_sku VARCHAR(100),

  -- Quantities
  quantity_ordered DECIMAL(12,3),
  quantity_shipped DECIMAL(12,3),
  quantity_received DECIMAL(12,3) NOT NULL,
  quantity_rejected DECIMAL(12,3) DEFAULT 0,
  quantity_accepted DECIMAL(12,3) GENERATED ALWAYS AS (quantity_received - quantity_rejected) STORED,

  -- Unit of Measure
  uom VARCHAR(20),
  conversion_factor DECIMAL(12,6) DEFAULT 1.0, -- If vendor UOM differs

  -- Lot/Serial
  lot_number VARCHAR(100),
  expiration_date DATE,
  serial_numbers JSONB, -- Array of serial numbers if applicable

  -- Quality
  quality_status VARCHAR(20) DEFAULT 'PENDING', -- PENDING, PASSED, FAILED, QUARANTINED
  inspected_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  inspected_at TIMESTAMP,

  -- Location
  putaway_location VARCHAR(50),
  putaway_at TIMESTAMP,
  putaway_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,

  notes TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_prl_qty CHECK (quantity_received > 0)
);

CREATE INDEX idx_prl_receipt ON purchase_receipt_lines(receipt_id);
CREATE INDEX idx_prl_po_line ON purchase_receipt_lines(po_line_id);
CREATE INDEX idx_prl_sku ON purchase_receipt_lines(sku);
CREATE INDEX idx_prl_lot ON purchase_receipt_lines(lot_number);

COMMENT ON TABLE purchase_receipt_lines IS 'Line items for purchase receipts with quality and putaway tracking';

-- ============================================================================
-- TABLES: VENDOR PERFORMANCE TRACKING
-- ============================================================================

-- Vendor Performance Summary
-- Aggregated performance metrics by vendor
CREATE TABLE IF NOT EXISTS vendor_performance_summary (
  performance_id VARCHAR(20) PRIMARY KEY,
  vendor_id VARCHAR(20) NOT NULL UNIQUE,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,

  -- Time Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  last_updated TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Overall Rating
  overall_rating DECIMAL(3,2) CHECK (overall_rating BETWEEN 0 AND 5),
  overall_rank VARCHAR(20), -- EXCELLENT, GOOD, AVERAGE, POOR, CRITICAL

  -- Delivery Performance
  total_orders INTEGER DEFAULT 0,
  on_time_deliveries INTEGER DEFAULT 0,
  on_time_delivery_percent DECIMAL(5,2),
  average_lead_time_days DECIMAL(8,2),
  late_deliveries INTEGER DEFAULT 0,

  -- Quality Performance
  total_receipts INTEGER DEFAULT 0,
  receipts_with_defects INTEGER DEFAULT 0,
  defect_rate_percent DECIMAL(5,2),
  total_quantity_received DECIMAL(12,3),
  total_quantity_rejected DECIMAL(12,3),
  rejection_rate_percent DECIMAL(5,2),

  -- Cost Performance
  total_spend DECIMAL(15,2) DEFAULT 0,
  average_order_value DECIMAL(12,2),
  cost_variance_percent DECIMAL(5,2), -- vs quoted price
  competitive_score DECIMAL(3,2), -- 1-5 rating

  -- Service Performance
  communication_rating DECIMAL(3,2), -- 1-5
  responsiveness_rating DECIMAL(3,2), -- 1-5
  problem_resolution_rating DECIMAL(3,2), -- 1-5
  average_response_time_hours DECIMAL(10,2),

  -- Returns & Credits
  total_returns INTEGER DEFAULT 0,
  return_rate_percent DECIMAL(5,2),
  total_credits_issued DECIMAL(15,2) DEFAULT 0,

  -- Compliance
  documentation_quality DECIMAL(3,2), -- 1-5 (invoices, ASN, etc.)
  on_time_invoices_percent DECIMAL(5,2),
  invoice_accuracy_percent DECIMAL(5,2),

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vps_vendor ON vendor_performance_summary(vendor_id);
CREATE INDEX idx_vps_entity ON vendor_performance_summary(entity_id);
CREATE INDEX idx_vps_period ON vendor_performance_summary(period_start, period_end);
CREATE INDEX idx_vps_overall_rating ON vendor_performance_summary(overall_rating);

COMMENT ON TABLE vendor_performance_summary IS 'Vendor performance metrics and ratings';

-- Vendor Performance Events
-- Individual events that contribute to performance score
CREATE TABLE IF NOT EXISTS vendor_performance_events (
  event_id VARCHAR(20) PRIMARY KEY,
  vendor_id VARCHAR(20) NOT NULL,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,

  -- Event Type
  event_type VARCHAR(50) NOT NULL, -- LATE_DELIVERY, EARLY_DELIVERY, DEFECT, SHORT_SHIP, OVER_SHIP, PRICE_VARIANCE, etc.
  event_category VARCHAR(50) NOT NULL, -- DELIVERY, QUALITY, COST, SERVICE, DOCUMENTATION

  -- Reference
  reference_type VARCHAR(20), -- PO, RECEIPT, INVOICE, RFQ
  reference_id VARCHAR(20),
  reference_line_id VARCHAR(20),

  -- Event Details
  event_date DATE NOT NULL,
  event_description TEXT NOT NULL,
  severity VARCHAR(20), -- CRITICAL, HIGH, MEDIUM, LOW
  impact_amount DECIMAL(12,2), -- Financial impact

  -- Scoring
  score_impact DECIMAL(5,2), -- Positive or negative impact on score
  rating_after DECIMAL(3,2), -- Vendor rating after this event

  -- Resolution
  resolved BOOLEAN DEFAULT FALSE,
  resolved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  resolved_at TIMESTAMP,
  resolution_notes TEXT,
  credit_issued DECIMAL(12,2),

  -- Reporting
  reported_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  acknowledged_by_vendor BOOLEAN DEFAULT FALSE,
  vendor_response TEXT,

  created_at TIMESTAMP NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_vpe_score CHECK (score_impact BETWEEN -10 AND 10)
);

CREATE INDEX idx_vpe_vendor ON vendor_performance_events(vendor_id);
CREATE INDEX idx_vpe_entity ON vendor_performance_events(entity_id);
CREATE INDEX idx_vpe_type ON vendor_performance_events(event_type);
CREATE INDEX idx_vpe_category ON vendor_performance_events(event_category);
CREATE INDEX idx_vpe_date ON vendor_performance_events(event_date);
CREATE INDEX idx_vpe_reference ON vendor_performance_events(reference_type, reference_id);

COMMENT ON TABLE vendor_performance_events IS 'Individual performance events for vendor scoring';

-- Vendor Scorecard
-- Regular scorecard reviews
CREATE TABLE IF NOT EXISTS vendor_scorecards (
  scorecard_id VARCHAR(20) PRIMARY KEY,
  vendor_id VARCHAR(20) NOT NULL,
  entity_id VARCHAR(20) REFERENCES entities(entity_id) ON DELETE SET NULL,

  -- Review Period
  review_period_start DATE NOT NULL,
  review_period_end DATE NOT NULL,
  review_date DATE NOT NULL DEFAULT CURRENT_DATE,

  -- Reviewer
  reviewed_by VARCHAR(20) NOT NULL REFERENCES users(user_id),
  approved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMP,

  -- Scores (1-5 scale)
  delivery_score DECIMAL(3,2),
  quality_score DECIMAL(3,2),
  cost_score DECIMAL(3,2),
  service_score DECIMAL(3,2),
  communication_score DECIMAL(3,2),
  documentation_score DECIMAL(3,2),
  overall_score DECIMAL(3,2),

  -- Rating
  overall_rating VARCHAR(20), -- EXCELLENT, GOOD, AVERAGE, NEEDS_IMPROVEMENT, UNSATISFACTORY

  -- Status
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT', -- DRAFT, SUBMITTED, APPROVED, REJECTED

  -- Actions
  strengths TEXT,
  weaknesses TEXT,
  improvement_required TEXT,
  corrective_actions TEXT,
  follow_up_date DATE,

  -- Supplier Development
  requires_development_plan BOOLEAN DEFAULT FALSE,
  development_plan TEXT,
  development_plan_approved BOOLEAN DEFAULT FALSE,

  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_vs_vendor ON vendor_scorecards(vendor_id);
CREATE INDEX idx_vs_entity ON vendor_scorecards(entity_id);
CREATE INDEX idx_vs_period ON vendor_scorecards(review_period_start, review_period_end);
CREATE INDEX idx_vs_reviewer ON vendor_scorecards(reviewed_by);

COMMENT ON TABLE vendor_scorecards IS 'Formal vendor scorecard reviews';

-- ============================================================================
-- TRIGGERS AND FUNCTIONS
-- ============================================================================

-- Function: Generate Purchase Requisition ID
CREATE OR REPLACE FUNCTION generate_pr_id()
RETURNS VARCHAR(20) AS $$
DECLARE
  timestamp_part TEXT;
  random_part TEXT;
BEGIN
  timestamp_part := TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
  random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN 'PR-' || timestamp_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate RFQ ID
CREATE OR REPLACE FUNCTION generate_rfq_id()
RETURNS VARCHAR(20) AS $$
DECLARE
  timestamp_part TEXT;
  random_part TEXT;
BEGIN
  timestamp_part := TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
  random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN 'RFQ-' || timestamp_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate PO ID
CREATE OR REPLACE FUNCTION generate_po_id()
RETURNS VARCHAR(20) AS $$
DECLARE
  timestamp_part TEXT;
  random_part TEXT;
BEGIN
  timestamp_part := TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
  random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN 'PO-' || timestamp_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- Function: Generate Receipt ID
CREATE OR REPLACE FUNCTION generate_receipt_id()
RETURNS VARCHAR(20) AS $$
DECLARE
  timestamp_part TEXT;
  random_part TEXT;
BEGIN
  timestamp_part := TO_CHAR(NOW(), 'YYYYMMDDHH24MISS');
  random_part := LPAD(FLOOR(RANDOM() * 10000)::TEXT, 4, '0');
  RETURN 'RCP-' || timestamp_part || '-' || random_part;
END;
$$ LANGUAGE plpgsql;

-- Function: Update Three-Way Match Status
CREATE OR REPLACE FUNCTION update_three_way_match_status()
RETURNS TRIGGER AS $$
BEGIN
  -- Update PO header three-way match status based on line statuses
  UPDATE purchase_order_headers poh
  SET three_way_match_status = CASE
    WHEN EXISTS (
      SELECT 1 FROM purchase_order_lines pol
      WHERE pol.po_id = poh.po_id
      AND pol.three_way_match_status IN ('PENDING_RECEIPT', 'PARTIALLY_RECEIVED')
    ) THEN 'PENDING_RECEIPT'

    WHEN EXISTS (
      SELECT 1 FROM purchase_order_lines pol
      WHERE pol.po_id = poh.po_id
      AND pol.three_way_match_status = 'FULLY_RECEIVED'
    ) AND NOT EXISTS (
      SELECT 1 FROM purchase_order_lines pol
      WHERE pol.po_id = poh.po_id
      AND pol.three_way_match_status IN ('PENDING_RECEIPT', 'PARTIALLY_RECEIVED')
    ) THEN 'FULLY_RECEIVED'

    WHEN EXISTS (
      SELECT 1 FROM purchase_order_lines pol
      WHERE pol.po_id = poh.po_id
      AND pol.three_way_match_status IN ('INVOICE_RECEIVED', 'MATCHED')
    ) AND NOT EXISTS (
      SELECT 1 FROM purchase_order_lines pol
      WHERE pol.po_id = poh.po_id
      AND pol.three_way_match_status IN ('PENDING_RECEIPT', 'PARTIALLY_RECEIVED', 'FULLY_RECEIVED')
    ) THEN 'INVOICE_RECEIVED'

    WHEN EXISTS (
      SELECT 1 FROM purchase_order_lines pol
      WHERE pol.po_id = poh.po_id
      AND pol.three_way_match_status = 'MATCHED'
    ) AND NOT EXISTS (
      SELECT 1 FROM purchase_order_lines pol
      WHERE pol.po_id = poh.po_id
      AND pol.three_way_match_status != 'MATCHED'
    ) THEN 'MATCHED'

    ELSE poh.three_way_match_status
  END
  WHERE poh.po_id = NEW.po_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Three-Way Match Status Update
DROP TRIGGER IF EXISTS trigger_update_3way_status ON purchase_order_lines;
CREATE TRIGGER trigger_update_3way_status
  AFTER INSERT OR UPDATE OF three_way_match_status, quantity_received
  ON purchase_order_lines
  FOR EACH ROW
  EXECUTE FUNCTION update_three_way_match_status();

-- Function: Update PO Totals
CREATE OR REPLACE FUNCTION update_po_totals()
RETURNS TRIGGER AS $$
DECLARE
  new_subtotal DECIMAL(12,2);
BEGIN
  -- Recalculate PO header totals
  SELECT COALESCE(SUM(line_total), 0)
  INTO new_subtotal
  FROM purchase_order_lines
  WHERE po_id = NEW.po_id;

  UPDATE purchase_order_headers
  SET subtotal = new_subtotal,
      total_amount = new_subtotal + tax_amount + freight_amount + other_charges
  WHERE po_id = NEW.po_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger: Update PO Totals
DROP TRIGGER IF EXISTS trigger_update_po_totals ON purchase_order_lines;
CREATE TRIGGER trigger_update_po_totals
  AFTER INSERT OR UPDATE OR DELETE
  ON purchase_order_lines
  FOR EACH STATEMENT
  EXECUTE FUNCTION update_po_totals();

-- Function: Update Vendor Performance
CREATE OR REPLACE FUNCTION update_vendor_performance(vendor_param VARCHAR(20))
RETURNS VOID AS $$
DECLARE
  perf RECORD;
BEGIN
  -- Calculate and update performance summary
  INSERT INTO vendor_performance_summary (
    performance_id, vendor_id, entity_id, period_start, period_end,
    total_orders, on_time_deliveries, on_time_delivery_percent,
    total_receipts, receipts_with_defects, defect_rate_percent,
    total_quantity_received, total_quantity_rejected, rejection_rate_percent,
    total_spend, overall_rating, overall_rank
  )
  SELECT
    'VPS-' || vendor_param || '-' || TO_CHAR(NOW(), 'YYYYMM'),
    vendor_param,
    (SELECT MIN(entity_id) FROM purchase_order_headers WHERE vendor_id = vendor_param),
    DATE_TRUNC('month', CURRENT_DATE),
    DATE_TRUNC('month', CURRENT_DATE) + INTERVAL '1 month' - INTERVAL '1 day',
    COUNT(DISTINCT po_id),
    COUNT(CASE WHEN actual_delivery_date <= requested_delivery_date THEN 1 END),
    ROUND(COUNT(CASE WHEN actual_delivery_date <= requested_delivery_date THEN 1 END)::DECIMAL / COUNT(DISTINCT po_id) * 100, 2),
    COUNT(DISTINCT pr.receipt_id),
    COUNT(CASE WHEN prl.quantity_rejected > 0 THEN 1 END),
    ROUND(COUNT(CASE WHEN prl.quantity_rejected > 0 THEN 1 END)::DECIMAL / COUNT(DISTINCT pr.receipt_id) * 100, 2),
    COALESCE(SUM(prl.quantity_received), 0),
    COALESCE(SUM(prl.quantity_rejected), 0),
    ROUND(COALESCE(SUM(prl.quantity_rejected), 0)::DECIMAL / NULLIF(COALESCE(SUM(prl.quantity_received), 0), 0) * 100, 2),
    COALESCE(SUM(poh.total_amount), 0),
    4.0, -- Default rating (would be calculated based on all factors)
    'GOOD'
  FROM purchase_order_headers poh
  LEFT JOIN purchase_receipts pr ON pr.po_id = poh.po_id
  LEFT JOIN purchase_receipt_lines prl ON prl.receipt_id = pr.receipt_id
  WHERE poh.vendor_id = vendor_param
    AND poh.order_date >= DATE_TRUNC('month', CURRENT_DATE)
  ON CONFLICT (vendor_id) DO UPDATE SET
    total_orders = EXCLUDED.total_orders,
    on_time_deliveries = EXCLUDED.on_time_deliveries,
    on_time_delivery_percent = EXCLUDED.on_time_delivery_percent,
    total_receipts = EXCLUDED.total_receipts,
    receipts_with_defects = EXCLUDED.receipts_with_defects,
    defect_rate_percent = EXCLUDED.defect_rate_percent,
    total_quantity_received = EXCLUDED.total_quantity_received,
    total_quantity_rejected = EXCLUDED.total_quantity_rejected,
    rejection_rate_percent = EXCLUDED.rejection_rate_percent,
    total_spend = EXCLUDED.total_spend,
    last_updated = NOW();
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- VIEWS
-- ============================================================================

-- View: Open Purchase Requisitions
CREATE OR REPLACE VIEW v_open_purchase_requisitions AS
SELECT
  pr.requisition_id,
  pr.requisition_number,
  pr.requested_by,
  u.email AS requester_email,
  u.first_name || ' ' || u.last_name AS requester_name,
  pr.department,
  pr.cost_center,
  pr.required_by,
  pr.approval_status,
  COUNT(prl.line_id) AS line_count,
  SUM(prl.estimated_total_cost) AS total_estimated_cost,
  pr.created_at
FROM purchase_requisitions pr
JOIN users u ON u.user_id = pr.requested_by
LEFT JOIN purchase_requisition_lines prl ON prl.requisition_id = pr.requisition_id
WHERE pr.approval_status IN ('SUBMITTED', 'PENDING_APPROVAL')
GROUP BY pr.requisition_id, pr.requisition_number, pr.requested_by, u.email, u.first_name, u.last_name, pr.department, pr.cost_center, pr.required_by, pr.approval_status, pr.created_at
ORDER BY pr.required_by ASC;

COMMENT ON VIEW v_open_purchase_requisitions IS 'Purchase requisitions awaiting approval';

-- View: RFQs Awaiting Response
CREATE OR REPLACE VIEW v_rfqs_awaiting_response AS
SELECT
  rh.rfq_id,
  rh.rfq_number,
  rh.quote_due_date,
  rh.created_by,
  COUNT(DISTINCT rv.vendor_id) AS vendors_contacted,
  COUNT(DISTINCT rvr.response_id) AS responses_received,
  COUNT(DISTINCT rv.vendor_id) - COUNT(DISTINCT rvr.response_id) AS pending_responses,
  rh.rfq_status
FROM rfq_headers rh
JOIN rfq_vendors rv ON rv.rfq_id = rh.rfq_id
LEFT JOIN rfq_vendor_responses rvr ON rvr.rfq_vendor_id = rv.rfq_vendor_id
WHERE rh.rfq_status IN ('SENT', 'RESPONSES_PENDING', 'RESPONSES_RECEIVED')
GROUP BY rh.rfq_id, rh.rfq_number, rh.quote_due_date, rh.created_by, rh.rfq_status
ORDER BY rh.quote_due_date ASC;

COMMENT ON VIEW v_rfqs_awaiting_response IS 'RFQs with pending vendor responses';

-- View: Three-Way Match Exceptions
CREATE OR REPLACE VIEW v_three_way_match_exceptions AS
SELECT
  twm.match_id,
  twm.po_id,
  poh.po_number,
  twm.po_line_id,
  pol.line_number,
  pol.sku,
  pol.item_description,
  twm.po_quantity,
  twm.receipt_quantity,
  twm.invoice_quantity,
  twm.po_amount,
  twm.receipt_amount,
  twm.invoice_amount,
  twm.variance_percent,
  twm.match_status,
  twm.is_match_ok,
  twm.hold_reason
FROM three_way_match_details twm
JOIN purchase_order_headers poh ON poh.po_id = twm.po_id
LEFT JOIN purchase_order_lines pol ON pol.pol_id = twm.po_line_id
WHERE twm.is_match_ok = FALSE
  OR ABS(twm.variance_percent) > twm.tolerance_percent
ORDER BY ABS(twm.variance_percent) DESC;

COMMENT ON VIEW v_three_way_match_exceptions IS 'Three-way matching exceptions with variances exceeding tolerance';

-- View: Vendor Performance Ranking
CREATE OR REPLACE VIEW v_vendor_performance_ranking AS
SELECT
  vps.vendor_id,
  v.vendor_name,
  vps.entity_id,
  vps.overall_rating,
  vps.overall_rank,
  vps.on_time_delivery_percent,
  vps.defect_rate_percent,
  vps.rejection_rate_percent,
  vps.total_spend,
  vps.total_orders,
  RANK() OVER (ORDER BY vps.overall_rating DESC) AS performance_rank
FROM vendor_performance_summary vps
-- Assuming vendors table exists; adjust if needed
CROSS JOIN LATERAL (SELECT vps.vendor_id AS vendor_id, 'Vendor ' || vps.vendor_id AS vendor_name) v
ORDER BY vps.overall_rating DESC;

COMMENT ON VIEW v_vendor_performance_ranking IS 'Vendors ranked by overall performance rating';

-- ============================================================================
-- GRANTS
-- ============================================================================

-- Grant appropriate permissions (adjust based on your database user)
-- GRANT SELECT, INSERT, UPDATE ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- ============================================================================
-- END OF MIGRATION 053
-- ============================================================================
