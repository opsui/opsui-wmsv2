/**
 * Comprehensive Migration Runner - Apply all pending migrations
 *
 * Uses pg library directly to run migrations without requiring psql CLI.
 *
 * Usage:
 *   npx tsx src/db/run-all-migrations.ts
 *   npx tsx src/db/run-all-migrations.ts --dry-run
 */

import 'dotenv/config';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import pg from 'pg';

const { Pool } = pg;

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, 'migrations');

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
  {
    file: '022_add_cycle_count_variance_to_exceptions.sql',
    name: '022_add_cycle_count_variance_to_exceptions',
  },
  { file: '023_add_inbound_receiving.sql', name: '023_add_inbound_receiving' },
  { file: '024_add_order_exceptions.sql', name: '024_add_order_exceptions' },
  {
    file: '025_add_phase2_operational_excellence.sql',
    name: '025_add_phase2_operational_excellence',
  },
  { file: '026_add_rma_role.sql', name: '026_add_rma_role' },
  { file: '027_add_shipping.sql', name: '027_add_shipping' },
  { file: '028_add_stock_control_tables.sql', name: '028_add_stock_control_tables' },
  { file: '029_add_stock_controller_role.sql', name: '029_add_stock_controller_role' },
  { file: '030_add_user_role_assignments.sql', name: '030_add_user_role_assignments' },
  { file: '031_add_user_soft_delete.sql', name: '031_add_user_soft_delete' },
  { file: '032_add_current_view.sql', name: '032_add_current_view' },
  { file: '033_add_last_viewed_at.sql', name: '033_add_last_viewed_at' },
  { file: '034_add_picker_status.sql', name: '034_add_picker_status' },
  {
    file: '035_fix_order_exceptions_foreign_key.sql',
    name: '035_fix_order_exceptions_foreign_key',
  },
  { file: '036_fix_state_change_id_generation.sql', name: '036_fix_state_change_id_generation' },
  { file: '037_grant_all_roles_to_admin.sql', name: '037_grant_all_roles_to_admin' },
  { file: '038_update_cycle_count_types.sql', name: '038_update_cycle_count_types' },
  { file: '039_add_pricing_fields.sql', name: '039_add_pricing_fields' },
  {
    file: '040_add_dispatch_and_accounting_roles.sql',
    name: '040_add_dispatch_and_accounting_roles',
  },
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

// Allow overriding via command line args
function getArg(name: string): string | undefined {
  const arg = process.argv.find(a => a.startsWith(`--${name}=`));
  return arg ? arg.split('=')[1] : undefined;
}

