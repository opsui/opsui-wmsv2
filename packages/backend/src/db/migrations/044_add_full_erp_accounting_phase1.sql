-- ============================================================================
-- FULL ERP ACCOUNTING FEATURES - PHASE 1: FOUNDATION
-- Industry-standard ERP accounting tables for Chart of Accounts,
-- Journal Entries with double-entry bookkeeping, Balance Sheet, and Cash Flow
-- ============================================================================

-- ============================================================================
-- 1. CHART OF ACCOUNTS
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
-- 2. JOURNAL ENTRIES (DOUBLE-ENTRY BOOKKEEPING)
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
  updated_at TIMESTAMP NOT NULL DEFAULT NOW(),
  CHECK (total_debit = total_credit)
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
  reference_id VARCHAR(100),
  CHECK (debit_amount > 0 OR credit_amount > 0),
  CHECK (debit_amount = 0 OR credit_amount = 0)
);

CREATE INDEX IF NOT EXISTS idx_jel_entry ON acct_journal_entry_lines(journal_entry_id);
CREATE INDEX IF NOT EXISTS idx_jel_account ON acct_journal_entry_lines(account_id);
CREATE INDEX IF NOT EXISTS idx_jel_reference ON acct_journal_entry_lines(reference_type, reference_id);

-- ============================================================================
-- 3. TRIAL BALANCE SUPPORT
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
  credit_balance DECIMAL(12, 2) NOT NULL DEFAULT 0,
  net_balance DECIMAL(12, 2) GENERATED ALWAYS AS (debit_balance - credit_balance) STORED
);

CREATE INDEX IF NOT EXISTS idx_tb_entry ON acct_trial_balance_lines(trial_balance_id);
CREATE INDEX IF NOT EXISTS idx_tb_account ON acct_trial_balance_lines(account_id);

-- ============================================================================
-- 4. SAMPLE CHART OF ACCOUNTS DATA
-- ============================================================================

