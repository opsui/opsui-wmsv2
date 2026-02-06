/**
 * Run full ERP accounting migrations (all phases)
 * Phase 1: Chart of Accounts, Journal Entries, Balance Sheet, Cash Flow
 * Phase 2: Enhanced AR/AP, Cash Management, Revenue Recognition
 * Phase 3: Multi-Currency, Budgeting, Fixed Assets, Compliance
 */

import { query, closePool } from './client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('Running full ERP accounting migrations (all phases)...\n');

    const migrations = [
      { name: 'Phase 1: Foundation', file: '044_add_full_erp_accounting_phase1.sql' },
      { name: 'Phase 2: Operational', file: '045_add_full_erp_accounting_phase2.sql' },
      { name: 'Phase 3: Advanced', file: '046_add_full_erp_accounting_phase3.sql' },
    ];

    for (const migration of migrations) {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Running ${migration.name}...`);
      console.log('='.repeat(60));

      const migrationPath = path.join(__dirname, 'migrations', migration.file);
      const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

      await query(migrationSQL);
      console.log(`✅ ${migration.name} completed successfully!`);
    }

    console.log('\n' + '='.repeat(60));
    console.log('✅ ALL ERP ACCOUNTING MIGRATIONS COMPLETED SUCCESSFULLY!');
    console.log('='.repeat(60));
    console.log('\nNew tables created:');
    console.log('  - acct_chart_of_accounts (Chart of Accounts)');
    console.log('  - acct_journal_entries (Journal Entries Header)');
    console.log('  - acct_journal_entry_lines (Journal Entry Lines)');
    console.log('  - acct_trial_balance (Trial Balance)');
    console.log('  - acct_ar_payments (AR Payments)');
    console.log('  - acct_credit_memos (Credit Memos)');
    console.log('  - acct_collection_activities (Collections)');
    console.log('  - acct_ap_payments (AP Payments)');
    console.log('  - acct_payment_schedules (Payment Scheduling)');
    console.log('  - acct_bank_accounts (Bank Accounts)');
    console.log('  - acct_bank_reconciliations (Bank Reconciliation)');
    console.log('  - acct_reconciliation_items (Reconciliation Items)');
    console.log('  - acct_cash_positions (Cash Position)');
    console.log('  - acct_cash_flow_forecasts (Cash Flow Forecast)');
    console.log('  - acct_revenue_contracts (Revenue Contracts)');
    console.log('  - acct_revenue_milestones (Revenue Milestones)');
    console.log('  - acct_revenue_schedule (Revenue Schedule)');
    console.log('  - acct_deferred_revenue (Deferred Revenue)');
    console.log('  - acct_currencies (Currencies)');
    console.log('  - acct_exchange_rates (Exchange Rates)');
    console.log('  - acct_currency_revaluation (Currency Revaluation)');
    console.log('  - acct_budgets (Budgets)');
    console.log('  - acct_budget_lines (Budget Lines)');
    console.log('  - acct_forecasts (Forecasts)');
    console.log('  - acct_forecast_lines (Forecast Lines)');
    console.log('  - acct_fixed_assets (Fixed Assets)');
    console.log('  - acct_depreciation_schedule (Depreciation Schedule)');
    console.log('  - acct_asset_disposals (Asset Disposals)');
    console.log('  - acct_audit_log (Audit Log)');
    console.log('  - acct_document_attachments (Document Attachments)');
    console.log('  - acct_approvals (Approvals)');
    console.log('  - acct_signatures (Electronic Signatures)');
    console.log('  - acct_periods (Fiscal Periods)');
    console.log('  - acct_closing_entries (Closing Entries)');

    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    await closePool();
    process.exit(1);
  }
}

runMigration();
