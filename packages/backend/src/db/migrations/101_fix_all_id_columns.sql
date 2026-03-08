-- Fix all ID columns from VARCHAR(20) to VARCHAR(50)
-- This migration fixes the "value too long for type character varying(20)" error
-- for all generated IDs that exceed 20 characters

-- Core tables
ALTER TABLE IF EXISTS users ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS users ALTER COLUMN current_task_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS bin_locations ALTER COLUMN bin_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS inventory_units ALTER COLUMN unit_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS orders ALTER COLUMN picker_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS orders ALTER COLUMN packer_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS order_items ALTER COLUMN order_item_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS pick_tasks ALTER COLUMN pick_task_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS pick_tasks ALTER COLUMN order_item_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS pick_tasks ALTER COLUMN picker_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS inventory_transactions ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS order_state_changes ALTER COLUMN user_id TYPE VARCHAR(50);

-- HR tables
ALTER TABLE IF EXISTS hr_employees ALTER COLUMN employee_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_employees ALTER COLUMN user_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_employee_tax_details ALTER COLUMN tax_detail_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_employee_tax_details ALTER COLUMN employee_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_employments ALTER COLUMN employment_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_employments ALTER COLUMN employee_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_bank_accounts ALTER COLUMN bank_account_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_bank_accounts ALTER COLUMN employee_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_timesheets ALTER COLUMN timesheet_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_timesheets ALTER COLUMN employee_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_timesheets ALTER COLUMN payroll_run_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_timesheet_entries ALTER COLUMN entry_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_timesheet_entries ALTER COLUMN timesheet_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_payroll_periods ALTER COLUMN period_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_payroll_periods ALTER COLUMN payroll_run_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_payroll_runs ALTER COLUMN payroll_run_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_payroll_runs ALTER COLUMN period_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_pay_items ALTER COLUMN pay_item_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_pay_items ALTER COLUMN payroll_run_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_pay_items ALTER COLUMN employee_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_deduction_types ALTER COLUMN deduction_type_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_employee_deductions ALTER COLUMN employee_deduction_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_employee_deductions ALTER COLUMN employee_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_employee_deductions ALTER COLUMN deduction_type_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_pay_stubs ALTER COLUMN pay_stub_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_pay_stubs ALTER COLUMN pay_item_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_leave_types ALTER COLUMN leave_type_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_leave_balances ALTER COLUMN balance_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_leave_balances ALTER COLUMN employee_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_leave_balances ALTER COLUMN leave_type_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_leave_requests ALTER COLUMN request_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_leave_requests ALTER COLUMN employee_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_leave_requests ALTER COLUMN leave_type_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_tax_tables ALTER COLUMN tax_table_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_kiwisaver_rates ALTER COLUMN rate_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS hr_acc_rates ALTER COLUMN acc_rate_id TYPE VARCHAR(50);

-- Asset/Audit tables
ALTER TABLE IF EXISTS depreciation_run ALTER COLUMN run_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS asset_audits ALTER COLUMN audit_id TYPE VARCHAR(50);

-- Multi-entity tables
ALTER TABLE IF EXISTS entity_relationships ALTER COLUMN relationship_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entity_relationships ALTER COLUMN entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entity_relationships ALTER COLUMN related_entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS module_permissions ALTER COLUMN permission_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entity_settings ALTER COLUMN setting_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entity_settings ALTER COLUMN entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entity_users ALTER COLUMN entity_user_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entity_users ALTER COLUMN entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entities ALTER COLUMN entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entities ALTER COLUMN parent_entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS intercompany_transactions ALTER COLUMN transaction_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS intercompany_transactions ALTER COLUMN from_entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS intercompany_transactions ALTER COLUMN to_entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS consolidation_rules ALTER COLUMN rule_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS consolidation_rules ALTER COLUMN parent_entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS consolidation_rules ALTER COLUMN subsidiary_entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS consolidation_rules ALTER COLUMN consolidation_account_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS consolidation_rules ALTER COLUMN minority_interest_account_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entity_exchange_rates ALTER COLUMN rate_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entity_exchange_rates ALTER COLUMN entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entity_audit_log ALTER COLUMN audit_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entity_audit_log ALTER COLUMN entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entity_audit_log ALTER COLUMN related_entity_id TYPE VARCHAR(50);

-- Module/Billing tables
ALTER TABLE IF EXISTS module_subscriptions ALTER COLUMN subscription_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS module_subscriptions ALTER COLUMN entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entity_user_tiers ALTER COLUMN tier_assignment_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entity_user_tiers ALTER COLUMN entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS addon_subscriptions ALTER COLUMN addon_subscription_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS addon_subscriptions ALTER COLUMN entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS billing_invoices ALTER COLUMN invoice_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS billing_invoices ALTER COLUMN entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS billing_invoice_items ALTER COLUMN item_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS billing_invoice_items ALTER COLUMN invoice_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entity_module_settings ALTER COLUMN setting_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entity_module_settings ALTER COLUMN entity_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS module_audit_log ALTER COLUMN audit_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS module_audit_log ALTER COLUMN entity_id TYPE VARCHAR(50);

-- Organization tables
ALTER TABLE IF EXISTS organizations ALTER COLUMN organization_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS organization_users ALTER COLUMN organization_user_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS organization_users ALTER COLUMN organization_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS organization_invitations ALTER COLUMN invitation_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS organization_invitations ALTER COLUMN organization_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS entities ALTER COLUMN organization_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS users ALTER COLUMN default_organization_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS orders ALTER COLUMN organization_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS skus ALTER COLUMN organization_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS customers ALTER COLUMN organization_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS bin_locations ALTER COLUMN organization_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS organization_settings ALTER COLUMN setting_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS organization_settings ALTER COLUMN organization_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS organization_audit_log ALTER COLUMN audit_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS organization_audit_log ALTER COLUMN organization_id TYPE VARCHAR(50);

-- Remaining accounting tables (not already fixed)
ALTER TABLE IF EXISTS acct_journal_entries ALTER COLUMN reversal_entry_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_trial_balance_lines ALTER COLUMN line_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_trial_balance_lines ALTER COLUMN trial_balance_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_exchange_rates ALTER COLUMN rate_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_budgets ALTER COLUMN budget_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_budget_lines ALTER COLUMN line_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_budget_lines ALTER COLUMN budget_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_budget_lines ALTER COLUMN account_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_forecasts ALTER COLUMN forecast_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_forecast_lines ALTER COLUMN line_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_forecast_lines ALTER COLUMN forecast_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_forecast_lines ALTER COLUMN account_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_audit_log ALTER COLUMN audit_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_document_attachments ALTER COLUMN attachment_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_approvals ALTER COLUMN approval_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_ar_payments ALTER COLUMN payment_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_ar_payments ALTER COLUMN receivable_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_credit_memos ALTER COLUMN memo_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_credit_memos ALTER COLUMN receivable_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_ap_payments ALTER COLUMN payment_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_ap_payments ALTER COLUMN payable_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_bank_reconciliations ALTER COLUMN reconciliation_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_bank_reconciliations ALTER COLUMN bank_account_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_revenue_contracts ALTER COLUMN contract_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_revenue_contracts ALTER COLUMN customer_id TYPE VARCHAR(50);
ALTER TABLE IF EXISTS acct_periods ALTER COLUMN period_id TYPE VARCHAR(50);