INSERT INTO acct_chart_of_accounts (account_id, account_code, account_name, account_type, normal_balance, is_header, parent_account_id) VALUES
  -- ASSETS
  ('ACT-1000', '1000', 'ASSETS', 'ASSET', 'D', true, NULL),
  ('ACT-1100', '1100', 'Current Assets', 'ASSET', 'D', true, 'ACT-1000'),
  ('ACT-1110', '1110', 'Cash', 'ASSET', 'D', false, 'ACT-1100'),
  ('ACT-1111', '1111', 'Cash - Main Operating Account', 'ASSET', 'D', false, 'ACT-1110'),
  ('ACT-1120', '1120', 'Accounts Receivable', 'ASSET', 'D', false, 'ACT-1100'),
  ('ACT-1130', '1130', 'Inventory', 'ASSET', 'D', false, 'ACT-1100'),
  ('ACT-1131', '1131', 'Raw Materials', 'ASSET', 'D', false, 'ACT-1130'),
  ('ACT-1132', '1132', 'Work in Progress', 'ASSET', 'D', false, 'ACT-1130'),
  ('ACT-1133', '1133', 'Finished Goods', 'ASSET', 'D', false, 'ACT-1130'),
  ('ACT-1140', '1140', 'Prepaid Expenses', 'ASSET', 'D', false, 'ACT-1100'),
  ('ACT-1200', '1200', 'Fixed Assets', 'ASSET', 'D', true, 'ACT-1000'),
  ('ACT-1210', '1210', 'Equipment', 'ASSET', 'D', false, 'ACT-1200'),
  ('ACT-1220', '1220', 'Accumulated Depreciation - Equipment', 'ASSET', 'C', false, 'ACT-1200'),
  ('ACT-1230', '1230', 'Buildings', 'ASSET', 'D', false, 'ACT-1200'),
  ('ACT-1240', '1240', 'Accumulated Depreciation - Buildings', 'ASSET', 'C', false, 'ACT-1200'),
  ('ACT-1300', '1300', 'Intangible Assets', 'ASSET', 'D', true, 'ACT-1000'),
  ('ACT-1310', '1310', 'Software Licenses', 'ASSET', 'D', false, 'ACT-1300'),

  -- LIABILITIES
  ('ACT-2000', '2000', 'LIABILITIES', 'LIABILITY', 'C', true, NULL),
  ('ACT-2100', '2100', 'Current Liabilities', 'LIABILITY', 'C', true, 'ACT-2000'),
  ('ACT-2110', '2110', 'Accounts Payable', 'LIABILITY', 'C', false, 'ACT-2100'),
  ('ACT-2120', '2120', 'Accrued Expenses', 'LIABILITY', 'C', false, 'ACT-2100'),
  ('ACT-2130', '2130', 'Taxes Payable', 'LIABILITY', 'C', false, 'ACT-2100'),
  ('ACT-2140', '2140', 'Short-Term Debt', 'LIABILITY', 'C', false, 'ACT-2100'),
  ('ACT-2200', '2200', 'Long-Term Liabilities', 'LIABILITY', 'C', true, 'ACT-2000'),
  ('ACT-2210', '2210', 'Long-Term Debt', 'LIABILITY', 'C', false, 'ACT-2200'),

  -- EQUITY
  ('ACT-3000', '3000', 'EQUITY', 'EQUITY', 'C', true, NULL),
  ('ACT-3100', '3100', 'Owner''s Capital', 'EQUITY', 'C', false, 'ACT-3000'),
  ('ACT-3200', '3200', 'Retained Earnings', 'EQUITY', 'C', false, 'ACT-3000'),
  ('ACT-3300', '3300', 'Common Stock', 'EQUITY', 'C', false, 'ACT-3000'),
  ('ACT-3400', '3400', 'Paid-in Capital', 'EQUITY', 'C', false, 'ACT-3000'),

  -- REVENUE
  ('ACT-4000', '4000', 'REVENUE', 'REVENUE', 'C', true, NULL),
  ('ACT-4100', '4100', 'Sales Revenue', 'REVENUE', 'C', false, 'ACT-4000'),
  ('ACT-4110', '4110', 'Product Revenue', 'REVENUE', 'C', false, 'ACT-4100'),
  ('ACT-4120', '4120', 'Service Revenue', 'REVENUE', 'C', false, 'ACT-4100'),
  ('ACT-4200', '4200', 'Other Revenue', 'REVENUE', 'C', false, 'ACT-4000'),
  ('ACT-4210', '4210', 'Interest Income', 'REVENUE', 'C', false, 'ACT-4200'),
  ('ACT-4220', '4220', 'Gain on Sale of Assets', 'REVENUE', 'C', false, 'ACT-4200'),

  -- EXPENSES
  ('ACT-5000', '5000', 'EXPENSES', 'EXPENSE', 'D', true, NULL),
  ('ACT-5100', '5100', 'Cost of Goods Sold', 'EXPENSE', 'D', false, 'ACT-5000'),
  ('ACT-5110', '5110', 'Materials Cost', 'EXPENSE', 'D', false, 'ACT-5100'),
  ('ACT-5120', '5120', 'Labor Cost', 'EXPENSE', 'D', false, 'ACT-5100'),
  ('ACT-5130', '5130', 'Overhead Cost', 'EXPENSE', 'D', false, 'ACT-5100'),
  ('ACT-5200', '5200', 'Operating Expenses', 'EXPENSE', 'D', false, 'ACT-5000'),
  ('ACT-5210', '5210', 'Salaries and Wages', 'EXPENSE', 'D', false, 'ACT-5200'),
  ('ACT-5220', '5220', 'Rent Expense', 'EXPENSE', 'D', false, 'ACT-5200'),
  ('ACT-5230', '5230', 'Utilities Expense', 'EXPENSE', 'D', false, 'ACT-5200'),
  ('ACT-5240', '5240', 'Depreciation Expense', 'EXPENSE', 'D', false, 'ACT-5200'),
  ('ACT-5250', '5250', 'Marketing Expense', 'EXPENSE', 'D', false, 'ACT-5200'),
  ('ACT-5300', '5300', 'Other Expenses', 'EXPENSE', 'D', false, 'ACT-5000'),
  ('ACT-5310', '5310', 'Interest Expense', 'EXPENSE', 'D', false, 'ACT-5300'),
  ('ACT-5320', '5320', 'Loss on Sale of Assets', 'EXPENSE', 'D', false, 'ACT-5300')
