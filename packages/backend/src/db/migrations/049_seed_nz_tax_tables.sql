-- ============================================================================
-- NZ TAX CONFIGURATION SEED DATA
--IRD tax brackets and rates for 2024/2025 tax year
-- KiwiSaver and ACC levy rates
-- ============================================================================

-- ============================================================================
-- 1. IRD TAX BRACKETS (PAYE) - 2024/2025
-- ============================================================================

-- Tax Code M (Main income)
-- Effective from 1 April 2024
INSERT INTO hr_tax_tables (tax_table_id, tax_code, effective_date, threshold_from, threshold_to, tax_rate, withholding_amount) VALUES
  ('TAX-M-001', 'M', '2024-04-01', 0, 14000, 10.50, 0),
  ('TAX-M-002', 'M', '2024-04-01', 14000.01, 48000, 17.50, 770),
  ('TAX-M-003', 'M', '2024-04-01', 48000.01, 70000, 30.00, 7530),
  ('TAX-M-004', 'M', '2024-04-01', 70000.01, 180000, 33.00, 14130),
  ('TAX-M-005', 'M', '2024-04-01', 180000.01, NULL, 39.00, 50370)
ON CONFLICT (tax_table_id) DO NOTHING;

-- Tax Code ME (Main income with SL)
-- Same rates as M but with student loan deduction
INSERT INTO hr_tax_tables (tax_table_id, tax_code, effective_date, threshold_from, threshold_to, tax_rate, withholding_amount) VALUES
  ('TAX-ME-001', 'ME', '2024-04-01', 0, 14000, 10.50, 0),
  ('TAX-ME-002', 'ME', '2024-04-01', 14000.01, 48000, 17.50, 770),
  ('TAX-ME-003', 'ME', '2024-04-01', 48000.01, 70000, 30.00, 7530),
  ('TAX-ME-004', 'ME', '2024-04-01', 70000.01, 180000, 33.00, 14130),
  ('TAX-ME-005', 'ME', '2024-04-01', 180000.01, NULL, 39.00, 50370)
ON CONFLICT (tax_table_id) DO NOTHING;

-- Tax Code L (Secondary income - lower deduction rate)
INSERT INTO hr_tax_tables (tax_table_id, tax_code, effective_date, threshold_from, threshold_to, tax_rate, withholding_amount) VALUES
  ('TAX-L-001', 'L', '2024-04-01', 0, 14000, 10.50, 0),
  ('TAX-L-002', 'L', '2024-04-01', 14000.01, 48000, 17.50, 770),
  ('TAX-L-003', 'L', '2024-04-01', 48000.01, 70000, 30.00, 7530),
  ('TAX-L-004', 'L', '2024-04-01', 70000.01, 180000, 33.00, 14130),
  ('TAX-L-005', 'L', '2024-04-01', 180000.01, NULL, 39.00, 50370)
ON CONFLICT (tax_table_id) DO NOTHING;

-- Tax Code S (Secondary income - higher deduction rate)
INSERT INTO hr_tax_tables (tax_table_id, tax_code, effective_date, threshold_from, threshold_to, tax_rate, withholding_amount) VALUES
  ('TAX-S-001', 'S', '2024-04-01', 0, 14000, 10.50, 0),
  ('TAX-S-002', 'S', '2024-04-01', 14000.01, 48000, 17.50, 770),
  ('TAX-S-003', 'S', '2024-04-01', 48000.01, 70000, 30.00, 7530),
  ('TAX-S-004', 'S', '2024-04-01', 70000.01, 180000, 33.00, 14130),
  ('TAX-S-005', 'S', '2024-04-01', 180000.01, NULL, 39.00, 50370)
ON CONFLICT (tax_table_id) DO NOTHING;

-- Tax Code SH (Secondary income - higher rate)
INSERT INTO hr_tax_tables (tax_table_id, tax_code, effective_date, threshold_from, threshold_to, tax_rate, withholding_amount) VALUES
  ('TAX-SH-001', 'SH', '2024-04-01', 0, 14000, 10.50, 0),
  ('TAX-SH-002', 'SH', '2024-04-01', 14000.01, 48000, 17.50, 770),
  ('TAX-SH-003', 'SH', '2024-04-01', 48000.01, 70000, 30.00, 7530),
  ('TAX-SH-004', 'SH', '2024-04-01', 70000.01, 180000, 33.00, 14130),
  ('TAX-SH-005', 'SH', '2024-04-01', 180000.01, NULL, 39.00, 50370)