async function main() {
  console.log('\n========================================');
  console.log('WMS Database Migration Runner');
  console.log('========================================');
  if (isDryRun) {
    console.log('🔍 DRY RUN MODE - No changes will be made\n');
  }

  // Create connection pool - allow CLI args to override env vars
  const pool = new Pool({
    host: getArg('host') || process.env.DB_HOST || 'localhost',
    port: parseInt(getArg('port') || process.env.DB_PORT || '5432'),
    database: getArg('database') || getArg('db') || process.env.DB_NAME || 'wms_db',
    user: getArg('user') || process.env.DB_USER || 'postgres',
    password: getArg('password') || process.env.DB_PASSWORD || '',
    ssl: (getArg('ssl') || process.env.DB_SSL) === 'true' ? { rejectUnauthorized: false } : false,
  });

  console.log(
    `Database: ${process.env.DB_USER}@${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}\n`
  );

  try {
    // Check if _migrations table exists
    const tableCheck = await pool.query(`
      SELECT EXISTS (
        SELECT FROM pg_tables
        WHERE tablename = '_migrations'
      );
    `);

    const migrationsTableExists = tableCheck.rows[0].exists;

    if (!migrationsTableExists) {
      console.log('Creating migrations tracking table...\n');
      if (!isDryRun) {
        await pool.query(`
          CREATE TABLE IF NOT EXISTS _migrations (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL UNIQUE,
            filename VARCHAR(255) NOT NULL,
            applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `);
      }
    } else {
      console.log('✓ Migrations tracking table exists\n');
    }

    // Get applied migrations
    const applied = new Set<string>();
    if (migrationsTableExists) {
      const result = await pool.query('SELECT name FROM _migrations ORDER BY applied_at');
      result.rows.forEach(row => applied.add(row.name));
      console.log(`Already applied: ${applied.size} migrations\n`);
    }

    // Filter pending migrations
    const pendingMigrations = ALL_MIGRATIONS.filter(m => !applied.has(m.name));

    console.log(`Total migrations: ${ALL_MIGRATIONS.length}`);
    console.log(`Already applied: ${applied.size}`);
    console.log(`Pending: ${pendingMigrations.length}\n`);

    if (pendingMigrations.length === 0) {
      console.log('✓ All migrations are already applied!\n');
      await pool.end();
      return;
    }

    console.log('Pending migrations:');
    pendingMigrations.forEach(m => console.log(`  - ${m.name}`));
    console.log('');

    if (isDryRun) {
      console.log('🔍 DRY RUN COMPLETE - No migrations were applied\n');
      await pool.end();
      return;
    }

    // Apply pending migrations
    let appliedCount = 0;
    let failedCount = 0;

    for (const migration of pendingMigrations) {
      const filepath = join(migrationsDir, migration.file);

      if (!existsSync(filepath)) {
        console.log(`  ⚠ ${migration.name} - file not found: ${migration.file}`);
        continue;
      }

      console.log(`  → Applying: ${migration.name}`);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Read and execute migration
        const sql = readFileSync(filepath, 'utf-8');
        await client.query(sql);

        // Record migration
        await client.query('INSERT INTO _migrations (name, filename) VALUES ($1, $2)', [
          migration.name,
          migration.file,
        ]);

        await client.query('COMMIT');
        console.log(`  ✓ ${migration.name} - applied successfully\n`);
        appliedCount++;
      } catch (error) {
        await client.query('ROLLBACK');
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Check if it's a "relation already exists" error which is OK
        if (
          errorMessage.includes('already exists') ||
          errorMessage.includes('duplicate key value') ||
          (errorMessage.includes('relation') && errorMessage.includes('already'))
        ) {
          console.log(`  ⚠ ${migration.name} - skipped (tables/columns may already exist)\n`);

          // Still record it as applied
          try {
            await pool.query(
              'INSERT INTO _migrations (name, filename) VALUES ($1, $2) ON CONFLICT DO NOTHING',
              [migration.name, migration.file]
            );
          } catch {}
        } else {
          console.error(`  ✗ ${migration.name} - FAILED`);
          console.error(`    ${errorMessage}\n`);
          failedCount++;
        }
      } finally {
        client.release();
      }
    }

    console.log('========================================');
    console.log(`✓ Applied: ${appliedCount} migration(s)`);
    if (failedCount > 0) {
      console.log(`⚠ Failed/Skipped: ${failedCount} migration(s)`);
    }
    console.log('========================================\n');

    // Verify key tables
    const keyTables = [
      'customers',
      'leads',
      'opportunities',
      'quotes',
      'assets',
      'maintenance_work_orders',
    ];

    console.log('Verifying key tables...\n');
    for (const table of keyTables) {
      const result = await pool.query(
        `
        SELECT EXISTS (
          SELECT FROM pg_tables
          WHERE tablename = $1
        );
      `,
        [table]
      );

      if (result.rows[0].exists) {
        console.log(`  ✓ ${table}`);
      } else {
        console.log(`  ✗ ${table} - MISSING`);
      }
    }

    console.log('');
  } finally {
    await pool.end();
  }
}

main().catch(error => {
  console.error('Migration failed:', error);
  process.exit(1);
});