ON CONFLICT (account_id) DO NOTHING;

-- ============================================================================
-- 5. SAMPLE JOURNAL ENTRIES
-- ============================================================================

INSERT INTO acct_journal_entries (journal_entry_id, entry_number, entry_date, fiscal_period, description, status, total_debit, total_credit, created_by) VALUES
  ('JE-00001', 'JE-2024-001', '2024-01-31', '2024-01', 'Opening balance entry', 'POSTED', 27842.75, 27842.75, 'USR-ADMIN'),
  ('JE-00002', 'JE-2024-002', '2024-02-01', '2024-02', 'Equipment purchase', 'POSTED', 15000.00, 15000.00, 'USR-ADMIN'),
  ('JE-00003', 'JE-2024-003', '2024-02-05', '2024-02', 'Office supplies purchase', 'POSTED', 500.00, 500.00, 'USR-ADMIN')
ON CONFLICT (journal_entry_id) DO NOTHING;

-- Sample journal entry lines for JE-00001 (Opening balance)
INSERT INTO acct_journal_entry_lines (line_id, journal_entry_id, line_number, account_id, description, debit_amount, credit_amount) VALUES
  ('JEL-00001-01', 'JE-00001', 1, 'ACT-1111', 'Opening balance - Cash', 15000.00, 0),
  ('JEL-00001-02', 'JE-00001', 2, 'ACT-1120', 'Opening balance - Accounts Receivable', 8500.00, 0),
  ('JEL-00001-03', 'JE-00001', 3, 'ACT-1133', 'Opening balance - Finished Goods', 4342.75, 0),
  ('JEL-00001-04', 'JE-00001', 4, 'ACT-3100', 'Opening balance - Owner''s Capital', 0, 27842.75)
ON CONFLICT (line_id) DO NOTHING;

-- Sample journal entry lines for JE-00002 (Equipment purchase)
INSERT INTO acct_journal_entry_lines (line_id, journal_entry_id, line_number, account_id, description, debit_amount, credit_amount) VALUES
  ('JEL-00002-01', 'JE-00002', 1, 'ACT-1210', 'Equipment purchase - Forklift', 15000.00, 0),
  ('JEL-00002-02', 'JE-00002', 2, 'ACT-2110', 'Accounts Payable - Equipment vendor', 0, 15000.00)
ON CONFLICT (line_id) DO NOTHING;

-- Sample journal entry lines for JE-00003 (Office supplies)
INSERT INTO acct_journal_entry_lines (line_id, journal_entry_id, line_number, account_id, description, debit_amount, credit_amount) VALUES
  ('JEL-00003-01', 'JE-00003', 1, 'ACT-5230', 'Office supplies - February', 500.00, 0),
  ('JEL-00003-02', 'JE-00003', 2, 'ACT-1111', 'Cash payment for supplies', 0, 500.00)
ON CONFLICT (line_id) DO NOTHING;

-- ============================================================================
-- 6. COMMENTS
-- ============================================================================

COMMENT ON TABLE acct_chart_of_accounts IS 'Chart of Accounts - account hierarchy and definitions';
COMMENT ON TABLE acct_journal_entries IS 'Journal entries header - double-entry bookkeeping transactions';
COMMENT ON TABLE acct_journal_entry_lines IS 'Journal entry lines - individual debit/credit entries';
COMMENT ON TABLE acct_trial_balance IS 'Trial balance snapshots for historical reporting';
COMMENT ON TABLE acct_trial_balance_lines IS 'Trial balance line items - account balances as of date';