ON CONFLICT (tax_table_id) DO NOTHING;

-- Tax Code ST (Student Loan secondary code)
INSERT INTO hr_tax_tables (tax_table_id, tax_code, effective_date, threshold_from, threshold_to, tax_rate, withholding_amount) VALUES
  ('TAX-ST-001', 'ST', '2024-04-01', 0, 14000, 10.50, 0),
  ('TAX-ST-002', 'ST', '2024-04-01', 14000.01, 48000, 17.50, 770),
  ('TAX-ST-003', 'ST', '2024-04-01', 48000.01, 70000, 30.00, 7530),
  ('TAX-ST-004', 'ST', '2024-04-01', 70000.01, 180000, 33.00, 14130),
  ('TAX-ST-005', 'ST', '2024-04-01', 180000.01, NULL, 39.00, 50370)
ON CONFLICT (tax_table_id) DO NOTHING;

-- ============================================================================
-- 2. KIWISAVER CONTRIBUTION RATES
-- ============================================================================

-- Employee can choose their contribution rate: 3%, 4%, 6%, 8%, or 10%
-- Employer must contribute at least 3%

INSERT INTO hr_kiwisaver_rates (rate_id, rate_type, employee_rate, employer_rate, effective_date) VALUES
  ('KS-RATE-001', 'RATE_3', 3.00, 3.00, '2024-04-01'),
  ('KS-RATE-002', 'RATE_4', 4.00, 3.00, '2024-04-01'),
  ('KS-RATE-003', 'RATE_6', 6.00, 3.00, '2024-04-01'),
  ('KS-RATE-004', 'RATE_8', 8.00, 3.00, '2024-04-01'),
  ('KS-RATE-005', 'RATE_10', 10.00, 3.00, '2024-04-01')
ON CONFLICT (rate_id) DO NOTHING;

-- ============================================================================
-- 3. ACC EARNERS LEVY RATES (2024/2025)
-- ACC levy is 1.46% on income up to $139,434 (2024/2025)
-- ============================================================================

INSERT INTO hr_acc_rates (acc_rate_id, income_from, income_to, levy_rate, effective_date) VALUES
  ('ACC-RATE-001', 0, 139434, 1.46, '2024-04-01'),
  ('ACC-RATE-002', 139434.01, NULL, 0.00, '2024-04-01') -- No ACC levy above the cap
ON CONFLICT (acc_rate_id) DO NOTHING;

-- ============================================================================
-- 4. DEDUCTION TYPES (NZ-specific)
-- ============================================================================

-- PAYE Tax
INSERT INTO hr_deduction_types (deduction_type_id, name, code, category, description, is_taxable, is_pre_tax, calculation_method, expense_account, liability_account) VALUES
  ('DED-PAYE', 'PAYE Income Tax', 'PAYE', 'TAX', 'PAYE tax deducted at source', true, true, 'PERCENTAGE', 'PAYE_TAX_EXPENSE', 'PAYE_PAYABLE')
ON CONFLICT (deduction_type_id) DO NOTHING;

-- KiwiSaver Employee Contribution
INSERT INTO hr_deduction_types (deduction_type_id, name, code, category, description, is_taxable, is_pre_tax, calculation_method, expense_account, liability_account) VALUES
  ('DED-KS-EMP', 'KiwiSaver Employee', 'KS_EMP', 'KIWISAVER', 'Employee KiwiSaver contribution', false, true, 'PERCENTAGE', NULL, 'KIWISAVER_PAYABLE')
ON CONFLICT (deduction_type_id) DO NOTHING;

-- KiwiSaver Employer Contribution
INSERT INTO hr_deduction_types (deduction_type_id, name, code, category, description, is_taxable, is_pre_tax, calculation_method, expense_account, liability_account) VALUES
  ('DED-KS-EMPLOYER', 'KiwiSaver Employer', 'KS_ER', 'KIWISAVER', 'Employer KiwiSaver contribution (not deducted from pay)', false, false, 'PERCENTAGE', 'KIWISAVER_EXPENSE', 'KIWISAVER_PAYABLE')
