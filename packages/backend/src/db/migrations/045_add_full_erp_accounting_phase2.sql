-- ============================================================================
-- FULL ERP ACCOUNTING FEATURES - PHASE 2: OPERATIONAL FEATURES
-- Enhanced Accounts Receivable/Payable, Cash Management, Revenue Recognition
-- ============================================================================

-- ============================================================================
-- 1. ENHANCED ACCOUNTS RECEIVABLE
-- ============================================================================

-- Add aging columns to existing accounts_receivable table
ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS discount_taken DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS last_payment_date DATE;
ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS aging_30 DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS aging_60 DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS aging_90 DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS aging_120 DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS credit_limit DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE accounts_receivable ADD COLUMN IF NOT EXISTS terms VARCHAR(50) DEFAULT 'NET_30';

CREATE INDEX IF NOT EXISTS idx_ar_aging ON accounts_receivable(aging_30, aging_60, aging_90, aging_120);
CREATE INDEX IF NOT EXISTS idx_ar_last_payment ON accounts_receivable(last_payment_date);

-- AR Payments table
CREATE TABLE IF NOT EXISTS acct_ar_payments (
  payment_id VARCHAR(20) PRIMARY KEY,
  receivable_id VARCHAR(255) NOT NULL REFERENCES accounts_receivable(receivable_id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  amount DECIMAL(12, 2) NOT NULL,
  reference_number VARCHAR(100),
  notes TEXT,
  created_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arp_receivable ON acct_ar_payments(receivable_id);
CREATE INDEX IF NOT EXISTS idx_arp_date ON acct_ar_payments(payment_date);

-- Credit memos table
CREATE TABLE IF NOT EXISTS acct_credit_memos (
  memo_id VARCHAR(20) PRIMARY KEY,
  receivable_id VARCHAR(255) REFERENCES accounts_receivable(receivable_id) ON DELETE SET NULL,
  memo_number VARCHAR(100) UNIQUE NOT NULL,
  memo_date DATE NOT NULL,
  reason TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'APPROVED',
  approved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cm_receivable ON acct_credit_memos(receivable_id);
CREATE INDEX IF NOT EXISTS idx_cm_status ON acct_credit_memos(status);
CREATE INDEX IF NOT EXISTS idx_cm_date ON acct_credit_memos(memo_date);

-- Collections/Dunning workflow table
CREATE TABLE IF NOT EXISTS acct_collection_activities (
  activity_id VARCHAR(20) PRIMARY KEY,
  receivable_id VARCHAR(255) NOT NULL REFERENCES accounts_receivable(receivable_id) ON DELETE CASCADE,
  activity_type VARCHAR(50) NOT NULL CHECK (activity_type IN ('CALL', 'EMAIL', 'LETTER', 'VISIT')),
  activity_date DATE NOT NULL,
  notes TEXT,
  outcome VARCHAR(100),
  follow_up_date DATE,
  created_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ca_receivable ON acct_collection_activities(receivable_id);

-- ============================================================================
-- 2. ENHANCED ACCOUNTS PAYABLE
-- ============================================================================

-- Add columns to existing accounts_payable table
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS discount_taken DECIMAL(10, 2) DEFAULT 0;
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS invoice_received_date DATE;
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS approved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL;
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP;
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS payment_due_date DATE;
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS terms VARCHAR(50) DEFAULT 'NET_30';
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS aging_30 DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS aging_60 DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS aging_90 DECIMAL(12, 2) DEFAULT 0;
ALTER TABLE accounts_payable ADD COLUMN IF NOT EXISTS aging_120 DECIMAL(12, 2) DEFAULT 0;

CREATE INDEX IF NOT EXISTS idx_ap_aging ON accounts_payable(aging_30, aging_60, aging_90, aging_120);

-- AP Payments table
CREATE TABLE IF NOT EXISTS acct_ap_payments (
  payment_id VARCHAR(20) PRIMARY KEY,
  payable_id VARCHAR(255) NOT NULL REFERENCES accounts_payable(payable_id) ON DELETE CASCADE,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50),
  amount DECIMAL(12, 2) NOT NULL,
  reference_number VARCHAR(100),
  notes TEXT,
  created_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_payable ON acct_ap_payments(payable_id);
CREATE INDEX IF NOT EXISTS idx_app_date ON acct_ap_payments(payment_date);

-- Vendor credit memos
CREATE TABLE IF NOT EXISTS acct_vendor_credit_memos (
  memo_id VARCHAR(20) PRIMARY KEY,
  payable_id VARCHAR(255) REFERENCES accounts_payable(payable_id) ON DELETE SET NULL,
  memo_number VARCHAR(100) UNIQUE NOT NULL,
  memo_date DATE NOT NULL,
  reason TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'APPROVED',
  approved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_vcm_payable ON acct_vendor_credit_memos(payable_id);

-- Payment scheduling
CREATE TABLE IF NOT EXISTS acct_payment_schedules (
  schedule_id VARCHAR(20) PRIMARY KEY,
  payable_id VARCHAR(255) NOT NULL REFERENCES accounts_payable(payable_id) ON DELETE CASCADE,
  scheduled_payment_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'SCHEDULED',
  paid_amount DECIMAL(12, 2) DEFAULT 0,
  paid_date DATE,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ps_payable ON acct_payment_schedules(payable_id);
CREATE INDEX IF NOT EXISTS idx_ps_date ON acct_payment_schedules(scheduled_payment_date);
CREATE INDEX IF NOT EXISTS idx_ps_status ON acct_payment_schedules(status);

-- ============================================================================
-- 3. CASH MANAGEMENT
-- ============================================================================

-- Bank accounts table
CREATE TABLE IF NOT EXISTS acct_bank_accounts (
  bank_account_id VARCHAR(20) PRIMARY KEY,
  account_number VARCHAR(50) NOT NULL,
  account_name VARCHAR(255) NOT NULL,
  bank_name VARCHAR(255) NOT NULL,
  routing_number VARCHAR(50),
  account_type VARCHAR(50) DEFAULT 'CHECKING',
  currency VARCHAR(3) DEFAULT 'USD',
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ba_active ON acct_bank_accounts(is_active) WHERE is_active = true;

-- Bank reconciliations table
CREATE TABLE IF NOT EXISTS acct_bank_reconciliations (
  reconciliation_id VARCHAR(20) PRIMARY KEY,
  bank_account_id VARCHAR(20) NOT NULL REFERENCES acct_bank_accounts(bank_account_id),
  statement_date DATE NOT NULL,
  statement_balance DECIMAL(12, 2) NOT NULL,
  book_balance DECIMAL(12, 2) NOT NULL,
  difference DECIMAL(12, 2) NOT NULL DEFAULT 0,
  status VARCHAR(50) DEFAULT 'IN_PROGRESS',
  reconciled_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  reconciled_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_br_bank ON acct_bank_reconciliations(bank_account_id);
CREATE INDEX IF NOT EXISTS idx_br_status ON acct_bank_reconciliations(status);
CREATE INDEX IF NOT EXISTS idx_br_date ON acct_bank_reconciliations(statement_date);

-- Reconciliation items table
CREATE TABLE IF NOT EXISTS acct_reconciliation_items (
  item_id VARCHAR(20) PRIMARY KEY,
  reconciliation_id VARCHAR(20) NOT NULL REFERENCES acct_bank_reconciliations(reconciliation_id) ON DELETE CASCADE,
  transaction_type VARCHAR(50) NOT NULL,
  transaction_date DATE NOT NULL,
  description TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  is_cleared BOOLEAN NOT NULL DEFAULT false,
  reference_number VARCHAR(100),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ri_reconciliation ON acct_reconciliation_items(reconciliation_id);
CREATE INDEX IF NOT EXISTS idx_ri_cleared ON acct_reconciliation_items(is_cleared);

-- Cash position tracking
CREATE TABLE IF NOT EXISTS acct_cash_positions (
  position_id VARCHAR(20) PRIMARY KEY,
  as_of_date DATE NOT NULL,
  cash_on_hand DECIMAL(12, 2) NOT NULL,
  cash_in_bank DECIMAL(12, 2) NOT NULL,
  total_cash DECIMAL(12, 2) GENERATED ALWAYS AS (cash_on_hand + cash_in_bank) STORED,
  accounts_receivable DECIMAL(12, 2) DEFAULT 0,
  accounts_payable DECIMAL(12, 2) DEFAULT 0,
  net_cash DECIMAL(12, 2) GENERATED ALWAYS AS (cash_on_hand + cash_in_bank + accounts_receivable - accounts_payable) STORED,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cp_date ON acct_cash_positions(as_of_date);

-- Cash flow forecast
CREATE TABLE IF NOT EXISTS acct_cash_flow_forecasts (
  forecast_id VARCHAR(20) PRIMARY KEY,
  forecast_date DATE NOT NULL,
  category VARCHAR(50) NOT NULL CHECK (category IN ('OPERATING', 'INVESTING', 'FINANCING')),
  forecasted_inflow DECIMAL(12, 2) DEFAULT 0,
  forecasted_outflow DECIMAL(12, 2) DEFAULT 0,
  net_flow DECIMAL(12, 2) GENERATED ALWAYS AS (forecasted_inflow - forecasted_outflow) STORED,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cff_date ON acct_cash_flow_forecasts(forecast_date);
CREATE INDEX IF NOT EXISTS idx_cff_category ON acct_cash_flow_forecasts(category);

-- ============================================================================
-- 4. REVENUE RECOGNITION
-- ============================================================================

-- Revenue recognition method enum
DO $$ BEGIN
  CREATE TYPE revenue_recognition_method AS ENUM ('INSTANT', 'MILESTONE', 'RATABLE', 'DEFERRED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Revenue contracts table
CREATE TABLE IF NOT EXISTS acct_revenue_contracts (
  contract_id VARCHAR(20) PRIMARY KEY,
  contract_number VARCHAR(100) UNIQUE NOT NULL,
  customer_id VARCHAR(100) NOT NULL,
  contract_name VARCHAR(255) NOT NULL,
  total_value DECIMAL(12, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  recognition_method revenue_recognition_method DEFAULT 'INSTANT',
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rc_customer ON acct_revenue_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_rc_status ON acct_revenue_contracts(status);

-- Revenue milestones table
CREATE TABLE IF NOT EXISTS acct_revenue_milestones (
  milestone_id VARCHAR(20) PRIMARY KEY,
  contract_id VARCHAR(20) NOT NULL REFERENCES acct_revenue_contracts(contract_id) ON DELETE CASCADE,
  milestone_name VARCHAR(255) NOT NULL,
  description TEXT,
  target_amount DECIMAL(12, 2) NOT NULL,
  achieved_amount DECIMAL(12, 2) DEFAULT 0,
  percentage DECIMAL(5, 2) NOT NULL,
  target_date DATE,
  achieved_date DATE,
  status VARCHAR(50) DEFAULT 'PENDING',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rm_contract ON acct_revenue_milestones(contract_id);
CREATE INDEX IF NOT EXISTS idx_rm_status ON acct_revenue_milestones(status);

-- Revenue schedule table
CREATE TABLE IF NOT EXISTS acct_revenue_schedule (
  schedule_id VARCHAR(20) PRIMARY KEY,
  contract_id VARCHAR(20) NOT NULL REFERENCES acct_revenue_contracts(contract_id) ON DELETE CASCADE,
  revenue_date DATE NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  recognized_amount DECIMAL(12, 2) DEFAULT 0,
  remaining_amount DECIMAL(12, 2) GENERATED ALWAYS AS (amount - recognized_amount) STORED,
  status VARCHAR(50) DEFAULT 'SCHEDULED',
  recognized_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rs_contract ON acct_revenue_schedule(contract_id);
CREATE INDEX IF NOT EXISTS idx_rs_date ON acct_revenue_schedule(revenue_date);
CREATE INDEX IF NOT EXISTS idx_rs_status ON acct_revenue_schedule(status);

-- Deferred revenue table
CREATE TABLE IF NOT EXISTS acct_deferred_revenue (
  deferral_id VARCHAR(20) PRIMARY KEY,
  contract_id VARCHAR(20) REFERENCES acct_revenue_contracts(contract_id) ON DELETE SET NULL,
  original_amount DECIMAL(12, 2) NOT NULL,
  remaining_amount DECIMAL(12, 2) NOT NULL,
  recognized_amount DECIMAL(12, 2) DEFAULT 0,
  recognition_start_date DATE NOT NULL,
  recognition_end_date DATE NOT NULL,
  monthly_recognition_amount DECIMAL(12, 2),
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_dr_contract ON acct_deferred_revenue(contract_id);
CREATE INDEX IF NOT EXISTS idx_dr_status ON acct_deferred_revenue(status);

-- ============================================================================
-- 5. SAMPLE DATA
-- ============================================================================

-- Sample bank accounts
INSERT INTO acct_bank_accounts (bank_account_id, account_number, account_name, bank_name, routing_number, account_type) VALUES
  ('BANK-001', '987654321', 'Main Operating Account', 'First National Bank', '021000021', 'CHECKING'),
  ('BANK-002', '123456789', 'Payroll Account', 'First National Bank', '021000021', 'CHECKING')
ON CONFLICT (bank_account_id) DO NOTHING;

-- Sample revenue contract
INSERT INTO acct_revenue_contracts (contract_id, contract_number, customer_id, contract_name, total_value, start_date, end_date, recognition_method, created_by) VALUES
  ('REV-CON-001', 'CON-2024-001', 'CUST-001', 'Annual Support Contract', 50000.00, '2024-01-01', '2024-12-31', 'RATABLE', 'USR-ADMIN')
ON CONFLICT (contract_id) DO NOTHING;

-- Sample revenue milestones
INSERT INTO acct_revenue_milestones (milestone_id, contract_id, milestone_name, description, target_amount, percentage, target_date) VALUES
  ('RM-001', 'REV-CON-001', 'Q1 Payment', 'First quarter milestone payment', 12500.00, 25.00, '2024-03-31'),
  ('RM-002', 'REV-CON-001', 'Q2 Payment', 'Second quarter milestone payment', 12500.00, 25.00, '2024-06-30'),
  ('RM-003', 'REV-CON-001', 'Q3 Payment', 'Third quarter milestone payment', 12500.00, 25.00, '2024-09-30'),
  ('RM-004', 'REV-CON-001', 'Q4 Payment', 'Fourth quarter milestone payment', 12500.00, 25.00, '2024-12-31')
ON CONFLICT (milestone_id) DO NOTHING;

-- Sample revenue schedule
INSERT INTO acct_revenue_schedule (schedule_id, contract_id, revenue_date, amount) VALUES
  ('RS-001', 'REV-CON-001', '2024-01-31', 4166.67),
  ('RS-002', 'REV-CON-001', '2024-02-28', 4166.67),
  ('RS-003', 'REV-CON-001', '2024-03-31', 4166.67),
  ('RS-004', 'REV-CON-001', '2024-04-30', 4166.67),
  ('RS-005', 'REV-CON-001', '2024-05-31', 4166.67),
  ('RS-006', 'REV-CON-001', '2024-06-30', 4166.67),
  ('RS-007', 'REV-CON-001', '2024-07-31', 4166.67),
  ('RS-008', 'REV-CON-001', '2024-08-31', 4166.67),
  ('RS-009', 'REV-CON-001', '2024-09-30', 4166.67),
  ('RS-010', 'REV-CON-001', '2024-10-31', 4166.67),
  ('RS-011', 'REV-CON-001', '2024-11-30', 4166.67),
  ('RS-012', 'REV-CON-001', '2024-12-31', 4166.66)
ON CONFLICT (schedule_id) DO NOTHING;

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE acct_ar_payments IS 'Accounts Receivable payment applications';
COMMENT ON TABLE acct_credit_memos IS 'Credit memos for AR adjustments and refunds';
COMMENT ON TABLE acct_collection_activities IS 'Collections/dunning workflow tracking';
COMMENT ON TABLE acct_ap_payments IS 'Accounts Payable payment records';
COMMENT ON TABLE acct_bank_accounts IS 'Bank account definitions for cash management';
COMMENT ON TABLE acct_bank_reconciliations IS 'Bank reconciliation tracking';
COMMENT ON TABLE acct_revenue_contracts IS 'Revenue contracts for milestone/ratable recognition';
COMMENT ON TABLE acct_revenue_milestones IS 'Milestone definitions for revenue recognition';
COMMENT ON TABLE acct_revenue_schedule IS 'Scheduled revenue recognition by period';
COMMENT ON TABLE acct_deferred_revenue IS 'Deferred revenue tracking for ratable recognition';
