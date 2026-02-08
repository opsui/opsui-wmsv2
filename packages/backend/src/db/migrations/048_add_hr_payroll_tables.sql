-- ============================================================================
-- HR & PAYROLL MODULE
-- Comprehensive Human Resources and Payroll system with NZ tax compliance
-- Supports employee management, timesheets, payroll processing, leave management
-- and automatic integration with the accounting system
-- ============================================================================

-- ============================================================================
-- 1. ENUMS
-- ============================================================================

-- Employee status
DO $$ BEGIN
  CREATE TYPE hr_employee_status AS ENUM ('ACTIVE', 'ON_LEAVE', 'TERMINATED', 'RESIGNED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Employment type
DO $$ BEGIN
  CREATE TYPE hr_employment_type AS ENUM ('FULL_TIME', 'PART_TIME', 'CASUAL', 'CONTRACT', 'FIXED_TERM');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Pay frequency
DO $$ BEGIN
  CREATE TYPE hr_pay_frequency AS ENUM ('WEEKLY', 'FORTNIGHTLY', 'MONTHLY', 'BI_MONTHLY');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- NZ Tax codes (IRD)
DO $$ BEGIN
  CREATE TYPE hr_nz_tax_code AS ENUM (
    'M', 'M SL', 'ME', 'ME SL',
    'L', 'L SL',
    'S', 'S SL', 'SH', 'SH SL',
    'ST', 'ST SL',
    'WA', 'WT',
    'CAE', 'CAE SL',
    'EDW', 'EDW SL',
    'NSW', 'NSW SL'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- KiwiSaver contribution rates
DO $$ BEGIN
  CREATE TYPE hr_kiwisaver_rate AS ENUM ('RATE_3', 'RATE_4', 'RATE_6', 'RATE_8', 'RATE_10');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Timesheet status
DO $$ BEGIN
  CREATE TYPE hr_timesheet_status AS ENUM ('DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'PAID');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Timesheet entry type
DO $$ BEGIN
  CREATE TYPE hr_work_type AS ENUM ('REGULAR', 'OVERTIME_1_5', 'OVERTIME_2_0', 'DOUBLE_TIME', 'SUNDAY', 'PUBLIC_HOLIDAY', 'ON_CALL', 'TRAVEL', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Payroll run status
DO $$ BEGIN
  CREATE TYPE hr_payroll_status AS ENUM ('DRAFT', 'CALCULATED', 'PROCESSING', 'PROCESSED', 'PAID', 'CANCELLED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Deduction type
DO $$ BEGIN
  CREATE TYPE hr_deduction_category AS ENUM ('TAX', 'KIWISAVER', 'ACC', 'UNION', 'MEDICAL', 'INSURANCE', 'LOAN', 'GARNISHMENT', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Leave request status
DO $$ BEGIN
  CREATE TYPE hr_leave_status AS ENUM ('PENDING', 'APPROVED', 'DECLINED', 'CANCELLED', 'COMPLETED');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Leave type
DO $$ BEGIN
  CREATE TYPE hr_leave_type_enum AS ENUM ('ANNUAL', 'SICK', 'BEREAVEMENT', 'PARENTAL', 'UNPAID', 'COMP_TIME', 'JURY_DUTY', 'DOMESTIC_VIOLENCE', 'LONG_SERVICE', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- ============================================================================
-- 2. CORE HR TABLES
-- ============================================================================

-- Employees table (separate from users - not all employees need system access)
CREATE TABLE IF NOT EXISTS hr_employees (
  employee_id VARCHAR(20) PRIMARY KEY,
  user_id VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,

  -- Personal Information
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  preferred_name VARCHAR(100),
  date_of_birth DATE,
  gender VARCHAR(20),
  national_id VARCHAR(50), -- NZ IRD number stored here (encrypted in production)

  -- Contact Information
  email VARCHAR(255) UNIQUE NOT NULL,
  phone VARCHAR(50),
  mobile VARCHAR(50),
  emergency_contact_name VARCHAR(255),
  emergency_contact_phone VARCHAR(50),

  -- Address
  address_line1 VARCHAR(255),
  address_line2 VARCHAR(255),
  city VARCHAR(100),
  region VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(50) DEFAULT 'NEW ZEALAND',

  -- Employment Information
  employee_number VARCHAR(50) UNIQUE,
  status hr_employee_status DEFAULT 'ACTIVE',
  hire_date DATE NOT NULL,
  termination_date DATE,
  termination_reason TEXT,

  -- System Fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  deleted_at TIMESTAMP WITH TIME ZONE, -- Soft delete
  created_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_hr_employees_user ON hr_employees(user_id);
CREATE INDEX IF NOT EXISTS idx_hr_employees_status ON hr_employees(status);
CREATE INDEX IF NOT EXISTS idx_hr_employees_email ON hr_employees(email);
CREATE INDEX IF NOT EXISTS idx_hr_employees_active ON hr_employees(status) WHERE status = 'ACTIVE' AND deleted_at IS NULL;

-- Employee tax details (NZ-specific)
CREATE TABLE IF NOT EXISTS hr_employee_tax_details (
  tax_detail_id VARCHAR(20) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL REFERENCES hr_employees(employee_id) ON DELETE CASCADE,

  -- IRD Information
  ird_number VARCHAR(50) NOT NULL, -- In production, this should be encrypted
  tax_code hr_nz_tax_code DEFAULT 'M',

  -- Tax Declaration
  tax_code_effective_date DATE,
  special_tax_rate DECIMAL(5, 2), -- For special tax codes (ST)

  -- Student Loan
  has_student_loan BOOLEAN NOT NULL DEFAULT false,
  student_loan_plan VARCHAR(50), -- 'SL' for standard student loan repayment

  -- Secondary Tax Code (for secondary jobs)
  secondary_tax_code hr_nz_tax_code,

  -- System Fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_tax_employee ON hr_employee_tax_details(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_tax_employee_unique ON hr_employee_tax_details(employee_id);

-- Employment records (supports multiple concurrent employments)
CREATE TABLE IF NOT EXISTS hr_employments (
  employment_id VARCHAR(20) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL REFERENCES hr_employees(employee_id) ON DELETE CASCADE,

  -- Position Details
  position_title VARCHAR(255) NOT NULL,
  employment_type hr_employment_type NOT NULL,
  department VARCHAR(100),
  cost_center VARCHAR(100),
  location VARCHAR(100),

  -- Compensation
  pay_type VARCHAR(20) NOT NULL CHECK (pay_type IN ('HOURLY', 'SALARY')),
  hourly_rate DECIMAL(10, 2),
  salary_amount DECIMAL(12, 2),
  salary_frequency hr_pay_frequency,

  -- Standard Hours
  standard_hours_per_week DECIMAL(5, 2) DEFAULT 40.00,
  standard_hours_per_day DECIMAL(5, 2) DEFAULT 8.00,

  -- Dates
  start_date DATE NOT NULL,
  end_date DATE,

  -- Status
  is_primary BOOLEAN NOT NULL DEFAULT true,
  status VARCHAR(50) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'TERMINATED', 'SUSPENDED')),

  -- System Fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_employments_employee ON hr_employments(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_employments_active ON hr_employments(employee_id, is_primary) WHERE is_primary = true AND status = 'ACTIVE';

-- Bank accounts for direct deposit
CREATE TABLE IF NOT EXISTS hr_bank_accounts (
  bank_account_id VARCHAR(20) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL REFERENCES hr_employees(employee_id) ON DELETE CASCADE,

  -- Bank Details
  bank_name VARCHAR(255) NOT NULL,
  bank_branch VARCHAR(255),
  account_number VARCHAR(50) NOT NULL, -- In production, this should be encrypted
  account_type VARCHAR(20) DEFAULT 'CHECKING' CHECK (account_type IN ('CHECKING', 'SAVINGS')),
  routing_number VARCHAR(50), -- Bank branch number in NZ

  -- Allocation
  allocation_percent DECIMAL(5, 2) DEFAULT 100.00,
  allocation_amount DECIMAL(12, 2),
  is_primary BOOLEAN NOT NULL DEFAULT true,

  -- System Fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_bank_employee ON hr_bank_accounts(employee_id);

-- ============================================================================
-- 3. TIMESHEET TABLES
-- ============================================================================

-- Timesheet header
CREATE TABLE IF NOT EXISTS hr_timesheets (
  timesheet_id VARCHAR(20) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
  period_start_date DATE NOT NULL,
  period_end_date DATE NOT NULL,
  status hr_timesheet_status DEFAULT 'DRAFT',

  -- Totals
  total_regular_hours DECIMAL(8, 2) DEFAULT 0,
  total_overtime_hours DECIMAL(8, 2) DEFAULT 0,
  total_hours DECIMAL(8, 2) GENERATED ALWAYS AS (total_regular_hours + total_overtime_hours) STORED,

  -- Approval
  submitted_at TIMESTAMP WITH TIME ZONE,
  submitted_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  approved_at TIMESTAMP WITH TIME ZONE,
  approved_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  rejection_reason TEXT,

  -- Payroll
  payroll_run_id VARCHAR(20), -- Reference to payroll run when paid

  -- System Fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_timesheets_employee ON hr_timesheets(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_timesheets_period ON hr_timesheets(period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_hr_timesheets_status ON hr_timesheets(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_timesheets_unique_period ON hr_timesheets(employee_id, period_start_date, period_end_date);

-- Timesheet entries (daily/line item detail)
CREATE TABLE IF NOT EXISTS hr_timesheet_entries (
  entry_id VARCHAR(20) PRIMARY KEY,
  timesheet_id VARCHAR(20) NOT NULL REFERENCES hr_timesheets(timesheet_id) ON DELETE CASCADE,

  -- Entry Details
  work_date DATE NOT NULL,
  work_type hr_work_type DEFAULT 'REGULAR',
  description TEXT,

  -- Hours
  hours_worked DECIMAL(5, 2) NOT NULL,
  break_hours DECIMAL(5, 2) DEFAULT 0,

  -- Allocation
  order_id VARCHAR(30), -- If work is attributed to a specific order
  task_type VARCHAR(100), -- Picking, packing, receiving, etc.

  -- System Fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_timesheet_entries_timesheet ON hr_timesheet_entries(timesheet_id);
CREATE INDEX IF NOT EXISTS idx_hr_timesheet_entries_date ON hr_timesheet_entries(work_date);

-- ============================================================================
-- 4. PAYROLL TABLES
-- ============================================================================

-- Payroll periods
CREATE TABLE IF NOT EXISTS hr_payroll_periods (
  period_id VARCHAR(20) PRIMARY KEY,
  period_name VARCHAR(255) NOT NULL,
  period_start_date DATE NOT NULL UNIQUE,
  period_end_date DATE NOT NULL UNIQUE,
  pay_date DATE NOT NULL,

  -- Configuration
  pay_frequency hr_pay_frequency NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,

  -- Payroll Run Reference
  payroll_run_id VARCHAR(20), -- Set when payroll is processed

  -- System Fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_payroll_periods_dates ON hr_payroll_periods(period_start_date, period_end_date);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_periods_active ON hr_payroll_periods(is_active) WHERE is_active = true;

-- Payroll runs
CREATE TABLE IF NOT EXISTS hr_payroll_runs (
  payroll_run_id VARCHAR(20) PRIMARY KEY,
  period_id VARCHAR(20) NOT NULL REFERENCES hr_payroll_periods(period_id),

  -- Run Details
  run_number INTEGER NOT NULL,
  status hr_payroll_status DEFAULT 'DRAFT',

  -- Dates
  calculated_at TIMESTAMP WITH TIME ZONE,
  processed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,

  -- Totals
  employee_count INTEGER DEFAULT 0,
  total_gross_pay DECIMAL(12, 2) DEFAULT 0,
  total_net_pay DECIMAL(12, 2) DEFAULT 0,
  total_tax DECIMAL(12, 2) DEFAULT 0,
  total_kiwisaver DECIMAL(12, 2) DEFAULT 0,
  total_acc DECIMAL(12, 2) DEFAULT 0,
  total_deductions DECIMAL(12, 2) DEFAULT 0,
  total_employer_contributions DECIMAL(12, 2) DEFAULT 0,

  -- Accounting Integration
  journal_entry_id VARCHAR(50), -- Reference to accounting journal entry

  -- System Fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  created_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_hr_payroll_runs_period ON hr_payroll_runs(period_id);
CREATE INDEX IF NOT EXISTS idx_hr_payroll_runs_status ON hr_payroll_runs(status);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_payroll_runs_unique ON hr_payroll_runs(period_id, run_number);

-- Pay items (individual employee pays)
CREATE TABLE IF NOT EXISTS hr_pay_items (
  pay_item_id VARCHAR(20) PRIMARY KEY,
  payroll_run_id VARCHAR(20) NOT NULL REFERENCES hr_payroll_runs(payroll_run_id) ON DELETE CASCADE,
  employee_id VARCHAR(20) NOT NULL REFERENCES hr_employees(employee_id) ON DELETE CASCADE,

  -- Earnings
  regular_hours DECIMAL(8, 2) DEFAULT 0,
  regular_rate DECIMAL(10, 2) DEFAULT 0,
  regular_pay DECIMAL(12, 2) GENERATED ALWAYS AS (regular_hours * regular_rate) STORED,

  overtime_1_5_hours DECIMAL(8, 2) DEFAULT 0,
  overtime_1_5_rate DECIMAL(10, 2) DEFAULT 0,
  overtime_1_5_pay DECIMAL(12, 2) GENERATED ALWAYS AS (overtime_1_5_hours * overtime_1_5_rate) STORED,

  overtime_2_0_hours DECIMAL(8, 2) DEFAULT 0,
  overtime_2_0_rate DECIMAL(10, 2) DEFAULT 0,
  overtime_2_0_pay DECIMAL(12, 2) GENERATED ALWAYS AS (overtime_2_0_hours * overtime_2_0_rate) STORED,

  other_earnings DECIMAL(12, 2) DEFAULT 0,
  allowances DECIMAL(12, 2) DEFAULT 0,
  bonuses DECIMAL(12, 2) DEFAULT 0,

  -- Gross Pay (computed from base values, not from generated columns)
  gross_pay DECIMAL(12, 2) GENERATED ALWAYS AS (
    (regular_hours * regular_rate) +
    (overtime_1_5_hours * overtime_1_5_rate) +
    (overtime_2_0_hours * overtime_2_0_rate) +
    other_earnings + allowances + bonuses
  ) STORED,

  -- Deductions (Employee)
  paye_tax DECIMAL(12, 2) DEFAULT 0,
  kiwi_saver_employee DECIMAL(12, 2) DEFAULT 0,
  acc_earners_levy DECIMAL(12, 2) DEFAULT 0,
  student_loan DECIMAL(12, 2) DEFAULT 0,
  other_deductions DECIMAL(12, 2) DEFAULT 0,
  total_deductions DECIMAL(12, 2) GENERATED ALWAYS AS (
    paye_tax + kiwi_saver_employee + acc_earners_levy + student_loan + other_deductions
  ) STORED,

  -- Net Pay (computed from base values)
  net_pay DECIMAL(12, 2) GENERATED ALWAYS AS (
    ((regular_hours * regular_rate) +
    (overtime_1_5_hours * overtime_1_5_rate) +
    (overtime_2_0_hours * overtime_2_0_rate) +
    other_earnings + allowances + bonuses) -
    (paye_tax + kiwi_saver_employee + acc_earners_levy + student_loan + other_deductions)
  ) STORED,

  -- Employer Contributions (for accounting)
  kiwi_saver_employer DECIMAL(12, 2) DEFAULT 0,
  acc_employer_levy DECIMAL(12, 2) DEFAULT 0,
  total_employer_contributions DECIMAL(12, 2) GENERATED ALWAYS AS (
    kiwi_saver_employer + acc_employer_levy
  ) STORED,

  -- System Fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_pay_items_run ON hr_pay_items(payroll_run_id);
CREATE INDEX IF NOT EXISTS idx_hr_pay_items_employee ON hr_pay_items(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_pay_items_unique ON hr_pay_items(payroll_run_id, employee_id);

-- Deduction types (configurable)
CREATE TABLE IF NOT EXISTS hr_deduction_types (
  deduction_type_id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  category hr_deduction_category NOT NULL,
  description TEXT,

  -- Calculation
  is_taxable BOOLEAN NOT NULL DEFAULT false,
  is_pre_tax BOOLEAN NOT NULL DEFAULT false,
  calculation_method VARCHAR(50) DEFAULT 'FIXED_AMOUNT' CHECK (calculation_method IN ('FIXED_AMOUNT', 'PERCENTAGE', 'FORMULA')),

  -- GL Accounts for Accounting Integration
  expense_account VARCHAR(50), -- e.g., 'WAGES_EXPENSE'
  liability_account VARCHAR(50), -- e.g., 'PAYE_PAYABLE'

  -- System Fields
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_deduction_types_active ON hr_deduction_types(is_active) WHERE is_active = true;

-- Employee-specific deductions configuration
CREATE TABLE IF NOT EXISTS hr_employee_deductions (
  employee_deduction_id VARCHAR(20) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
  deduction_type_id VARCHAR(20) NOT NULL REFERENCES hr_deduction_types(deduction_type_id),

  -- Configuration
  amount DECIMAL(12, 2), -- For fixed amount deductions
  percentage DECIMAL(5, 2), -- For percentage-based deductions
  maximum_amount DECIMAL(12, 2), -- Cap on deduction amount

  -- Status
  is_active BOOLEAN NOT NULL DEFAULT true,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE,

  -- System Fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_employee_deductions_employee ON hr_employee_deductions(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_employee_deductions_active ON hr_employee_deductions(employee_id, is_active) WHERE is_active = true;

-- Pay stubs (generated payslips)
CREATE TABLE IF NOT EXISTS hr_pay_stubs (
  pay_stub_id VARCHAR(20) PRIMARY KEY,
  pay_item_id VARCHAR(20) NOT NULL REFERENCES hr_pay_items(pay_item_id) ON DELETE CASCADE,

  -- Pay Period
  pay_period_start DATE NOT NULL,
  pay_period_end DATE NOT NULL,
  pay_date DATE NOT NULL,

  -- Pay Details (stored as JSON for flexibility)
  pay_details JSONB NOT NULL,
  deduction_details JSONB NOT NULL,
  employer_contributions JSONB NOT NULL,
  ytd_totals JSONB NOT NULL, -- Year-to-date totals

  -- System Fields
  generated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_pay_stubs_pay_item ON hr_pay_stubs(pay_item_id);

-- ============================================================================
-- 5. LEAVE MANAGEMENT TABLES
-- ============================================================================

-- Leave types configuration
CREATE TABLE IF NOT EXISTS hr_leave_types (
  leave_type_id VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  leave_type hr_leave_type_enum NOT NULL,
  description TEXT,

  -- Accrual Settings
  accrual_rate DECIMAL(5, 2) DEFAULT 0, -- Hours per pay period
  accrual_frequency hr_pay_frequency DEFAULT 'FORTNIGHTLY',
  max_balance DECIMAL(8, 2), -- Maximum hours that can be accrued

  -- Paid/Unpaid
  is_paid BOOLEAN NOT NULL DEFAULT true,
  requires_approval BOOLEAN NOT NULL DEFAULT true,
  requires_documentation BOOLEAN NOT NULL DEFAULT false,

  -- System Fields
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_leave_types_active ON hr_leave_types(is_active) WHERE is_active = true;

-- Leave balances (per employee per leave type)
CREATE TABLE IF NOT EXISTS hr_leave_balances (
  balance_id VARCHAR(20) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
  leave_type_id VARCHAR(20) NOT NULL REFERENCES hr_leave_types(leave_type_id),

  -- Balances (in hours)
  opening_balance DECIMAL(8, 2) DEFAULT 0,
  accrued_hours DECIMAL(8, 2) DEFAULT 0,
  taken_hours DECIMAL(8, 2) DEFAULT 0,
  pending_hours DECIMAL(8, 2) DEFAULT 0, -- Pending approval
  current_balance DECIMAL(8, 2) GENERATED ALWAYS AS (opening_balance + accrued_hours - taken_hours) STORED,

  -- Year-to-Date
  ytd_accrued DECIMAL(8, 2) DEFAULT 0,
  ytd_taken DECIMAL(8, 2) DEFAULT 0,

  -- System Fields
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_leave_balances_employee ON hr_leave_balances(employee_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_hr_leave_balances_unique ON hr_leave_balances(employee_id, leave_type_id, effective_date);

-- Leave requests
CREATE TABLE IF NOT EXISTS hr_leave_requests (
  request_id VARCHAR(20) PRIMARY KEY,
  employee_id VARCHAR(20) NOT NULL REFERENCES hr_employees(employee_id) ON DELETE CASCADE,
  leave_type_id VARCHAR(20) NOT NULL REFERENCES hr_leave_types(leave_type_id),

  -- Request Details
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  total_hours DECIMAL(8, 2) NOT NULL,
  total_days DECIMAL(5, 2) NOT NULL,

  -- Reason
  reason TEXT,
  attachment_url VARCHAR(500), -- For documentation (medical certificate, etc.)

  -- Status
  status hr_leave_status DEFAULT 'PENDING',

  -- Approval
  submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  reviewed_by VARCHAR(20) REFERENCES users(user_id) ON DELETE SET NULL,
  reviewed_at TIMESTAMP WITH TIME ZONE,
  review_notes TEXT,

  -- System Fields
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_employee ON hr_leave_requests(employee_id);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_status ON hr_leave_requests(status);
CREATE INDEX IF NOT EXISTS idx_hr_leave_requests_dates ON hr_leave_requests(start_date, end_date);

-- ============================================================================
-- 6. NZ-SPECIFIC TAX TABLES
-- ============================================================================

-- IRD tax brackets (for PAYE calculation)
CREATE TABLE IF NOT EXISTS hr_tax_tables (
  tax_table_id VARCHAR(20) PRIMARY KEY,
  tax_code hr_nz_tax_code NOT NULL,
  effective_date DATE NOT NULL,

  -- Threshold and Rate
  threshold_from DECIMAL(12, 2) NOT NULL,
  threshold_to DECIMAL(12, 2),
  tax_rate DECIMAL(5, 2) NOT NULL, -- Percentage
  withholding_amount DECIMAL(12, 2) DEFAULT 0, -- Fixed withholding for the bracket

  -- System Fields
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_tax_tables_code ON hr_tax_tables(tax_code, is_active);

-- KiwiSaver contribution rates
CREATE TABLE IF NOT EXISTS hr_kiwisaver_rates (
  rate_id VARCHAR(20) PRIMARY KEY,
  rate_type hr_kiwisaver_rate NOT NULL,
  employee_rate DECIMAL(5, 2) NOT NULL, -- Percentage
  employer_rate DECIMAL(5, 2) NOT NULL, -- Percentage (minimum 3%)
  effective_date DATE NOT NULL,

  -- System Fields
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_kiwisaver_rates_active ON hr_kiwisaver_rates(is_active) WHERE is_active = true;

-- ACC levy rates (earners levy)
CREATE TABLE IF NOT EXISTS hr_acc_rates (
  acc_rate_id VARCHAR(20) PRIMARY KEY,
  income_from DECIMAL(12, 2) NOT NULL,
  income_to DECIMAL(12, 2),
  levy_rate DECIMAL(5, 2) NOT NULL, -- Percentage (currently 1.46%)
  effective_date DATE NOT NULL,

  -- System Fields
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_hr_acc_rates_active ON hr_acc_rates(is_active) WHERE is_active = true;

-- ============================================================================
-- 7. UPDATED_AT TRIGGER FUNCTION (for all HR tables)
-- ============================================================================

CREATE OR REPLACE FUNCTION update_hr_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply trigger to tables with updated_at
DROP TRIGGER IF EXISTS trigger_hr_employees_updated_at ON hr_employees;
CREATE TRIGGER trigger_hr_employees_updated_at
  BEFORE UPDATE ON hr_employees
  FOR EACH ROW
  EXECUTE FUNCTION update_hr_updated_at();

DROP TRIGGER IF EXISTS trigger_hr_tax_details_updated_at ON hr_employee_tax_details;
CREATE TRIGGER trigger_hr_tax_details_updated_at
  BEFORE UPDATE ON hr_employee_tax_details
  FOR EACH ROW
  EXECUTE FUNCTION update_hr_updated_at();

DROP TRIGGER IF EXISTS trigger_hr_employments_updated_at ON hr_employments;
CREATE TRIGGER trigger_hr_employments_updated_at
  BEFORE UPDATE ON hr_employments
  FOR EACH ROW
  EXECUTE FUNCTION update_hr_updated_at();

DROP TRIGGER IF EXISTS trigger_hr_bank_accounts_updated_at ON hr_bank_accounts;
CREATE TRIGGER trigger_hr_bank_accounts_updated_at
  BEFORE UPDATE ON hr_bank_accounts
  FOR EACH ROW
  EXECUTE FUNCTION update_hr_updated_at();

DROP TRIGGER IF EXISTS trigger_hr_timesheets_updated_at ON hr_timesheets;
CREATE TRIGGER trigger_hr_timesheets_updated_at
  BEFORE UPDATE ON hr_timesheets
  FOR EACH ROW
  EXECUTE FUNCTION update_hr_updated_at();

DROP TRIGGER IF EXISTS trigger_hr_timesheet_entries_updated_at ON hr_timesheet_entries;
CREATE TRIGGER trigger_hr_timesheet_entries_updated_at
  BEFORE UPDATE ON hr_timesheet_entries
  FOR EACH ROW
  EXECUTE FUNCTION update_hr_updated_at();

DROP TRIGGER IF EXISTS trigger_hr_payroll_periods_updated_at ON hr_payroll_periods;
CREATE TRIGGER trigger_hr_payroll_periods_updated_at
  BEFORE UPDATE ON hr_payroll_periods
  FOR EACH ROW
  EXECUTE FUNCTION update_hr_updated_at();

DROP TRIGGER IF EXISTS trigger_hr_payroll_runs_updated_at ON hr_payroll_runs;
CREATE TRIGGER trigger_hr_payroll_runs_updated_at
  BEFORE UPDATE ON hr_payroll_runs
  FOR EACH ROW
  EXECUTE FUNCTION update_hr_updated_at();

DROP TRIGGER IF EXISTS trigger_hr_deduction_types_updated_at ON hr_deduction_types;
CREATE TRIGGER trigger_hr_deduction_types_updated_at
  BEFORE UPDATE ON hr_deduction_types
  FOR EACH ROW
  EXECUTE FUNCTION update_hr_updated_at();

DROP TRIGGER IF EXISTS trigger_hr_employee_deductions_updated_at ON hr_employee_deductions;
CREATE TRIGGER trigger_hr_employee_deductions_updated_at
  BEFORE UPDATE ON hr_employee_deductions
  FOR EACH ROW
  EXECUTE FUNCTION update_hr_updated_at();

DROP TRIGGER IF EXISTS trigger_hr_leave_types_updated_at ON hr_leave_types;
CREATE TRIGGER trigger_hr_leave_types_updated_at
  BEFORE UPDATE ON hr_leave_types
  FOR EACH ROW
  EXECUTE FUNCTION update_hr_updated_at();

DROP TRIGGER IF EXISTS trigger_hr_leave_balances_updated_at ON hr_leave_balances;
CREATE TRIGGER trigger_hr_leave_balances_updated_at
  BEFORE UPDATE ON hr_leave_balances
  FOR EACH ROW
  EXECUTE FUNCTION update_hr_updated_at();

DROP TRIGGER IF EXISTS trigger_hr_leave_requests_updated_at ON hr_leave_requests;
CREATE TRIGGER trigger_hr_leave_requests_updated_at
  BEFORE UPDATE ON hr_leave_requests
  FOR EACH ROW
  EXECUTE FUNCTION update_hr_updated_at();

-- ============================================================================
-- 8. COMMENTS
-- ============================================================================

COMMENT ON TABLE hr_employees IS 'Core employee records (separate from system users)';
COMMENT ON TABLE hr_employee_tax_details IS 'NZ-specific tax information (IRD number, tax code)';
COMMENT ON TABLE hr_employments IS 'Employment contracts and compensation details';
COMMENT ON TABLE hr_bank_accounts IS 'Employee bank accounts for direct deposit';
COMMENT ON TABLE hr_timesheets IS 'Timesheet headers for pay periods';
COMMENT ON TABLE hr_timesheet_entries IS 'Daily timesheet entries with hours and work type';
COMMENT ON TABLE hr_payroll_periods IS 'Pay period definitions';
COMMENT ON TABLE hr_payroll_runs IS 'Payroll run records with totals';
COMMENT ON TABLE hr_pay_items IS 'Individual pay items per employee per run';
COMMENT ON TABLE hr_deduction_types IS 'Configurable deduction types';
COMMENT ON TABLE hr_employee_deductions IS 'Employee-specific deduction configurations';
COMMENT ON TABLE hr_pay_stubs IS 'Generated pay stubs (payslips)';
COMMENT ON TABLE hr_leave_types IS 'Leave type configurations';
COMMENT ON TABLE hr_leave_balances IS 'Employee leave balance tracking';
COMMENT ON TABLE hr_leave_requests IS 'Leave request workflow';
COMMENT ON TABLE hr_tax_tables IS 'IRD tax brackets for PAYE calculation';
COMMENT ON TABLE hr_kiwisaver_rates IS 'KiwiSaver contribution rates';
COMMENT ON TABLE hr_acc_rates IS 'ACC levy rates (earners levy)';