ON CONFLICT (deduction_type_id) DO NOTHING;

-- ACC Earners Levy
INSERT INTO hr_deduction_types (deduction_type_id, name, code, category, description, is_taxable, is_pre_tax, calculation_method, expense_account, liability_account) VALUES
  ('DED-ACC', 'ACC Earners Levy', 'ACC', 'ACC', 'ACC earners levy deducted from income', true, true, 'PERCENTAGE', NULL, 'ACC_PAYABLE')
ON CONFLICT (deduction_type_id) DO NOTHING;

-- ACC Employer Levy
INSERT INTO hr_deduction_types (deduction_type_id, name, code, category, description, is_taxable, is_pre_tax, calculation_method, expense_account, liability_account) VALUES
  ('DED-ACC-EMPLOYER', 'ACC Employer Levy', 'ACC_ER', 'ACC', 'ACC employer levy (not deducted from pay)', false, false, 'PERCENTAGE', 'ACC_EXPENSE', 'ACC_PAYABLE')
ON CONFLICT (deduction_type_id) DO NOTHING;

-- Student Loan Repayment
INSERT INTO hr_deduction_types (deduction_type_id, name, code, category, description, is_taxable, is_pre_tax, calculation_method, expense_account, liability_account) VALUES
  ('DED-SL', 'Student Loan Repayment', 'STUDENT_LOAN', 'TAX', 'Student loan repayment (SL repayment)', true, false, 'PERCENTAGE', NULL, 'STUDENT_LOAN_PAYABLE')
ON CONFLICT (deduction_type_id) DO NOTHING;

-- Union Fees
INSERT INTO hr_deduction_types (deduction_type_id, name, code, category, description, is_taxable, is_pre_tax, calculation_method, expense_account, liability_account) VALUES
  ('DED-UNION', 'Union Fees', 'UNION', 'UNION', 'Trade union membership fees', false, false, 'FIXED_AMOUNT', NULL, 'UNION_PAYABLE')
ON CONFLICT (deduction_type_id) DO NOTHING;

-- Medical Insurance
INSERT INTO hr_deduction_types (deduction_type_id, name, code, category, description, is_taxable, is_pre_tax, calculation_method, expense_account, liability_account) VALUES
  ('DED-MEDICAL', 'Medical Insurance', 'MEDICAL', 'INSURANCE', 'Medical/Health insurance contributions', false, false, 'FIXED_AMOUNT', NULL, 'MEDICAL_PAYABLE')
ON CONFLICT (deduction_type_id) DO NOTHING;

-- ============================================================================
-- 5. LEAVE TYPES (NZ Employment Standards)
-- ============================================================================

-- Annual Leave (4 weeks minimum per year)
INSERT INTO hr_leave_types (leave_type_id, name, code, leave_type, description, accrual_rate, accrual_frequency, max_balance, is_paid, requires_approval, requires_documentation) VALUES
  ('LT-ANNUAL', 'Annual Leave', 'ANN', 'ANNUAL', '4 weeks paid annual leave per year', 6.92, 'FORTNIGHTLY', 320, true, true, false)
ON CONFLICT (leave_type_id) DO NOTHING;

-- Sick Leave (10 days minimum per year)
INSERT INTO hr_leave_types (leave_type_id, name, code, leave_type, description, accrual_rate, accrual_frequency, max_balance, is_paid, requires_approval, requires_documentation) VALUES
  ('LT-SICK', 'Sick Leave', 'SICK', 'SICK', 'Paid sick leave (10 days per year)', 3.08, 'FORTNIGHTLY', 40, true, true, true)
ON CONFLICT (leave_type_id) DO NOTHING;

-- Bereavement Leave
INSERT INTO hr_leave_types (leave_type_id, name, code, leave_type, description, accrual_rate, accrual_frequency, max_balance, is_paid, requires_approval, requires_documentation) VALUES
  ('LT-BEREAVEMENT', 'Bereavement Leave', 'BER', 'BEREAVEMENT', 'Paid bereavement leave (immediate family)', 0, 'FORTNIGHTLY', NULL, true, true, false)
