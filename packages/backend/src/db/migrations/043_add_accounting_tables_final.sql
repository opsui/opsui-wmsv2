-- ============================================================================
-- ACCOUNTING & FINANCIAL TABLES (Final version - works with existing schema)
-- Creates tables for inventory valuation, financial transactions,
-- and accounting based on the actual database schema
-- ============================================================================

-- ============================================================================
-- 1. ENHANCED SKU TABLE WITH PRICING
-- ============================================================================

ALTER TABLE skus ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS selling_price DECIMAL(10, 2) DEFAULT 0.00;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS valuation_method VARCHAR(20) DEFAULT 'FIFO' CHECK (valuation_method IN ('FIFO', 'LIFO', 'WEIGHTED_AVERAGE', 'STANDARD_COST'));
ALTER TABLE skus ADD COLUMN IF NOT EXISTS last_received TIMESTAMP;
ALTER TABLE skus ADD COLUMN IF NOT EXISTS last_cost_update TIMESTAMP;

-- Add unit_cost to inventory_units if not exists
ALTER TABLE inventory_units ADD COLUMN IF NOT EXISTS unit_cost DECIMAL(10, 2) DEFAULT 0.00;

-- ============================================================================
-- 2. ORDERS TABLE - ADD TOTAL_AMOUNT
-- ============================================================================

ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount DECIMAL(12, 2) DEFAULT 0.00;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_weight DECIMAL(10, 2);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS shipping_cost DECIMAL(10, 2) DEFAULT 0.00;

