/**
 * Comprehensive Migration Runner - Apply all pending migrations
 *
 * This script applies all database migrations in order.
 * Run this from the packages/backend directory.
 *
 * Usage:
 *   node scripts/run-all-migrations.cjs
 *   node scripts/run-all-migrations.cjs --dry-run  (show what would be applied)
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../src/db/migrations');

// All migrations in order
const ALL_MIGRATIONS = [
  { file: '001_create_custom_roles.sql', name: '001_create_custom_roles' },
  { file: '003_phase3_tables.sql', name: '003_phase3_tables' },
  { file: '004_addon_modules.sql', name: '004_addon_modules' },
  { file: '006_add_sku_barcode.sql', name: '006_add_sku_barcode' },
  { file: '008_create_audit_logs.sql', name: '008_create_audit_logs' },
  { file: '009_create_wave_picking.sql', name: '009_create_wave_picking' },
  { file: '010_feature_flags.sql', name: '010_feature_flags' },
  { file: '011_add_notifications.sql', name: '011_add_notifications' },
  { file: '012_create_business_rules.sql', name: '012_create_business_rules' },
  { file: '013_create_integrations.sql', name: '013_create_integrations' },
  { file: '014_create_reports.sql', name: '014_create_reports' },
  { file: '015_fix_cycle_count_column_length.sql', name: '015_fix_cycle_count_column_length' },
  { file: '016_variance_severity_config.sql', name: '016_variance_severity_config' },
  { file: '017_recurring_count_schedules.sql', name: '017_recurring_count_schedules' },
  { file: '018_root_cause_categories.sql', name: '018_root_cause_categories' },
  { file: '019_variance_root_causes.sql', name: '019_variance_root_causes' },
  { file: '020_add_active_role.sql', name: '020_add_active_role' },
  { file: '021_add_barcode_to_skus.sql', name: '021_add_barcode_to_skus' },
  { file: '022_add_cycle_count_variance_to_exceptions.sql', name: '022_add_cycle_count_variance_to_exceptions' },
  { file: '023_add_inbound_receiving.sql', name: '023_add_inbound_receiving' },
  { file: '024_add_order_exceptions.sql', name: '024_add_order_exceptions' },
  { file: '025_add_phase2_operational_excellence.sql', name: '025_add_phase2_operational_excellence' },
  { file: '026_add_rma_role.sql', name: '026_add_rma_role' },
  { file: '027_add_shipping.sql', name: '027_add_shipping' },
  { file: '028_add_stock_control_tables.sql', name: '028_add_stock_control_tables' },
  { file: '029_add_stock_controller_role.sql', name: '029_add_stock_controller_role' },
  { file: '030_add_user_role_assignments.sql', name: '030_add_user_role_assignments' },
  { file: '031_add_user_soft_delete.sql', name: '031_add_user_soft_delete' },
  { file: '032_add_current_view.sql', name: '032_add_current_view' },
  { file: '033_add_last_viewed_at.sql', name: '033_add_last_viewed_at' },
  { file: '034_add_picker_status.sql', name: '034_add_picker_status' },
  { file: '035_fix_order_exceptions_foreign_key.sql', name: '035_fix_order_exceptions_foreign_key' },
  { file: '036_fix_state_change_id_generation.sql', name: '036_fix_state_change_id_generation' },
  { file: '037_grant_all_roles_to_admin.sql', name: '037_grant_all_roles_to_admin' },
  { file: '038_update_cycle_count_types.sql', name: '038_update_cycle_count_types' },
  { file: '039_add_pricing_fields.sql', name: '039_add_pricing_fields' },
  { file: '040_add_dispatch_and_accounting_roles.sql', name: '040_add_dispatch_and_accounting_roles' },
  { file: '041_add_accounting_tables.sql', name: '041_add_accounting_tables' },
  { file: '042_add_accounting_tables_v2.sql', name: '042_add_accounting_tables_v2' },
  { file: '043_add_accounting_tables_final.sql', name: '043_add_accounting_tables_final' },
  { file: '044_add_full_erp_accounting_phase1.sql', name: '044_add_full_erp_accounting_phase1' },
  { file: '044_add_lot_tracking_to_inventory.sql', name: '044_add_lot_tracking_to_inventory' },
  { file: '045_add_full_erp_accounting_phase2.sql', name: '045_add_full_erp_accounting_phase2' },
  { file: '045_add_inventory_analytics.sql', name: '045_add_inventory_analytics' },
  { file: '046_add_full_erp_accounting_phase3.sql', name: '046_add_full_erp_accounting_phase3' },
  { file: '048_add_hr_payroll_tables.sql', name: '048_add_hr_payroll_tables' },
  { file: '049_seed_nz_tax_tables.sql', name: '049_seed_nz_tax_tables' },
  { file: '050_add_rma_module.sql', name: '050_add_rma_module' },
  { file: '051_multi_entity_foundation.sql', name: '051_multi_entity_foundation' },
  { file: '052_add_order_state_changes_table.sql', name: '052_add_order_state_changes_table' },
  { file: '052_projects_foundation.sql', name: '052_projects_foundation' },
  { file: '053_purchasing_workflow.sql', name: '053_purchasing_workflow' },
  { file: '054_advanced_manufacturing.sql', name: '054_advanced_manufacturing' },
  { file: '055_sales_order_workflow.sql', name: '055_sales_order_workflow' },
  { file: '056_fixed_assets_lifecycle.sql', name: '056_fixed_assets_lifecycle' },
  { file: '057_ecommerce_integration.sql', name: '057_ecommerce_integration' },
  { file: '058_advanced_inventory.sql', name: '058_advanced_inventory' },
  { file: '059_advanced_financials.sql', name: '059_advanced_financials' },
  { file: '061_add_all_missing_roles.sql', name: '061_add_all_missing_roles' },
];

const isDryRun = process.argv.includes('--dry-run');

console.log('\n========================================');
console.log('WMS Comprehensive Database Migration Runner');
console.log('========================================');
if (isDryRun) {
  console.log('🔍 DRY RUN MODE - No changes will be made\n');
}

// Get database connection info from environment
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || '5432',
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
};

console.log(`Database: ${dbConfig.user}@${dbConfig.host}:${dbConfig.port}/${dbConfig.database}\n`);

// Build psql connection string
const psqlBase = `psql -U ${dbConfig.user} -h ${dbConfig.host} -p ${dbConfig.port} -d ${dbConfig.database}`;
const psqlEnv = dbConfig.password ? { ...process.env, PGPASSWORD: dbConfig.password } : process.env;

/**
 * Execute a psql command
 */