ON CONFLICT (leave_type_id) DO NOTHING;

-- Parental Leave
INSERT INTO hr_leave_types (leave_type_id, name, code, leave_type, description, accrual_rate, accrual_frequency, max_balance, is_paid, requires_approval, requires_documentation) VALUES
  ('LT-PARENTAL', 'Parental Leave', 'PAR', 'PARENTAL', 'Paid parental leave', 0, 'FORTNIGHTLY', NULL, true, true, true)
ON CONFLICT (leave_type_id) DO NOTHING;

-- Unpaid Leave
INSERT INTO hr_leave_types (leave_type_id, name, code, leave_type, description, accrual_rate, accrual_frequency, max_balance, is_paid, requires_approval, requires_documentation) VALUES
  ('LT-UNPAID', 'Unpaid Leave', 'UNPD', 'UNPAID', 'Unpaid leave (no accrual)', 0, 'FORTNIGHTLY', NULL, false, true, false)
ON CONFLICT (leave_type_id) DO NOTHING;

-- Domestic Violence Leave
INSERT INTO hr_leave_types (leave_type_id, name, code, leave_type, description, accrual_rate, accrual_frequency, max_balance, is_paid, requires_approval, requires_documentation) VALUES
  ('LT-DV', 'Domestic Violence Leave', 'DV', 'DOMESTIC_VIOLENCE', 'Paid domestic violence leave (10 days per year)', 0, 'FORTNIGHTLY', 40, true, true, false)
ON CONFLICT (leave_type_id) DO NOTHING;

-- Jury Duty Leave
INSERT INTO hr_leave_types (leave_type_id, name, code, leave_type, description, accrual_rate, accrual_frequency, max_balance, is_paid, requires_approval, requires_documentation) VALUES
  ('LT-JURY', 'Jury Duty Leave', 'JURY', 'JURY_DUTY', 'Paid jury duty leave', 0, 'FORTNIGHTLY', NULL, true, true, true)
ON CONFLICT (leave_type_id) DO NOTHING;

-- ============================================================================
-- 6. SAMPLE PAYROLL PERIODS (Fortnightly)
-- Starting from 1 July 2024
-- ============================================================================

INSERT INTO hr_payroll_periods (period_id, period_name, period_start_date, period_end_date, pay_date, pay_frequency, is_active) VALUES
  ('PAY-P-001', 'Fortnight 1 - 2024/25', '2024-07-01', '2024-07-14', '2024-07-17', 'FORTNIGHTLY', true),
  ('PAY-P-002', 'Fortnight 2 - 2024/25', '2024-07-15', '2024-07-28', '2024-07-31', 'FORTNIGHTLY', true),
  ('PAY-P-003', 'Fortnight 3 - 2024/25', '2024-07-29', '2024-08-11', '2024-08-14', 'FORTNIGHTLY', true),
  ('PAY-P-004', 'Fortnight 4 - 2024/25', '2024-08-12', '2024-08-25', '2024-08-28', 'FORTNIGHTLY', true),
  ('PAY-P-005', 'Fortnight 5 - 2024/25', '2024-08-26', '2024-09-08', '2024-09-11', 'FORTNIGHTLY', true),
  ('PAY-P-006', 'Fortnight 6 - 2024/25', '2024-09-09', '2024-09-22', '2024-09-25', 'FORTNIGHTLY', true),
  ('PAY-P-007', 'Fortnight 7 - 2024/25', '2024-09-23', '2024-10-06', '2024-10-09', 'FORTNIGHTLY', true),
  ('PAY-P-008', 'Fortnight 8 - 2024/25', '2024-10-07', '2024-10-20', '2024-10-23', 'FORTNIGHTLY', true),
  ('PAY-P-009', 'Fortnight 9 - 2024/25', '2024-10-21', '2024-11-03', '2024-11-06', 'FORTNIGHTLY', true),
  ('PAY-P-010', 'Fortnight 10 - 2024/25', '2024-11-04', '2024-11-17', '2024-11-20', 'FORTNIGHTLY', true),
  ('PAY-P-011', 'Fortnight 11 - 2024/25', '2024-11-18', '2024-12-01', '2024-12-04', 'FORTNIGHTLY', true),
  ('PAY-P-012', 'Fortnight 12 - 2024/25', '2024-12-02', '2024-12-15', '2024-12-18', 'FORTNIGHTLY', true),
  ('PAY-P-013', 'Fortnight 13 - 2024/25', '2024-12-16', '2024-12-29', '2025-01-08', 'FORTNIGHTLY', true)
