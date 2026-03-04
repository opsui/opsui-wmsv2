-- ============================================================================
-- FIX: Increase asset_id column length to accommodate generated IDs
-- The generateId function creates IDs like "FA-1709526799000-abc123def" (24+ chars)
-- but the column was defined as VARCHAR(20), causing "value too long" errors
-- ============================================================================

-- Fix asset_id in acct_fixed_assets
ALTER TABLE acct_fixed_assets ALTER COLUMN asset_id TYPE VARCHAR(50);

-- Fix asset_id in acct_depreciation_schedule (foreign key)
ALTER TABLE acct_depreciation_schedule ALTER COLUMN asset_id TYPE VARCHAR(50);

-- Fix asset_id in acct_asset_disposals (foreign key)
ALTER TABLE acct_asset_disposals ALTER COLUMN asset_id TYPE VARCHAR(50);

-- Also fix other ID columns that may have the same issue
ALTER TABLE acct_chart_of_accounts ALTER COLUMN account_id TYPE VARCHAR(50);
ALTER TABLE acct_journal_entries ALTER COLUMN journal_entry_id TYPE VARCHAR(50);
ALTER TABLE acct_journal_entry_lines ALTER COLUMN line_id TYPE VARCHAR(50);
ALTER TABLE acct_journal_entry_lines ALTER COLUMN journal_entry_id TYPE VARCHAR(50);
ALTER TABLE acct_journal_entry_lines ALTER COLUMN account_id TYPE VARCHAR(50);
ALTER TABLE acct_trial_balance ALTER COLUMN trial_balance_id TYPE VARCHAR(50);
ALTER TABLE acct_trial_balance_lines ALTER COLUMN line_id TYPE VARCHAR(50);
ALTER TABLE acct_trial_balance_lines ALTER COLUMN trial_balance_id TYPE VARCHAR(50);
ALTER TABLE acct_trial_balance_lines ALTER COLUMN account_id TYPE VARCHAR(50);
ALTER TABLE acct_budgets ALTER COLUMN budget_id TYPE VARCHAR(50);
ALTER TABLE acct_budget_lines ALTER COLUMN line_id TYPE VARCHAR(50);
ALTER TABLE acct_budget_lines ALTER COLUMN budget_id TYPE VARCHAR(50);
ALTER TABLE acct_budget_lines ALTER COLUMN account_id TYPE VARCHAR(50);
ALTER TABLE acct_forecasts ALTER COLUMN forecast_id TYPE VARCHAR(50);
ALTER TABLE acct_forecast_lines ALTER COLUMN line_id TYPE VARCHAR(50);
ALTER TABLE acct_forecast_lines ALTER COLUMN forecast_id TYPE VARCHAR(50);
ALTER TABLE acct_forecast_lines ALTER COLUMN account_id TYPE VARCHAR(50);
ALTER TABLE acct_exchange_rates ALTER COLUMN rate_id TYPE VARCHAR(50);
ALTER TABLE acct_audit_log ALTER COLUMN audit_id TYPE VARCHAR(50);
ALTER TABLE acct_document_attachments ALTER COLUMN attachment_id TYPE VARCHAR(50);
ALTER TABLE acct_approvals ALTER COLUMN approval_id TYPE VARCHAR(50);
ALTER TABLE acct_ar_payments ALTER COLUMN payment_id TYPE VARCHAR(50);
ALTER TABLE acct_credit_memos ALTER COLUMN memo_id TYPE VARCHAR(50);
ALTER TABLE acct_ap_payments ALTER COLUMN payment_id TYPE VARCHAR(50);
ALTER TABLE acct_bank_reconciliations ALTER COLUMN reconciliation_id TYPE VARCHAR(50);
ALTER TABLE acct_revenue_contracts ALTER COLUMN contract_id TYPE VARCHAR(50);
ALTER TABLE acct_periods ALTER COLUMN period_id TYPE VARCHAR(50);

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'ID column lengths increased to VARCHAR(50)';
END $$;