function execPsql(command, options = {}) {
  try {
    return execSync(command, {
      encoding: 'utf-8',
      env: psqlEnv,
      stdio: options.stdio || 'pipe',
    });
  } catch (error) {
    if (options.allowFail) {
      return null;
    }
    throw error;
  }
}

/**
 * Check if a table exists
 */
function tableExists(tableName) {
  const result = execPsql(
    `${psqlBase} -t -c "SELECT 1 FROM pg_tables WHERE tablename = '${tableName}'"`,
    { allowFail: true }
  );
  return result && result.trim() === '1';
}

// Check if _migrations table exists and get applied migrations
const applied = new Set();

if (tableExists('_migrations')) {
  console.log('✓ Migrations tracking table exists\n');
  const result = execPsql(`${psqlBase} -t -c "SELECT name FROM _migrations ORDER BY applied_at"`);
  if (result && result.trim()) {
    result.trim().split('\n').forEach(name => {
      if (name.trim()) applied.add(name.trim());
    });
    console.log(`Already applied: ${applied.size} migrations\n`);
  }
} else {
  console.log('Creating migrations tracking table...\n');
  if (!isDryRun) {
    execPsql(`${psqlBase} -c "
      CREATE TABLE IF NOT EXISTS _migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        filename VARCHAR(255) NOT NULL,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    "`);
  }
}

// Apply pending migrations
let appliedCount = 0;
let failedCount = 0;
const pendingMigrations = ALL_MIGRATIONS.filter(m => !applied.has(m.name));

console.log(`Total migrations: ${ALL_MIGRATIONS.length}`);
console.log(`Already applied: ${applied.size}`);
console.log(`Pending: ${pendingMigrations.length}\n`);

if (pendingMigrations.length === 0) {
  console.log('✓ All migrations are already applied!\n');
  process.exit(0);
}

console.log('Pending migrations:');
pendingMigrations.forEach(m => console.log(`  - ${m.name}`));
console.log('');

if (isDryRun) {
  console.log('🔍 DRY RUN COMPLETE - No migrations were applied\n');
  process.exit(0);
}

for (const migration of pendingMigrations) {
  const filepath = path.join(migrationsDir, migration.file);

  if (!fs.existsSync(filepath)) {
    console.log(`  ⚠ ${migration.name} - file not found: ${migration.file}`);
    continue;
  }

  console.log(`  → Applying: ${migration.name}`);

  try {
    // Begin transaction
    execPsql(`${psqlBase} -c "BEGIN"`);

    // Execute migration
    const sql = fs.readFileSync(filepath, 'utf-8');
    execPsql(`${psqlBase} -c "${sql.replace(/"/g, '\\"').replace(/\n/g, ' ')}"`);

    // Record migration
    execPsql(`${psqlBase} -c "INSERT INTO _migrations (name, filename) VALUES ('${migration.name}', '${migration.file}')"`);

    // Commit transaction
    execPsql(`${psqlBase} -c "COMMIT"`);

    console.log(`  ✓ ${migration.name} - applied successfully\n`);
    appliedCount++;
  } catch (error) {
    execPsql(`${psqlBase} -c "ROLLBACK"`, { allowFail: true });
    console.error(`  ✗ ${migration.name} - FAILED`);
    console.error(`    ${error.message}\n`);
    failedCount++;

    // Continue with next migration instead of stopping
    // Some migrations might fail if tables already exist, which is OK
  }
}

console.log('========================================');
console.log(`✓ Applied: ${appliedCount} migration(s)`);
if (failedCount > 0) {
  console.log(`⚠ Failed: ${failedCount} migration(s) - some may have been partially applied or tables already exist`);
}
console.log('========================================\n');

// Verify key tables that were missing
const keyTables = [
  'customers', 'leads', 'opportunities', 'quotes',  // Sales
  'assets', 'maintenance_work_orders',  // Maintenance
];

console.log('Verifying key tables...\n');
const stillMissing = [];
for (const table of keyTables) {
  if (tableExists(table)) {
    console.log(`  ✓ ${table}`);
  } else {
    console.log(`  ✗ ${table} - MISSING`);
    stillMissing.push(table);
  }
}

if (stillMissing.length > 0) {
  console.log(`\n⚠ Some tables are still missing. Check the failed migrations above.\n`);
} else {
  console.log('\n✓ All key tables exist!\n');
}