ON CONFLICT (period_id) DO NOTHING;

-- ============================================================================
-- 7. SAMPLE EMPLOYEES
-- ============================================================================

INSERT INTO hr_employees (employee_id, user_id, first_name, last_name, preferred_name, email, phone, emergency_contact_name, emergency_contact_phone, employee_number, status, hire_date, created_by) VALUES
  ('EMP-001', 'USR-ADMIN', 'Admin', 'User', 'Admin', 'admin@wms.local', '021-123-4567', 'Jane Doe', '021-987-6543', 'EMP001', 'ACTIVE', '2023-01-01', 'USR-ADMIN'),
  ('EMP-002', NULL, 'John', 'Smith', 'John', 'john.smith@example.com', '022-234-5678', 'Mary Smith', '022-876-5432', 'EMP002', 'ACTIVE', '2023-02-15', 'USR-ADMIN'),
  ('EMP-003', NULL, 'Sarah', 'Johnson', 'Sarah', 'sarah.j@example.com', '027-345-6789', 'Bob Johnson', '027-987-6543', 'EMP003', 'ACTIVE', '2023-03-01', 'USR-ADMIN')
ON CONFLICT (employee_id) DO NOTHING;

-- Tax details for sample employees
INSERT INTO hr_employee_tax_details (tax_detail_id, employee_id, ird_number, tax_code, has_student_loan) VALUES
  ('TX-001', 'EMP-001', '12-345-678', 'M', false),
  ('TX-002', 'EMP-002', '23-456-789', 'M', false),
  ('TX-003', 'EMP-003', '34-567-890', 'ME', true)
ON CONFLICT (tax_detail_id) DO NOTHING;

-- Employment records for sample employees
INSERT INTO hr_employments (employment_id, employee_id, position_title, employment_type, department, pay_type, hourly_rate, standard_hours_per_week, start_date, is_primary) VALUES
  ('EMP-001-01', 'EMP-001', 'Warehouse Manager', 'FULL_TIME', 'Management', 'SALARY', NULL, 40.00, '2023-01-01', true),
  ('EMP-002-01', 'EMP-002', 'Picker', 'FULL_TIME', 'Operations', 'HOURLY', 25.50, 40.00, '2023-02-15', true),
  ('EMP-003-01', 'EMP-003', 'Packer', 'PART_TIME', 'Operations', 'HOURLY', 24.00, 20.00, '2023-03-01', true)
ON CONFLICT (employment_id) DO NOTHING;

-- Bank accounts for sample employees
INSERT INTO hr_bank_accounts (bank_account_id, employee_id, bank_name, bank_branch, account_number, account_type, is_primary) VALUES
  ('BA-001', 'EMP-001', 'ANZ', 'Wellington Central', '12-3456-7890123-00', 'CHECKING', true),
  ('BA-002', 'EMP-002', 'Westpac', 'Auckland CBD', '23-4567-8901234-00', 'CHECKING', true),
  ('BA-003', 'EMP-003', 'BNZ', 'Christchurch', '34-5678-9012345-00', 'CHECKING', true)
ON CONFLICT (bank_account_id) DO NOTHING;

-- ============================================================================
-- 8. INITIAL LEAVE BALANCES
-- ============================================================================

-- Annual leave balances (starting with some accrued leave)
-- Note: current_balance is a GENERATED column and will be calculated automatically
INSERT INTO hr_leave_balances (balance_id, employee_id, leave_type_id, opening_balance, accrued_hours, taken_hours, ytd_accrued, ytd_taken, effective_date) VALUES
  ('LB-001', 'EMP-001', 'LT-ANNUAL', 160, 0, 0, 0, 0, '2024-04-01'),
  ('LB-002', 'EMP-002', 'LT-ANNUAL', 80, 0, 0, 0, 0, '2024-04-01'),
  ('LB-003', 'EMP-003', 'LT-ANNUAL', 40, 0, 0, 0, 0, '2024-04-01'),
  ('LB-004', 'EMP-001', 'LT-SICK', 40, 0, 0, 0, 0, '2024-04-01'),
  ('LB-005', 'EMP-002', 'LT-SICK', 20, 0, 0, 0, 0, '2024-04-01'),
  ('LB-006', 'EMP-003', 'LT-SICK', 10, 0, 0, 0, 0, '2024-04-01')
