-- ============================================================================
-- ACCOUNTING & FINANCIAL TABLES
-- Creates tables for inventory valuation, financial transactions,
-- receiving, shipping, and quality control for accounting
-- ============================================================================

-- ============================================================================
-- 1. ENHANCED SKU TABLE WITH PRICING
-- ============================================================================

-- Add pricing columns to skus table if they don't exist
ALTER TABLE skus ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS valuation_method VARCHAR(20) DEFAULT 'FIFO' CHECK (valuation_method IN ('FIFO', 'LIFO', 'WEIGHTED_AVERAGE', 'STANDARD_COST'));
ALTER TABLE skus ADD COLUMN IF NOT EXISTS last_received TIMESTAMP;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS last_cost_update TIMESTAMP;

-- ============================================================================
-- 2. ENHANCED INVENTORY TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS inventory (
  inventory_id VARCHAR(255) PRIMARY KEY,
  sku VARCHAR(50) NOT NULL REFERENCES skus(sku) ON DELETE CASCADE,
  zone VARCHAR(10) NOT NULL,
  bin_location VARCHAR(50) NOT NULL,
  quantity_on_hand INTEGER NOT NULL DEFAULT 0,
  quantity_reserved INTEGER NOT NULL DEFAULT 0,
  quantity_available INTEGER NOT NULL GENERATED ALWAYS AS (quantity_on_hand - quantity_reserved) STORED,
  unit_cost DECIMAL(10, 2) NOT NULL DEFAULT 0.00,
  total_value DECIMAL(12, 2) GENERATED ALWAYS AS (quantity_on_hand * unit_cost) STORED,
  last_counted_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_inventory_sku ON inventory(sku);
CREATE INDEX IF NOT EXISTS idx_inventory_zone ON inventory(zone);
CREATE INDEX IF NOT EXISTS idx_inventory_bin ON inventory(bin_location);

-- ============================================================================
-- 3. ORDERS TABLE - ADD TOTAL_AMOUNT
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_weight DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10, 2) DEFAULT 0.00;

-- ============================================================================
-- 4. RECEIPTS (INBOUND RECEIVING)
-- ============================================================================

-- Add columns to receipts table if it exists and is missing columns
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS supplier_id VARCHAR(100);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS supplier_name VARCHAR(255);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS purchase_order_number VARCHAR(100);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS receipt_date DATE DEFAULT CURRENT_DATE;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS received_by VARCHAR(20);
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS created_at TIMESTAMP DEFAULT NOW();
ALTER TABLE receipts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP DEFAULT NOW();

