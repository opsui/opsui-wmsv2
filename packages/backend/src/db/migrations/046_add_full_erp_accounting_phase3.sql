-- ============================================================================
-- FULL ERP ACCOUNTING FEATURES - PHASE 3: ADVANCED FEATURES
-- Multi-Currency, Budgeting & Forecasting, Fixed Assets, Compliance & Audit Trail
-- ============================================================================

-- ============================================================================
-- 1. MULTI-CURRENCY SUPPORT
-- ============================================================================

-- Currencies table
CREATE TABLE IF NOT EXISTS acct_currencies (
  currency_code CHAR(3) PRIMARY KEY,
  currency_name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curr_active ON acct_currencies(is_active) WHERE is_active = true;

-- Exchange rates table
CREATE TABLE IF NOT EXISTS acct_exchange_rates (
  rate_id VARCHAR(20) PRIMARY KEY,
  from_currency CHAR(3) NOT NULL REFERENCES acct_currencies(currency_code),
  to_currency CHAR(3) NOT NULL REFERENCES acct_currencies(currency_code),
  rate_date DATE NOT NULL,
  exchange_rate DECIMAL(12, 6) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (from_currency, to_currency, rate_date)
);

CREATE INDEX IF NOT EXISTS idx_er_from_to ON acct_exchange_rates(from_currency, to_currency);
CREATE INDEX IF NOT EXISTS idx_er_date ON acct_exchange_rates(rate_date);
CREATE INDEX IF NOT EXISTS idx_er_active ON acct_exchange_rates(is_active) WHERE is_active = true;

-- Currency revaluation table
CREATE TABLE IF NOT EXISTS acct_currency_revaluation (
  revaluation_id VARCHAR(20) PRIMARY KEY,
  revaluation_date DATE NOT NULL,
  account_id VARCHAR(20) NOT NULL REFERENCES acct_chart_of_accounts(account_id),
  original_amount DECIMAL(12, 2) NOT NULL,
  original_currency CHAR(3) NOT NULL,
  base_currency_amount DECIMAL(12, 2) NOT NULL,
  exchange_rate DECIMAL(12, 6) NOT NULL,
  gain_loss DECIMAL(12, 2) NOT NULL,
  created_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cr_date ON acct_currency_revaluation(revaluation_date);
CREATE INDEX IF NOT EXISTS idx_cr_account ON acct_currency_revaluation(account_id);

-- ============================================================================
-- 2. BUDGETING & FORECASTING
-- ============================================================================

-- Budgets table
CREATE TABLE IF NOT EXISTS acct_budgets (
  budget_id VARCHAR(20) PRIMARY KEY,
  budget_name VARCHAR(255) NOT NULL,
  fiscal_year INTEGER NOT NULL,
  budget_type VARCHAR(50) DEFAULT 'ANNUAL',
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_budget_year ON acct_budgets(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_budget_status ON acct_budgets(status);

-- Budget lines table
CREATE TABLE IF NOT EXISTS acct_budget_lines (
  line_id VARCHAR(20) PRIMARY KEY,
  budget_id VARCHAR(20) NOT NULL REFERENCES acct_budgets(budget_id) ON DELETE CASCADE,
  account_id VARCHAR(20) NOT NULL REFERENCES acct_chart_of_accounts(account_id),
  period VARCHAR(20) NOT NULL,
  budgeted_amount DECIMAL(12, 2) NOT NULL,
  actual_amount DECIMAL(12, 2) DEFAULT 0,
  variance DECIMAL(12, 2) GENERATED ALWAYS AS (budgeted_amount - actual_amount) STORED,
  variance_percent DECIMAL(5, 2) GENERATED ALWAYS AS ((budgeted_amount - actual_amount) / NULLIF(budgeted_amount, 0) * 100) STORED,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bl_budget ON acct_budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_bl_account ON acct_budget_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_bl_period ON acct_budget_lines(period);

-- Forecasts table
CREATE TABLE IF NOT EXISTS acct_forecasts (
  forecast_id VARCHAR(20) PRIMARY KEY,
  forecast_name VARCHAR(255) NOT NULL,
  forecast_type VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  created_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fc_type ON acct_forecasts(forecast_type);
CREATE INDEX IF NOT EXISTS idx_fc_dates ON acct_forecasts(start_date, end_date);

-- Forecast lines table
CREATE TABLE IF NOT EXISTS acct_forecast_lines (
  line_id VARCHAR(20) PRIMARY KEY,
  forecast_id VARCHAR(20) NOT NULL REFERENCES acct_forecasts(forecast_id) ON DELETE CASCADE,
  account_id VARCHAR(20) NOT NULL REFERENCES acct_chart_of_accounts(account_id),
  period VARCHAR(20) NOT NULL,
  forecasted_amount DECIMAL(12, 2) NOT NULL,
  confidence_level VARCHAR(20) DEFAULT 'MEDIUM',
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fcl_forecast ON acct_forecast_lines(forecast_id);
CREATE INDEX IF NOT EXISTS idx_fcl_account ON acct_forecast_lines(account_id);

-- ============================================================================
-- 3. FIXED ASSETS
-- ============================================================================

-- Depreciation method enum
DO $$ BEGIN
  CREATE TYPE depreciation_method AS ENUM ('STRAIGHT_LINE', 'DECLINING_BALANCE', 'DOUBLE_DECLINING', 'UNITS_OF_PRODUCTION');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Fixed assets table
CREATE TABLE IF NOT EXISTS acct_fixed_assets (
  asset_id VARCHAR(20) PRIMARY KEY,
  asset_number VARCHAR(100) UNIQUE NOT NULL,
  asset_name VARCHAR(255) NOT NULL,
  asset_category VARCHAR(100),
  serial_number VARCHAR(100),
  purchase_date DATE NOT NULL,
  purchase_cost DECIMAL(12, 2) NOT NULL,
  salvage_value DECIMAL(12, 2) DEFAULT 0,
  useful_life INTEGER NOT NULL,
  depreciation_method depreciation_method DEFAULT 'STRAIGHT_LINE',
  current_book_value DECIMAL(12, 2),
  accumulated_depreciation DECIMAL(12, 2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  location VARCHAR(255),
  assigned_to VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  disposal_date DATE,
  disposal_value DECIMAL(12, 2),
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fa_number ON acct_fixed_assets(asset_number);
CREATE INDEX IF NOT EXISTS idx_fa_status ON acct_fixed_assets(status);
CREATE INDEX IF NOT EXISTS idx_fa_category ON acct_fixed_assets(asset_category);
CREATE INDEX IF NOT EXISTS idx_fa_assigned ON acct_fixed_assets(assigned_to);

-- Depreciation schedule table
CREATE TABLE IF NOT EXISTS acct_depreciation_schedule (
  schedule_id VARCHAR(20) PRIMARY KEY,
  asset_id VARCHAR(20) NOT NULL REFERENCES acct_fixed_assets(asset_id) ON DELETE CASCADE,
  fiscal_year INTEGER NOT NULL,
  fiscal_period VARCHAR(20) NOT NULL,
  depreciation_amount DECIMAL(12, 2) NOT NULL,
  book_value_beginning DECIMAL(12, 2) NOT NULL,
  book_value_ending DECIMAL(12, 2) NOT NULL,
  accumulated_depreciation DECIMAL(12, 2) NOT NULL,
  is_depreciated BOOLEAN NOT NULL DEFAULT false,
  calculated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ds_asset ON acct_depreciation_schedule(asset_id);
CREATE INDEX IF NOT EXISTS idx_ds_year_period ON acct_depreciation_schedule(fiscal_year, fiscal_period);

-- Asset disposal table
CREATE TABLE IF NOT EXISTS acct_asset_disposals (
  disposal_id VARCHAR(20) PRIMARY KEY,
  asset_id VARCHAR(20) NOT NULL REFERENCES acct_fixed_assets(asset_id),
  disposal_date DATE NOT NULL,
  disposal_type VARCHAR(50) NOT NULL,
  disposal_value DECIMAL(12, 2) NOT NULL,
  gain_loss DECIMAL(12, 2) NOT NULL,
  sold_to VARCHAR(255),
  reference_number VARCHAR(100),
  notes TEXT,
  created_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ad_asset ON acct_asset_disposals(asset_id);
CREATE INDEX IF NOT EXISTS idx_ad_date ON acct_asset_disposals(disposal_date);

-- ============================================================================
-- 4. COMPLIANCE & AUDIT TRAIL
-- ============================================================================

-- Audit log table
CREATE TABLE IF NOT EXISTS acct_audit_log (
  audit_id VARCHAR(20) PRIMARY KEY,
  table_name VARCHAR(100) NOT NULL,
  record_id VARCHAR(100) NOT NULL,
  action VARCHAR(50) NOT NULL,
  old_values JSONB,
  new_values JSONB,
  changed_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  changed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_table ON acct_audit_log(table_name);
CREATE INDEX IF NOT EXISTS idx_audit_record ON acct_audit_log(record_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON acct_audit_log(changed_by);
CREATE INDEX IF NOT EXISTS idx_audit_date ON acct_audit_log(changed_at DESC);

-- Document attachments table
CREATE TABLE IF NOT EXISTS acct_document_attachments (
  attachment_id VARCHAR(20) PRIMARY KEY,
  record_type VARCHAR(50) NOT NULL,
  record_id VARCHAR(100) NOT NULL,
  document_name VARCHAR(255) NOT NULL,
  document_type VARCHAR(100),
  file_path VARCHAR(500) NOT NULL,
  file_size BIGINT,
  mime_type VARCHAR(100),
  uploaded_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  uploaded_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_doc_record ON acct_document_attachments(record_type, record_id);
CREATE INDEX IF NOT EXISTS idx_doc_type ON acct_document_attachments(document_type);

-- Approval workflow table
CREATE TABLE IF NOT EXISTS acct_approvals (
  approval_id VARCHAR(20) PRIMARY KEY,
  approval_type VARCHAR(50) NOT NULL,
  record_id VARCHAR(100) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  requested_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  requested_at TIMESTAMP NOT NULL DEFAULT NOW(),
  approved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  rejected_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  rejected_at TIMESTAMP,
  comments TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_approval_record ON acct_approvals(approval_type, record_id);
CREATE INDEX IF NOT EXISTS idx_approval_status ON acct_approvals(status);
CREATE INDEX IF NOT EXISTS idx_approval_requested_by ON acct_approvals(requested_by);

-- Electronic signatures table
CREATE TABLE IF NOT EXISTS acct_signatures (
  signature_id VARCHAR(20) PRIMARY KEY,
  record_type VARCHAR(50) NOT NULL,
  record_id VARCHAR(100) NOT NULL,
  signed_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  signature_data TEXT NOT NULL,
  signed_at TIMESTAMP NOT NULL DEFAULT NOW(),
  ip_address INET,
  user_agent TEXT
);

CREATE INDEX IF NOT EXISTS idx_sig_record ON acct_signatures(record_type, record_id);

-- Period control table
CREATE TABLE IF NOT EXISTS acct_periods (
  period_id VARCHAR(20) PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  period_number INTEGER NOT NULL,
  period_name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  closed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (fiscal_year, period_number)
);

CREATE INDEX IF NOT EXISTS idx_period_year ON acct_periods(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_period_closed ON acct_periods(is_closed);

-- Closing entries table
CREATE TABLE IF NOT EXISTS acct_closing_entries (
  closing_id VARCHAR(20) PRIMARY KEY,
  period_id VARCHAR(20) NOT NULL REFERENCES acct_periods(period_id),
  journal_entry_id VARCHAR(20) REFERENCES acct_journal_entries(journal_entry_id),
  entry_type VARCHAR(50) NOT NULL CHECK (entry_type IN ('OPENING', 'CLOSING', 'ADJUSTING')),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ce_period ON acct_closing_entries(period_id);

-- ============================================================================
-- 5. SAMPLE DATA
-- ============================================================================

-- Sample currencies
INSERT INTO acct_currencies (currency_code, currency_name, symbol, is_active) VALUES
  ('USD', 'US Dollar', '$', true),
  ('EUR', 'Euro', '€', true),
  ('GBP', 'British Pound', '£', true),
  ('CAD', 'Canadian Dollar', 'C$', true),
  ('AUD', 'Australian Dollar', 'A$', true)
ON CONFLICT (currency_code) DO NOTHING;

-- Sample exchange rates
INSERT INTO acct_exchange_rates (rate_id, from_currency, to_currency, rate_date, exchange_rate) VALUES
  ('XR-001', 'EUR', 'USD', '2024-01-31', 1.09),
  ('XR-002', 'GBP', 'USD', '2024-01-31', 1.27),
  ('XR-003', 'CAD', 'USD', '2024-01-31', 0.74),
  ('XR-004', 'AUD', 'USD', '2024-01-31', 0.65)
ON CONFLICT (rate_id) DO NOTHING;

-- Sample budgets
INSERT INTO acct_budgets (budget_id, budget_name, fiscal_year, budget_type, status, created_by) VALUES
  ('BUD-2024', 'Annual Budget 2024', 2024, 'ANNUAL', 'ACTIVE', 'USR-ADMIN')
ON CONFLICT (budget_id) DO NOTHING;

-- Sample budget lines
INSERT INTO acct_budget_lines (line_id, budget_id, account_id, period, budgeted_amount) VALUES
  ('BL-001', 'BUD-2024', 'ACT-4110', '2024-Q1', 100000.00),
  ('BL-002', 'BUD-2024', 'ACT-4110', '2024-Q2', 120000.00),
  ('BL-003', 'BUD-2024', 'ACT-4110', '2024-Q3', 115000.00),
  ('BL-004', 'BUD-2024', 'ACT-4110', '2024-Q4', 130000.00),
  ('BL-005', 'BUD-2024', 'ACT-5110', '2024-Q1', 40000.00),
  ('BL-006', 'BUD-2024', 'ACT-5110', '2024-Q2', 45000.00),
  ('BL-007', 'BUD-2024', 'ACT-5110', '2024-Q3', 43000.00),
  ('BL-008', 'BUD-2024', 'ACT-5110', '2024-Q4', 47000.00),
  ('BL-009', 'BUD-2024', 'ACT-5210', '2024-Q1', 25000.00),
  ('BL-010', 'BUD-2024', 'ACT-5210', '2024-Q2', 28000.00),
  ('BL-011', 'BUD-2024', 'ACT-5210', '2024-Q3', 27000.00),
  ('BL-012', 'BUD-2024', 'ACT-5210', '2024-Q4', 30000.00)
ON CONFLICT (line_id) DO NOTHING;

-- Sample fixed assets
INSERT INTO acct_fixed_assets (asset_id, asset_number, asset_name, asset_category, serial_number, purchase_date, purchase_cost, salvage_value, useful_life, depreciation_method, current_book_value, accumulated_depreciation) VALUES
  ('FA-001', 'ASSET-001', 'Forklift - Toyota', 'Equipment', 'FL-2024-001', '2024-01-15', 25000.00, 2500.00, 10, 'STRAIGHT_LINE', 25000.00, 0),
  ('FA-002', 'ASSET-002', 'Delivery Truck', 'Vehicles', 'VH-2024-001', '2024-01-20', 45000.00, 5000.00, 8, 'STRAIGHT_LINE', 45000.00, 0),
  ('FA-003', 'ASSET-003', 'Warehouse Racking System', 'Improvements', 'WH-2024-001', '2024-02-01', 75000.00, 7500.00, 20, 'STRAIGHT_LINE', 75000.00, 0),
  ('FA-004', 'ASSET-004', 'Computer Equipment', 'Equipment', 'CE-2024-001', '2024-01-10', 15000.00, 1500.00, 5, 'STRAIGHT_LINE', 15000.00, 0)
ON CONFLICT (asset_id) DO NOTHING;

-- Fiscal periods
INSERT INTO acct_periods (period_id, fiscal_year, period_number, period_name, start_date, end_date) VALUES
  ('2024-01', 2024, 1, 'January 2024', '2024-01-01', '2024-01-31'),
  ('2024-02', 2024, 2, 'February2024', '2024-02-01', '2024-02-29'),
  ('2024-03', 2024, 3, 'March2024', '2024-03-01', '2024-03-31'),
  ('2024-04', 2024, 4, 'April2024', '2024-04-01', '2024-04-30'),
  ('2024-05', 2024, 5, 'May2024', '2024-05-01', '2024-05-31'),
  ('2024-06', 2024, 6, 'June2024', '2024-06-01', '2024-06-30'),
  ('2024-07', 2024, 7, 'July2024', '2024-07-01', '2024-07-31'),
  ('2024-08', 2024, 8, 'August2024', '2024-08-01', '2024-08-31'),
  ('2024-09', 2024, 9, 'September2024', '2024-09-01', '2024-09-30'),
  ('2024-10', 2024, 10, 'October2024', '2024-10-01', '2024-10-31'),
  ('2024-11', 2024, 11, 'November2024', '2024-11-01', '2024-11-30'),
  ('2024-12', 2024, 12, 'December2024', '2024-12-01', '2024-12-31')
ON CONFLICT (period_id) DO NOTHING;

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE acct_currencies IS 'Supported currencies for multi-currency accounting';
COMMENT ON TABLE acct_exchange_rates IS 'Exchange rates for currency conversion';
COMMENT ON TABLE acct_currency_revaluation IS 'Currency revaluation gains/losses tracking';
COMMENT ON TABLE acct_budgets IS 'Budget definitions by fiscal year';
COMMENT ON TABLE acct_forecasts IS 'Cash flow and revenue forecasts';
COMMENT ON TABLE acct_fixed_assets IS 'Fixed asset register for capital assets';
COMMENT ON TABLE acct_depreciation_schedule IS 'Depreciation schedule by period';
COMMENT ON TABLE acct_audit_log IS 'Complete audit trail for all accounting changes';
COMMENT ON TABLE acct_document_attachments IS 'Document storage for invoices, receipts, contracts';
COMMENT ON TABLE acct_approvals IS 'Approval workflow for journal entries, invoices, etc.';
COMMENT ON TABLE acct_periods IS 'Fiscal periods and period control (closing)';