ON CONFLICT (balance_id) DO NOTHING;

-- ============================================================================
-- 9. EMPLOYEE KIWISAVER ELECTIONS
-- ============================================================================

-- Default KiwiSaver deductions at 3%
INSERT INTO hr_employee_deductions (employee_deduction_id, employee_id, deduction_type_id, percentage, is_active, effective_date) VALUES
  ('ED-001', 'EMP-001', 'DED-KS-EMP', 3.00, true, '2023-01-01'),
  ('ED-002', 'EMP-002', 'DED-KS-EMP', 3.00, true, '2023-02-15'),
  ('ED-003', 'EMP-003', 'DED-KS-EMP', 4.00, true, '2023-03-01')
ON CONFLICT (employee_deduction_id) DO NOTHING;

-- Student loan for employee who has one
INSERT INTO hr_employee_deductions (employee_deduction_id, employee_id, deduction_type_id, percentage, is_active, effective_date) VALUES
  ('ED-004', 'EMP-003', 'DED-SL', 12.00, true, '2023-03-01')
ON CONFLICT (employee_deduction_id) DO NOTHING;

-- ============================================================================
-- 10. SAMPLE TIMESHEET (for demonstration)
-- ============================================================================

INSERT INTO hr_timesheets (timesheet_id, employee_id, period_start_date, period_end_date, status, total_regular_hours, total_overtime_hours, submitted_at, submitted_by) VALUES
  ('TS-001', 'EMP-002', '2024-07-01', '2024-07-14', 'SUBMITTED', 80.00, 4.50, NOW(), 'USR-ADMIN')
ON CONFLICT (timesheet_id) DO NOTHING;

-- Timesheet entries
INSERT INTO hr_timesheet_entries (entry_id, timesheet_id, work_date, work_type, hours_worked, description, task_type) VALUES
  ('TSE-001', 'TS-001', '2024-07-01', 'REGULAR', 8.00, 'Regular picking shift', 'PICKING'),
  ('TSE-002', 'TS-001', '2024-07-02', 'REGULAR', 8.00, 'Regular picking shift', 'PICKING'),
  ('TSE-003', 'TS-001', '2024-07-03', 'REGULAR', 8.00, 'Regular picking shift', 'PICKING'),
  ('TSE-004', 'TS-001', '2024-07-04', 'REGULAR', 8.00, 'Regular picking shift', 'PICKING'),
  ('TSE-005', 'TS-001', '2024-07-05', 'REGULAR', 8.00, 'Regular picking shift', 'PICKING'),
  ('TSE-006', 'TS-001', '2024-07-08', 'REGULAR', 8.00, 'Regular picking shift', 'PICKING'),
  ('TSE-007', 'TS-001', '2024-07-09', 'REGULAR', 8.00, 'Regular picking shift', 'PICKING'),
  ('TSE-008', 'TS-001', '2024-07-10', 'REGULAR', 8.00, 'Regular picking shift', 'PICKING'),
  ('TSE-009', 'TS-001', '2024-07-11', 'REGULAR', 8.00, 'Regular picking shift', 'PICKING'),
  ('TSE-010', 'TS-001', '2024-07-12', 'OVERTIME_1_5', 4.50, 'Overtime - warehouse clearance', 'PICKING')
ON CONFLICT (entry_id) DO NOTHING;

-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON TABLE hr_tax_tables IS 'IRD tax brackets for PAYE calculation - 2024/2025 rates';
COMMENT ON TABLE hr_kiwisaver_rates IS 'KiwiSaver contribution rates - employee and employer';
COMMENT ON TABLE hr_acc_rates IS 'ACC earners levy rates - capped at $139,434 for 2024/25';