-- Ensure NOT NULL constraints (only if column exists and doesn't have constraint)
-- We'll skip these for safety since the table might have data

CREATE TABLE IF NOT EXISTS receipts (
  receipt_id VARCHAR(255) PRIMARY KEY,
  supplier_id VARCHAR(100) NOT NULL,
  supplier_name VARCHAR(255) NOT NULL,
  purchase_order_number VARCHAR(100),
  receipt_date DATE NOT NULL DEFAULT CURRENT_DATE,
  received_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipts_date ON receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_receipts_supplier ON receipts(supplier_id);

-- Receipt line items
CREATE TABLE IF NOT EXISTS receipt_lines (
  line_id VARCHAR(255) PRIMARY KEY,
  receipt_id VARCHAR(255) NOT NULL REFERENCES receipts(receipt_id) ON DELETE CASCADE,
  sku VARCHAR(50) NOT NULL REFERENCES skus(sku) ON DELETE RESTRICT,
  description TEXT,
  quantity_ordered INTEGER NOT NULL,
  quantity_received INTEGER NOT NULL,
  quantity_accepted INTEGER NOT NULL DEFAULT 0,
  unit_cost DECIMAL(10, 2) NOT NULL,
  total_cost DECIMAL(12, 2) GENERATED ALWAYS AS (quantity_received * unit_cost) STORED,
  lot_number VARCHAR(100),
  expiry_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_receipt_lines_receipt ON receipt_lines(receipt_id);
CREATE INDEX IF NOT EXISTS idx_receipt_lines_sku ON receipt_lines(sku);

-- ============================================================================
-- 5. SHIPMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS shipments (
  shipment_id VARCHAR(255) PRIMARY KEY,
  order_id VARCHAR(30) REFERENCES orders(order_id) ON DELETE SET NULL,
  carrier VARCHAR(50) NOT NULL,
  tracking_number VARCHAR(255),
  shipping_date DATE NOT NULL DEFAULT CURRENT_DATE,
  shipped_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  shipping_cost DECIMAL(10, 2) DEFAULT 0.00,
  shipping_weight DECIMAL(10, 2),
  destination_address TEXT,
  destination_city VARCHAR(100),
  destination_state VARCHAR(100),
  destination_postal_code VARCHAR(20),
  status VARCHAR(50) DEFAULT 'SHIPPED' CHECK (status IN ('PENDING', 'SHIPPED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED', 'CANCELLED')),
  estimated_delivery_date DATE,
  actual_delivery_date DATE,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_order ON shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_shipments_tracking ON shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_shipments_status ON shipments(status);
CREATE INDEX IF NOT EXISTS idx_shipments_date ON shipments(shipping_date);

-- ============================================================================
-- 6. RECEIVING EXCEPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS receiving_exceptions (
  exception_id VARCHAR(255) PRIMARY KEY,
  receipt_line_id VARCHAR(255) REFERENCES receipt_lines(line_id) ON DELETE SET NULL,
  sku VARCHAR(50) NOT NULL,
  exception_type VARCHAR(50) NOT NULL CHECK (exception_type IN ('DAMAGED', 'SHORTAGE', 'EXCESS', 'WRONG_ITEM', 'QUALITY_ISSUE')),
  variance INTEGER NOT NULL,
  unit_cost DECIMAL(10, 2),
  variance_cost DECIMAL(12, 2),
  resolution VARCHAR(50) CHECK (resolution IN ('PENDING', 'ACCEPTED', 'RETURNED', 'WRITE_OFF', 'CREDIT_REQUESTED')),
  credit_requested DECIMAL(10, 2) DEFAULT 0.00,
  credit_approved DECIMAL(10, 2) DEFAULT 0.00,
  notes TEXT,
  reported_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_exceptions_receipt ON receiving_exceptions(receipt_line_id);
CREATE INDEX IF NOT EXISTS idx_exceptions_sku ON receiving_exceptions(sku);
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON receiving_exceptions(resolution);
CREATE INDEX IF NOT EXISTS idx_exceptions_date ON receiving_exceptions(created_at);

-- ============================================================================
-- 7. QUALITY INSPECTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS quality_inspections (
  inspection_id VARCHAR(255) PRIMARY KEY,
  sku VARCHAR(50) NOT NULL REFERENCES skus(sku) ON DELETE RESTRICT,
  receipt_line_id VARCHAR(255) REFERENCES receipt_lines(line_id) ON DELETE SET NULL,
  inspection_date DATE NOT NULL DEFAULT CURRENT_DATE,
  inspected_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  quantity_inspected INTEGER NOT NULL,
  quantity_passed INTEGER NOT NULL DEFAULT 0,
  quantity_failed INTEGER NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL CHECK (status IN ('PENDING', 'IN_PROGRESS', 'PASSED', 'FAILED', 'QUARANTINED')),
  failure_reason TEXT,
  lot_number VARCHAR(100),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_qc_sku ON quality_inspections(sku);
CREATE INDEX IF NOT EXISTS idx_qc_date ON quality_inspections(inspection_date);
CREATE INDEX IF NOT EXISTS idx_qc_status ON quality_inspections(status);

-- ============================================================================
-- 8. FINANCIAL TRANSACTIONS
-- ============================================================================

CREATE TYPE financial_transaction_type AS ENUM (
  'REVENUE', 'EXPENSE', 'PAYMENT', 'REFUND', 'ADJUSTMENT', 'TRANSFER'
);

CREATE TABLE IF NOT EXISTS financial_transactions (
  transaction_id VARCHAR(255) PRIMARY KEY,
  transaction_type financial_transaction_type NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'USD',
  reference_type VARCHAR(50) NOT NULL CHECK (reference_type IN ('ORDER', 'RETURN', 'EXCEPTION', 'GENERAL', 'RECEIPT', 'SHIPMENT')),
  reference_id VARCHAR(255),
  description TEXT NOT NULL,
  customer_id VARCHAR(100),
  vendor_id VARCHAR(100),
  account VARCHAR(50) NOT NULL CHECK (account IN ('RECEIVABLES', 'PAYABLES', 'CASH', 'BANK', 'INVENTORY', 'REVENUE', 'EXPENSE')),
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'POSTED', 'CLEARED', 'CANCELLED')),
  due_date DATE,
  created_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  approved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_txns_type ON financial_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_financial_txns_reference ON financial_transactions(reference_type, reference_id);
CREATE INDEX IF NOT EXISTS idx_financial_txns_account ON financial_transactions(account);
CREATE INDEX IF NOT EXISTS idx_financial_txns_status ON financial_transactions(status);
CREATE INDEX IF NOT EXISTS idx_financial_txns_date ON financial_transactions(created_at DESC);

-- ============================================================================
-- 9. ACCOUNTS RECEIVABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts_receivable (
  receivable_id VARCHAR(255) PRIMARY KEY,
  customer_id VARCHAR(100) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  balance DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIAL', 'PAID', 'OVERDUE', 'WRITE_OFF')),
  order_id VARCHAR(30) REFERENCES orders(order_id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ar_customer ON accounts_receivable(customer_id);
CREATE INDEX IF NOT EXISTS idx_ar_status ON accounts_receivable(status);
CREATE INDEX IF NOT EXISTS idx_ar_due_date ON accounts_receivable(due_date);

-- ============================================================================
-- 10. ACCOUNTS PAYABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS accounts_payable (
  payable_id VARCHAR(255) PRIMARY KEY,
  vendor_id VARCHAR(100) NOT NULL,
  vendor_name VARCHAR(255) NOT NULL,
  invoice_number VARCHAR(100) UNIQUE NOT NULL,
  invoice_date DATE NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  balance DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'OPEN' CHECK (status IN ('OPEN', 'PARTIAL', 'PAID', 'OVERDUE', 'DISPUTED')),
  receipt_id VARCHAR(255) REFERENCES receipts(receipt_id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ap_vendor ON accounts_payable(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_status ON accounts_payable(status);
CREATE INDEX IF NOT EXISTS idx_ap_due_date ON accounts_payable(due_date);

-- ============================================================================
-- 11. SUPPLIERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS suppliers (
  supplier_id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255),
  phone VARCHAR(50),
  address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(50) DEFAULT 'USA',
  payment_terms VARCHAR(50) DEFAULT 'NET_30',
  tax_id VARCHAR(50),
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_suppliers_active ON suppliers(active) WHERE active = true;

-- ============================================================================
-- 12. CUSTOMERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS customers (
  customer_id VARCHAR(100) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  contact_person VARCHAR(255),
  email VARCHAR(255) UNIQUE,
  phone VARCHAR(50),
  billing_address TEXT,
  shipping_address TEXT,
  city VARCHAR(100),
  state VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(50) DEFAULT 'USA',
  credit_limit DECIMAL(12, 2) DEFAULT 0.00,
  credit_terms VARCHAR(50) DEFAULT 'PREPAY',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_customers_active ON customers(active) WHERE active = true;

-- ============================================================================
-- 13. RETURN AUTHORIZATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS return_authorizations (
  rma_id VARCHAR(255) PRIMARY KEY,
  order_id VARCHAR(30) REFERENCES orders(order_id) ON DELETE SET NULL,
  customer_id VARCHAR(100) NOT NULL,
  customer_name VARCHAR(255) NOT NULL,
  rma_date DATE NOT NULL DEFAULT CURRENT_DATE,
  reason TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'RECEIVED', 'PROCESSED', 'REFUNDED')),
  total_refund_amount DECIMAL(10, 2) DEFAULT 0.00,
  credit_approved DECIMAL(10, 2) DEFAULT 0.00,
  notes TEXT,
  created_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rma_order ON return_authorizations(order_id);
CREATE INDEX IF NOT EXISTS idx_rma_customer ON return_authorizations(customer_id);
CREATE INDEX IF NOT EXISTS idx_rma_status ON return_authorizations(status);

-- ============================================================================
-- 14. UPDATED_AT TRIGGER FUNCTION
-- ============================================================================

CREATE OR REPLACE FUNCTION update_inventory_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_inventory_updated_at ON inventory;
CREATE TRIGGER trigger_inventory_updated_at
  BEFORE UPDATE ON inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_inventory_updated_at();

-- ============================================================================
-- 15. INITIAL SAMPLE DATA (for demonstration)
-- ============================================================================

-- Add sample suppliers
INSERT INTO suppliers (supplier_id, name, contact_person, email, phone, payment_terms) VALUES
  ('SUP-001', 'Acme Corp', 'John Smith', 'john@acme.com', '555-0100', 'NET_30'),
  ('SUP-002', 'Global Imports Inc', 'Jane Doe', 'jane@globalimports.com', '555-0200', 'NET_45'),
  ('SUP-003', 'Pacific Supplies', 'Bob Johnson', 'bob@pacific.com', '555-0300', 'NET_15')
ON CONFLICT (supplier_id) DO NOTHING;

-- Add sample customers
INSERT INTO customers (customer_id, name, email, phone, city, state, postal_code, credit_limit, credit_terms) VALUES
  ('CUST-001', 'Tech Retailers LLC', 'orders@techretailers.com', '555-1000', 'San Francisco', 'CA', '94102', 50000.00, 'NET_30'),
  ('CUST-002', 'Global Electronics', 'purchasing@globalelec.com', '555-2000', 'New York', 'NY', '10001', 100000.00, 'NET_45'),
  ('CUST-003', 'QuickMart Stores', 'merchandise@quickmart.com', '555-3000', 'Chicago', 'IL', '60601', 25000.00, 'PREPAY')
ON CONFLICT (customer_id) DO NOTHING;

-- Add sample SKUs with pricing
INSERT INTO skus (sku, name, description, category, unit_cost, selling_price, valuation_method) VALUES
  ('SKU10001', 'Wireless Mouse', 'Ergonomic wireless mouse with precision tracking', 'Electronics', 15.00, 29.99, 'FIFO'),
  ('SKU10002', 'Mechanical Keyboard', 'RGB mechanical keyboard with blue switches', 'Electronics', 45.00, 89.99, 'FIFO'),
  ('SKU10003', 'Office Chair', 'Ergonomic office chair with lumbar support', 'Furniture', 120.00, 249.99, 'WEIGHTED_AVERAGE'),
  ('SKU10004', 'Desk Lamp LED', 'Adjustable LED desk lamp', 'Office Supplies', 18.00, 34.99, 'FIFO'),
  ('SKU10005', 'Notebook A5', 'Lined notebook A5 size', 'Office Supplies', 2.50, 5.99, 'FIFO')
ON CONFLICT (sku) DO UPDATE SET
  unit_cost = EXCLUDED.unit_cost,
  selling_price = EXCLUDED.selling_price;

-- Add sample inventory
INSERT INTO inventory (inventory_id, sku, zone, bin_location, quantity_on_hand, quantity_reserved, unit_cost) VALUES
  ('INV-001', 'SKU10001', 'A', 'A-01-01', 500, 50, 15.00),
  ('INV-002', 'SKU10001', 'A', 'A-01-02', 300, 0, 15.00),
  ('INV-003', 'SKU10002', 'A', 'A-02-01', 200, 0, 45.00),
  ('INV-004', 'SKU10003', 'B', 'B-01-01', 50, 0, 120.00),
  ('INV-005', 'SKU10004', 'B', 'B-02-01', 800, 0, 18.00),
  ('INV-006', 'SKU10005', 'C', 'C-01-01', 2000, 0, 2.50)
ON CONFLICT (inventory_id) DO NOTHING;

-- Add sample orders
INSERT INTO orders (order_id, customer_id, customer_name, total_amount, status) VALUES
  ('ORD-001', 'CUST-001', 'Tech Retailers LLC', 1250.00, 'SHIPPED'),
  ('ORD-002', 'CUST-002', 'Global Electronics', 3200.00, 'PICKING'),
  ('ORD-003', 'CUST-003', 'QuickMart Stores', 450.00, 'PACKED')
ON CONFLICT (order_id) DO NOTHING;

-- Add sample financial transactions
INSERT INTO financial_transactions (transaction_id, transaction_type, amount, reference_type, reference_id, description, account, status) VALUES
  ('TXN-001', 'REVENUE', 1250.00, 'ORDER', 'ORD-001', 'Order SO0001 - Shipment', 'RECEIVABLES', 'POSTED'),
  ('TXN-002', 'EXPENSE', 450.00, 'RECEIPT', 'RCP-001', 'Inventory - SKU10050', 'PAYABLES', 'POSTED'),
  ('TXN-003', 'PAYMENT', 2800.00, 'GENERAL', 'PAY-001', 'Vendor Payment - Acme Corp', 'PAYABLES', 'CLEARED')
ON CONFLICT (transaction_id) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE financial_transactions IS 'Financial transactions for accounting';
COMMENT ON TABLE inventory IS 'Enhanced inventory with valuation and costing';
COMMENT ON TABLE receipts IS 'Inbound receiving records from suppliers';
COMMENT ON TABLE shipments IS 'Outbound shipping records to customers';
COMMENT ON TABLE receiving_exceptions IS 'Discrepancies found during receiving';
COMMENT ON TABLE quality_inspections IS 'Quality control inspection records';
COMMENT ON TABLE accounts_receivable IS 'Accounts receivable - money owed by customers';
COMMENT ON TABLE accounts_payable IS 'Accounts payable - money owed to vendors';