-- ============================================================================
-- 3. ACCOUNTING RECEIPTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS acct_receipts (
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

CREATE INDEX IF NOT EXISTS idx_acct_receipts_date ON acct_receipts(receipt_date);
CREATE INDEX IF NOT EXISTS idx_acct_receipts_supplier ON acct_receipts(supplier_id);

-- Accounting receipt line items
CREATE TABLE IF NOT EXISTS acct_receipt_lines (
  line_id VARCHAR(255) PRIMARY KEY,
  receipt_id VARCHAR(255) NOT NULL REFERENCES acct_receipts(receipt_id) ON DELETE CASCADE,
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

CREATE INDEX IF NOT EXISTS idx_acct_receipt_lines_receipt ON acct_receipt_lines(receipt_id);
CREATE INDEX IF NOT EXISTS idx_acct_receipt_lines_sku ON acct_receipt_lines(sku);

-- ============================================================================
-- 4. ACCOUNTING SHIPMENTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS acct_shipments (
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

CREATE INDEX IF NOT EXISTS idx_acct_shipments_order ON acct_shipments(order_id);
CREATE INDEX IF NOT EXISTS idx_acct_shipments_tracking ON acct_shipments(tracking_number);
CREATE INDEX IF NOT EXISTS idx_acct_shipments_status ON acct_shipments(status);
CREATE INDEX IF NOT EXISTS idx_acct_shipments_date ON acct_shipments(shipping_date);

-- ============================================================================
-- 5. RECEIVING EXCEPTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS receiving_exceptions (
  exception_id VARCHAR(255) PRIMARY KEY,
  receipt_line_id VARCHAR(255),
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

CREATE INDEX IF NOT EXISTS idx_exceptions_sku ON receiving_exceptions(sku);
CREATE INDEX IF NOT EXISTS idx_exceptions_status ON receiving_exceptions(resolution);
CREATE INDEX IF NOT EXISTS idx_exceptions_date ON receiving_exceptions(created_at);

-- ============================================================================
-- 6. QUALITY INSPECTIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS quality_inspections (
  inspection_id VARCHAR(255) PRIMARY KEY,
  sku VARCHAR(50) NOT NULL REFERENCES skus(sku) ON DELETE RESTRICT,
  receipt_line_id VARCHAR(255),
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
-- 7. FINANCIAL TRANSACTIONS
-- ============================================================================

DO $$ BEGIN
  CREATE TYPE financial_transaction_type AS ENUM (
    'REVENUE', 'EXPENSE', 'PAYMENT', 'REFUND', 'ADJUSTMENT', 'TRANSFER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

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
-- 8. ACCOUNTS RECEIVABLE
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
-- 9. ACCOUNTS PAYABLE
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
  receipt_id VARCHAR(255) REFERENCES acct_receipts(receipt_id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ap_vendor ON accounts_payable(vendor_id);
CREATE INDEX IF NOT EXISTS idx_ap_status ON accounts_payable(status);
CREATE INDEX IF NOT EXISTS idx_ap_due_date ON accounts_payable(due_date);

-- ============================================================================
-- 10. SUPPLIERS TABLE
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
-- 11. CUSTOMERS TABLE
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
-- 12. RETURN AUTHORIZATIONS
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
-- 13. INITIAL SAMPLE DATA (for demonstration)
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
  unit_cost = COALESCE(EXCLUDED.unit_cost, skus.unit_cost),
  selling_price = COALESCE(EXCLUDED.selling_price, skus.selling_price);

-- Update inventory_units with unit costs
UPDATE inventory_units SET unit_cost = 15.00 WHERE sku = 'SKU10001' AND (unit_cost IS NULL OR unit_cost = 0);
UPDATE inventory_units SET unit_cost = 45.00 WHERE sku = 'SKU10002' AND (unit_cost IS NULL OR unit_cost = 0);
UPDATE inventory_units SET unit_cost = 120.00 WHERE sku = 'SKU10003' AND (unit_cost IS NULL OR unit_cost = 0);
UPDATE inventory_units SET unit_cost = 18.00 WHERE sku = 'SKU10004' AND (unit_cost IS NULL OR unit_cost = 0);
UPDATE inventory_units SET unit_cost = 2.50 WHERE sku = 'SKU10005' AND (unit_cost IS NULL OR unit_cost = 0);

-- Add sample accounting receipts
INSERT INTO acct_receipts (receipt_id, supplier_id, supplier_name, purchase_order_number, receipt_date) VALUES
  ('ACCT-RCP-001', 'SUP-001', 'Acme Corp', 'PO-2024-001', '2024-01-15'),
  ('ACCT-RCP-002', 'SUP-002', 'Global Imports Inc', 'PO-2024-002', '2024-01-20'),
  ('ACCT-RCP-003', 'SUP-003', 'Pacific Supplies', 'PO-2024-003', '2024-01-25')
ON CONFLICT (receipt_id) DO NOTHING;

-- Add sample accounting receipt lines
INSERT INTO acct_receipt_lines (line_id, receipt_id, sku, description, quantity_ordered, quantity_received, unit_cost) VALUES
  ('ACCT-RCP-L-001', 'ACCT-RCP-001', 'SKU10001', 'Wireless Mouse', 500, 500, 15.00),
  ('ACCT-RCP-L-002', 'ACCT-RCP-002', 'SKU10002', 'Mechanical Keyboard', 200, 200, 45.00),
  ('ACCT-RCP-L-003', 'ACCT-RCP-003', 'SKU10003', 'Office Chair', 50, 50, 120.00)
ON CONFLICT (line_id) DO NOTHING;

-- Update orders with amounts
UPDATE orders SET total_amount = 1250.00 WHERE order_id = 'ORD-001' AND (total_amount IS NULL OR total_amount = 0);
UPDATE orders SET total_amount = 3200.00 WHERE order_id = 'ORD-002' AND (total_amount IS NULL OR total_amount = 0);
UPDATE orders SET total_amount = 450.00 WHERE order_id = 'ORD-003' AND (total_amount IS NULL OR total_amount = 0);

-- Add sample financial transactions
INSERT INTO financial_transactions (transaction_id, transaction_type, amount, reference_type, reference_id, description, account, status) VALUES
  ('TXN-001', 'REVENUE', 1250.00, 'ORDER', 'ORD-001', 'Order ORD-001 - Shipment', 'RECEIVABLES', 'POSTED'),
  ('TXN-002', 'EXPENSE', 450.00, 'RECEIPT', 'ACCT-RCP-001', 'Inventory - SKU10001', 'PAYABLES', 'POSTED'),
  ('TXN-003', 'PAYMENT', 2800.00, 'GENERAL', 'PAY-001', 'Vendor Payment - Acme Corp', 'PAYABLES', 'CLEARED')
ON CONFLICT (transaction_id) DO NOTHING;

-- Add sample accounts receivable
INSERT INTO accounts_receivable (receivable_id, customer_id, customer_name, invoice_number, invoice_date, due_date, amount, balance, status, order_id) VALUES
  ('AR-001', 'CUST-001', 'Tech Retailers LLC', 'INV-2024-001', '2024-01-10', '2024-02-10', 1250.00, 1250.00, 'OPEN', 'ORD-001'),
  ('AR-002', 'CUST-002', 'Global Electronics', 'INV-2024-002', '2024-01-15', '2024-03-01', 3200.00, 3200.00, 'OPEN', 'ORD-002'),
  ('AR-003', 'CUST-003', 'QuickMart Stores', 'INV-2024-003', '2024-01-20', '2024-02-05', 450.00, 450.00, 'OPEN', 'ORD-003')
ON CONFLICT (invoice_number) DO NOTHING;

-- Add sample accounts payable
INSERT INTO accounts_payable (payable_id, vendor_id, vendor_name, invoice_number, invoice_date, due_date, amount, balance, status, receipt_id) VALUES
  ('AP-001', 'SUP-001', 'Acme Corp', 'VENDOR-INV-001', '2024-01-15', '2024-02-15', 7500.00, 7500.00, 'OPEN', 'ACCT-RCP-001'),
  ('AP-002', 'SUP-002', 'Global Imports Inc', 'VENDOR-INV-002', '2024-01-20', '2024-03-05', 9000.00, 9000.00, 'OPEN', 'ACCT-RCP-002'),
  ('AP-003', 'SUP-003', 'Pacific Supplies', 'VENDOR-INV-003', '2024-01-25', '2024-02-10', 6000.00, 6000.00, 'OPEN', 'ACCT-RCP-003')
ON CONFLICT (invoice_number) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE financial_transactions IS 'Financial transactions for accounting';
COMMENT ON TABLE acct_receipts IS 'Accounting inbound receiving records from suppliers';
COMMENT ON TABLE acct_shipments IS 'Accounting outbound shipping records to customers';
COMMENT ON TABLE receiving_exceptions IS 'Discrepancies found during receiving';
COMMENT ON TABLE quality_inspections IS 'Quality control inspection records';
COMMENT ON TABLE accounts_receivable IS 'Accounts receivable - money owed by customers';
COMMENT ON TABLE accounts_payable IS 'Accounts payable - money owed to vendors';
