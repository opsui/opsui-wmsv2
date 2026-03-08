-- ============================================================================
-- ENSURE ACCOUNTING TABLES EXIST
-- Run this on remote servers to ensure all accounting tables are created
-- This combines migrations 044, 045, 046 to fix "table does not exist" errors
-- ============================================================================

-- ============================================================================
-- 1. CHART OF ACCOUNTS (from 044)
-- ============================================================================

-- Account types enum
DO $$ BEGIN
  CREATE TYPE account_type AS ENUM ('ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Chart of Accounts table
CREATE TABLE IF NOT EXISTS acct_chart_of_accounts (
  account_id VARCHAR(20) PRIMARY KEY,
  account_code VARCHAR(20) NOT NULL UNIQUE,
  account_name VARCHAR(255) NOT NULL,
  account_type account_type NOT NULL,
  parent_account_id VARCHAR(20) REFERENCES acct_chart_of_accounts(account_id) ON DELETE SET NULL,
  normal_balance CHAR(1) CHECK (normal_balance IN ('D', 'C')) DEFAULT 'D',
  is_active BOOLEAN NOT NULL DEFAULT true,
  is_header BOOLEAN NOT NULL DEFAULT false,
  description TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_coa_type ON acct_chart_of_accounts(account_type);
CREATE INDEX IF NOT EXISTS idx_coa_parent ON acct_chart_of_accounts(parent_account_id);
CREATE INDEX IF NOT EXISTS idx_coa_active ON acct_chart_of_accounts(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_coa_code ON acct_chart_of_accounts(account_code);

-- ============================================================================
-- 2. JOURNAL ENTRIES (from 044)
-- ============================================================================

-- Journal entry status enum
DO $$ BEGIN
  CREATE TYPE journal_entry_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'POSTED', 'REVERSED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Journal entries header table
CREATE TABLE IF NOT EXISTS acct_journal_entries (
  journal_entry_id VARCHAR(20) PRIMARY KEY,
  entry_number VARCHAR(50) UNIQUE NOT NULL,
  entry_date DATE NOT NULL,
  fiscal_period VARCHAR(20) NOT NULL,
  description TEXT NOT NULL,
  status journal_entry_status DEFAULT 'DRAFT',
  total_debit DECIMAL(12, 2) NOT NULL DEFAULT 0,
  total_credit DECIMAL(12, 2) NOT NULL DEFAULT 0,
  created_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  approved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMP,
  posted_at TIMESTAMP,
  reversal_entry_id VARCHAR(20) REFERENCES acct_journal_entries(journal_entry_id) ON DELETE SET NULL,
  notes TEXT,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_je_date ON acct_journal_entries(entry_date);
CREATE INDEX IF NOT EXISTS idx_je_status ON acct_journal_entries(status);
CREATE INDEX IF NOT EXISTS idx_je_period ON acct_journal_entries(fiscal_period);
CREATE INDEX IF NOT EXISTS idx_je_created_by ON acct_journal_entries(created_by);
CREATE INDEX IF NOT EXISTS idx_je_number ON acct_journal_entries(entry_number);

-- Journal entry lines table
CREATE TABLE IF NOT EXISTS acct_journal_entry_lines (
  line_id VARCHAR(20) PRIMARY KEY,
  journal_entry_id VARCHAR(20) NOT NULL REFERENCES acct_journal_entries(journal_entry_id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  account_id VARCHAR(20) NOT NULL REFERENCES acct_chart_of_accounts(account_id) ON DELETE RESTRICT,
  description TEXT,
  debit_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  credit_amount DECIMAL(12, 2) NOT NULL DEFAULT 0,
  cost_center VARCHAR(50),
  reference_type VARCHAR(50),
  reference_id VARCHAR(100)
);

CREATE INDEX IF NOT EXISTS idx_jel_entry ON acct_journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account ON acct_journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_jel_reference ON acct_journal_entry_lines(reference_type, reference_id);

-- ============================================================================
-- 3. TRIAL BALANCE (from 044)
-- ============================================================================

CREATE TABLE IF NOT EXISTS acct_trial_balance (
  trial_balance_id VARCHAR(20) PRIMARY KEY,
  as_of_date DATE NOT NULL,
  fiscal_period VARCHAR(20) NOT NULL,
  generated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS acct_trial_balance_lines (
  line_id VARCHAR(20) PRIMARY KEY,
  trial_balance_id VARCHAR(20) NOT NULL REFERENCES acct_trial_balance(trial_balance_id) ON DELETE CASCADE,
  account_id VARCHAR(20) NOT NULL REFERENCES acct_chart_of_accounts(account_id),
  debit_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  credit_balance DECIMAL(12, 2) NOT NULL DEFAULT 0
);

CREATE INDEX IF NOT EXISTS idx_tb_entry ON acct_trial_balance_lines(trial_balance_id);
CREATE INDEX IF NOT EXISTS idx_tb_account ON acct_trial_balance_lines(account_id);

-- ============================================================================
-- 4. CURRENCIES & EXCHANGE RATES (from 046)
-- ============================================================================

CREATE TABLE IF NOT EXISTS acct_currencies (
  currency_code CHAR(3) PRIMARY KEY,
  currency_name VARCHAR(100) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_curr_active ON acct_currencies(is_active) WHERE is_active = true;

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

-- ============================================================================
-- 5. BUDGETS & FORECASTS (from 046)
-- ============================================================================

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

CREATE TABLE IF NOT EXISTS acct_budget_lines (
  line_id VARCHAR(20) PRIMARY KEY,
  budget_id VARCHAR(20) NOT NULL REFERENCES acct_budgets(budget_id) ON DELETE CASCADE,
  account_id VARCHAR(20) NOT NULL REFERENCES acct_chart_of_accounts(account_id),
  period VARCHAR(20) NOT NULL,
  budgeted_amount DECIMAL(12, 2) NOT NULL,
  actual_amount DECIMAL(12, 2) DEFAULT 0,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_bl_budget ON acct_budget_lines(budget_id);
CREATE INDEX IF NOT EXISTS idx_bl_account ON acct_budget_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_bl_period ON acct_budget_lines(period);

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
-- 6. FIXED ASSETS (from 046) - THE KEY TABLE FOR THIS ERROR
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
-- 7. AUDIT TRAIL & COMPLIANCE (from 046)
-- ============================================================================

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

-- ============================================================================
-- 8. AR/AP TABLES (from 045)
-- ============================================================================

CREATE TABLE IF NOT EXISTS acct_ar_payments (
  payment_id VARCHAR(20) PRIMARY KEY,
  receivable_id VARCHAR(20),
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) DEFAULT 'CASH',
  amount DECIMAL(12, 2) NOT NULL,
  reference_number VARCHAR(100),
  notes TEXT,
  created_by VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_arp_date ON acct_ar_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_arp_receivable ON acct_ar_payments(receivable_id);

CREATE TABLE IF NOT EXISTS acct_credit_memos (
  memo_id VARCHAR(20) PRIMARY KEY,
  receivable_id VARCHAR(20),
  memo_number VARCHAR(50) NOT NULL,
  memo_date DATE NOT NULL,
  reason TEXT NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'PENDING',
  approved_by VARCHAR(20),
  approved_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_cm_date ON acct_credit_memos(memo_date);
CREATE INDEX IF NOT EXISTS idx_cm_status ON acct_credit_memos(status);

CREATE TABLE IF NOT EXISTS acct_ap_payments (
  payment_id VARCHAR(20) PRIMARY KEY,
  payable_id VARCHAR(20) NOT NULL,
  payment_date DATE NOT NULL,
  payment_method VARCHAR(50) NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  reference_number VARCHAR(100),
  notes TEXT,
  created_by VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_app_date ON acct_ap_payments(payment_date);
CREATE INDEX IF NOT EXISTS idx_app_payable ON acct_ap_payments(payable_id);

CREATE TABLE IF NOT EXISTS acct_bank_reconciliations (
  reconciliation_id VARCHAR(20) PRIMARY KEY,
  bank_account_id VARCHAR(20) NOT NULL,
  statement_date DATE NOT NULL,
  statement_balance DECIMAL(12, 2) NOT NULL,
  book_balance DECIMAL(12, 2) NOT NULL,
  difference DECIMAL(12, 2) NOT NULL,
  status VARCHAR(50) DEFAULT 'IN_PROGRESS',
  reconciled_by VARCHAR(20),
  reconciled_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_br_date ON acct_bank_reconciliations(statement_date);
CREATE INDEX IF NOT EXISTS idx_br_status ON acct_bank_reconciliations(status);

CREATE TABLE IF NOT EXISTS acct_revenue_contracts (
  contract_id VARCHAR(20) PRIMARY KEY,
  contract_number VARCHAR(50) NOT NULL,
  customer_id VARCHAR(20),
  contract_name VARCHAR(255),
  total_value DECIMAL(12, 2) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  recognition_method VARCHAR(50) NOT NULL,
  status VARCHAR(50) DEFAULT 'ACTIVE',
  created_by VARCHAR(20),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_rc_customer ON acct_revenue_contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_rc_status ON acct_revenue_contracts(status);

CREATE TABLE IF NOT EXISTS acct_periods (
  period_id VARCHAR(20) PRIMARY KEY,
  fiscal_year INTEGER NOT NULL,
  period_number INTEGER NOT NULL,
  period_name VARCHAR(50) NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  is_closed BOOLEAN NOT NULL DEFAULT false,
  closed_by VARCHAR(20),
  closed_at TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  UNIQUE (fiscal_year, period_number)
);

CREATE INDEX IF NOT EXISTS idx_period_year ON acct_periods(fiscal_year);
CREATE INDEX IF NOT EXISTS idx_period_closed ON acct_periods(is_closed);

-- ============================================================================
-- 9. SAMPLE DATA (only if tables are empty)
-- ============================================================================

-- Sample currencies
INSERT INTO acct_currencies (currency_code, currency_name, symbol, is_active)
SELECT 'USD', 'US Dollar', '$', true
WHERE NOT EXISTS (SELECT 1 FROM acct_currencies WHERE currency_code = 'USD');

INSERT INTO acct_currencies (currency_code, currency_name, symbol, is_active)
SELECT 'NZD', 'New Zealand Dollar', 'NZ$', true
WHERE NOT EXISTS (SELECT 1 FROM acct_currencies WHERE currency_code = 'NZD');

INSERT INTO acct_currencies (currency_code, currency_name, symbol, is_active)
SELECT 'AUD', 'Australian Dollar', 'A$', true
WHERE NOT EXISTS (SELECT 1 FROM acct_currencies WHERE currency_code = 'AUD');

-- Sample chart of accounts (minimal set)
INSERT INTO acct_chart_of_accounts (account_id, account_code, account_name, account_type, normal_balance, is_header)
SELECT 'ACT-1000', '1000', 'ASSETS', 'ASSET', 'D', true
WHERE NOT EXISTS (SELECT 1 FROM acct_chart_of_accounts WHERE account_id = 'ACT-1000');

INSERT INTO acct_chart_of_accounts (account_id, account_code, account_name, account_type, normal_balance, is_header, parent_account_id)
SELECT 'ACT-1100', '1100', 'Current Assets', 'ASSET', 'D', true, 'ACT-1000'
WHERE NOT EXISTS (SELECT 1 FROM acct_chart_of_accounts WHERE account_id = 'ACT-1100');

INSERT INTO acct_chart_of_accounts (account_id, account_code, account_name, account_type, normal_balance, is_header, parent_account_id)
SELECT 'ACT-1110', '1110', 'Cash', 'ASSET', 'D', false, 'ACT-1100'
WHERE NOT EXISTS (SELECT 1 FROM acct_chart_of_accounts WHERE account_id = 'ACT-1110');

INSERT INTO acct_chart_of_accounts (account_id, account_code, account_name, account_type, normal_balance, is_header, parent_account_id)
SELECT 'ACT-1200', '1200', 'Fixed Assets', 'ASSET', 'D', true, 'ACT-1000'
WHERE NOT EXISTS (SELECT 1 FROM acct_chart_of_accounts WHERE account_id = 'ACT-1200');

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO opsui_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO opsui_app;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Accounting tables migration completed successfully';
END $$;