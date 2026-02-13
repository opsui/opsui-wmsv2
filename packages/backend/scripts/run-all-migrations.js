/**
 * Run all migrations in order
 * This script runs all migration files to bring production database up to date
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Pool } = require('pg');

// Migration files in order
const MIGRATIONS = [
  '001_create_custom_roles.sql',
  '003_phase3_tables.sql',
  '004_addon_modules.sql',
  '006_add_sku_barcode.sql',
  '008_create_audit_logs.sql',
  '009_create_wave_picking.sql',
  '010_feature_flags.sql',
  '011_add_notifications.sql',
  '012_create_business_rules.sql',
  '013_create_integrations.sql',
  '014_create_reports.sql',
  '015_fix_cycle_count_column_length.sql',
  '016_variance_severity_config.sql',
  '017_recurring_count_schedules.sql',
  '018_root_cause_categories.sql',
  '019_variance_root_causes.sql',
  '020_add_active_role.sql',
  '021_add_barcode_to_skus.sql',
  '022_add_cycle_count_variance_to_exceptions.sql',
  '023_add_inbound_receiving.sql',
  '024_add_order_exceptions.sql',
  '025_add_phase2_operational_excellence.sql',
  '026_add_rma_role.sql',
  '027_add_shipping.sql',
  '028_add_stock_control_tables.sql',
  '029_add_stock_controller_role.sql',
  '030_add_user_role_assignments.sql',
  '031_add_user_soft_delete.sql',
  '032_add_current_view.sql',
  '033_add_last_viewed_at.sql',
  '034_add_picker_status.sql',
  '035_fix_order_exceptions_foreign_key.sql',
  '036_fix_state_change_id_generation.sql',
  '037_grant_all_roles_to_admin.sql',
  '038_update_cycle_count_types.sql',
  '039_add_pricing_fields.sql',
  '040_add_dispatch_and_accounting_roles.sql',
  '041_add_accounting_tables.sql',
  '042_add_accounting_tables_v2.sql',
  '043_add_accounting_tables_final.sql',
  '044_add_full_erp_accounting_phase1.sql',
  '044_add_lot_tracking_to_inventory.sql',
  '045_add_full_erp_accounting_phase2.sql',
  '045_add_inventory_analytics.sql',
  '046_add_full_erp_accounting_phase3.sql',
  '048_add_hr_payroll_tables.sql',
  '049_seed_nz_tax_tables.sql',
  '050_add_rma_module.sql',
  '051_multi_entity_foundation.sql',
  '052_add_order_state_changes_table.sql',
  '052_projects_foundation.sql',
  '053_purchasing_workflow.sql',
  '054_advanced_manufacturing.sql',
  '055_sales_order_workflow.sql',
  '056_fixed_assets_lifecycle.sql',
  '057_ecommerce_integration.sql',
  '058_advanced_inventory.sql',
  '059_advanced_financials.sql',
  '061_add_all_missing_roles.sql',
];

async function runMigrations() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'wms_db',
    user: process.env.DB_USER || 'wms_user',
    password: process.env.DB_PASSWORD || 'wms_password',
  });

  console.log('Running all migrations...\n');

  let successCount = 0;
  let skipCount = 0;
  let errorCount = 0;

  for (const migrationFile of MIGRATIONS) {
    const migrationPath = path.join(__dirname, '../src/db/migrations', migrationFile);

    if (!fs.existsSync(migrationPath)) {
      console.log(`⚠️  SKIP: ${migrationFile} (file not found)`);
      skipCount++;
      continue;
    }

    try {
      const sql = fs.readFileSync(migrationPath, 'utf8');
      console.log(`🔄 Running: ${migrationFile}`);
      await pool.query(sql);
      console.log(`✅ DONE: ${migrationFile}\n`);
      successCount++;
    } catch (error) {
      // Check if it's a "already exists" type error which is fine
      if (error.message.includes('already exists') ||
          error.message.includes('duplicate key') ||
          error.message.includes('already been created')) {
        console.log(`⏭️  SKIP: ${migrationFile} (already applied)\n`);
        skipCount++;
      } else {
        console.error(`❌ ERROR in ${migrationFile}:`, error.message.substring(0, 200));
        errorCount++;
        // Continue with next migration instead of stopping
      }
    }
  }

  console.log('\n========================================');
  console.log('Migration Summary:');
  console.log(`  ✅ Successful: ${successCount}`);
  console.log(`  ⏭️  Skipped: ${skipCount}`);
  console.log(`  ❌ Errors: ${errorCount}`);
  console.log('========================================\n');

  await pool.end();

  if (errorCount > 0) {
    console.log('Some migrations had errors. Check the output above.');
    process.exit(1);
  }

  console.log('All migrations completed!');
  process.exit(0);
}

runMigrations();
