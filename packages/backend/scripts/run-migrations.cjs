/**
 * Simple Migration Runner - Apply all pending migrations
 *
 * This script applies database migrations that are required for the
 * crawler to work properly. Run this from the packages/backend directory.
 *
 * Usage:
 *   node scripts/run-migrations.cjs
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const migrationsDir = path.join(__dirname, '../src/db/migrations');

console.log('\n========================================');
console.log('WMS Database Migration Runner');
console.log('========================================\n');

const MIGRATIONS = [
  {
    name: '008_create_audit_logs',
    file: '008_create_audit_logs.sql',
    description: 'Audit logs for tracking system events',
  },
  {
    name: '009_create_wave_picking',
    file: '009_create_wave_picking.sql',
    description: 'Wave picking and zone assignments',
  },
  {
    name: '010_feature_flags',
    file: '010_feature_flags.sql',
    description: 'Feature flag system',
  },
  {
    name: 'add_phase2_operational_excellence',
    file: 'add_phase2_operational_excellence.sql',
    description: 'Quality control, cycle counting, location capacity',
  },
];

// Check if psql is available
let psqlCommand = 'psql';
try {
  execSync('which psql || where psql', { stdio: 'ignore' });
} catch {
  // On Windows, psql might be in different locations
  try {
    execSync('psql --version', { stdio: 'ignore' });
  } catch {
    console.error('⚠ psql command not found. Please install PostgreSQL client tools.');
    console.log('  Or run the migrations manually using your database tool.');
    process.exit(1);
  }
}

// Get database connection info from environment
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = process.env.DB_PORT || '5432';
const dbName = process.env.DB_NAME || 'wms_db';
const dbUser = process.env.DB_USER || 'postgres';

console.log(`Database: ${dbUser}@${dbHost}:${dbPort}/${dbName}\n`);

// Track applied migrations
const applied = new Set();

// Check if _migrations table exists
try {
  const result = execSync(
    `psql -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -c "SELECT tablename FROM pg_tables WHERE tablename = '_migrations'"`,
    { encoding: 'utf-8', stdio: 'ignore' }
  );

  if (result.trim().includes('_migrations')) {
    console.log('✓ Migrations tracking table exists\n');

    // Get applied migrations
    const appliedResult = execSync(
      `psql -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -t -c "SELECT name FROM _migrations ORDER BY applied_at"`,
      { encoding: 'utf-8', stdio: 'ignore' }
    );

    if (appliedResult.trim()) {
      appliedResult.trim().split('\n').forEach(name => applied.add(name.trim()));
      console.log(`Already applied: ${Array.from(applied).join(', ')}\n`);
    }
  }
} catch (error) {
  console.log('Creating migrations tracking table...\n');
}

// Apply pending migrations
let appliedCount = 0;
for (const migration of MIGRATIONS) {
  if (applied.has(migration.name)) {
    console.log(`  ✓ ${migration.name} - already applied`);
    continue;
  }

  const filepath = path.join(migrationsDir, migration.file);
  if (!fs.existsSync(filepath)) {
    console.log(`  ⚠ ${migration.name} - file not found: ${filepath}`);
    continue;
  }

  console.log(`  → Applying: ${migration.name} - ${migration.description}`);

  try {
    // Create migrations table if not exists
    execSync(
      `psql -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -c "
        CREATE TABLE IF NOT EXISTS _migrations (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL UNIQUE,
          filename VARCHAR(255) NOT NULL,
          applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
      "`,
      { stdio: 'ignore' }
    );

    // Begin transaction
    execSync(`psql -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -c "BEGIN"`, { stdio: 'ignore' });

    // Execute migration
    execSync(`psql -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -f "${filepath}"`, { stdio: 'ignore' });

    // Record migration
    execSync(
      `psql -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -c "INSERT INTO _migrations (name, filename) VALUES ('${migration.name}', '${migration.file}')"`,
      { stdio: 'ignore' }
    );

    // Commit transaction
    execSync(`psql -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -c "COMMIT"`, { stdio: 'ignore' });

    console.log(`  ✓ ${migration.name} - applied successfully\n`);
    appliedCount++;
  } catch (error) {
    execSync(`psql -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -c "ROLLBACK"`, { stdio: 'ignore' });
    console.error(`  ✗ ${migration.name} - FAILED`);
    console.error(`    ${error.message}`);
    process.exit(1);
  }
}

console.log(`\n✓ Applied ${appliedCount} migration(s)\n`);

// Verify required tables exist
const requiredTables = [
  'quality_inspections',
  'inspection_checklists',
  'inspection_checklist_items',
  'inspection_results',
  'return_authorizations',
  'return_items',
  'zone_assignments',
  'wave_plans',
  'wave_tasks',
  'feature_flags',
  'cycle_count_plans',
  'cycle_count_entries',
  'cycle_count_tolerances',
  'location_capacities',
  'capacity_rules',
  'capacity_alerts',
];

console.log('Verifying required tables...\n');
const missing = [];
for (const table of requiredTables) {
  try {
    execSync(
      `psql -U ${dbUser} -h ${dbHost} -p ${dbPort} -d ${dbName} -c "SELECT 1 FROM ${table} LIMIT 1"`,
      { stdio: 'ignore' }
    );
  } catch {
    missing.push(table);
  }
}

if (missing.length === 0) {
  console.log('✓ All required tables exist!\n');
} else {
  console.log('⚠ Missing tables:');
  missing.forEach(t => console.log(`  - ${t}`));
  console.log('\nSome migrations may have failed. Please check the output above.\n');
  process.exit(1);
}
