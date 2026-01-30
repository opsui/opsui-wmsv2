/**
 * Migration Runner Script
 *
 * Runs database migrations and tracks which ones have been applied.
 * This solves the issue of migrations not being applied, which causes
 * 500 errors when services query tables that don't exist.
 *
 * Usage:
 *   npx tsx packages/backend/src/db/run-migrations.ts
 */

import { getPool } from './client';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================================================
// MIGRATIONS TABLE
// ============================================================================

const MIGRATIONS_TABLE = `
CREATE TABLE IF NOT EXISTS _migrations (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  filename VARCHAR(255) NOT NULL,
  applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checksum VARCHAR(64)
);

CREATE INDEX IF NOT EXISTS idx_migrations_name ON _migrations(name);
CREATE INDEX IF NOT EXISTS idx_migrations_applied_at ON _migrations(applied_at);
`;

// ============================================================================
// REQUIRED MIGRATIONS (in order)
// ============================================================================

const REQUIRED_MIGRATIONS = [
  {
    name: '008_create_audit_logs',
    filename: '008_create_audit_logs.sql',
    description: 'Audit logs for tracking system events',
  },
  {
    name: '009_create_wave_picking',
    filename: '009_create_wave_picking.sql',
    description: 'Wave picking and zone assignments',
  },
  {
    name: '010_feature_flags',
    filename: '010_feature_flags.sql',
    description: 'Feature flag system',
  },
  {
    name: '011_add_notifications',
    filename: '011_add_notifications.sql',
    description: 'Multi-channel notification system',
  },
  {
    name: 'add_phase2_operational_excellence',
    filename: 'add_phase2_operational_excellence.sql',
    description: 'Quality control, cycle counting, location capacity',
  },
  {
    name: '015_fix_cycle_count_column_length',
    filename: '015_fix_cycle_count_column_length.sql',
    description: 'Fix cycle_count_plans.count_type VARCHAR(20) to VARCHAR(50)',
  },
];

// ============================================================================
// MIGRATION RUNNER
// ============================================================================

export class MigrationRunner {
  private pool = getPool();
  private migrationsDir = path.join(__dirname, 'migrations');

  /**
   * Initialize the migrations tracking table
   */
  async initialize(): Promise<void> {
    await this.pool.query(MIGRATIONS_TABLE);
  }

  /**
   * Get list of applied migrations
   */
  async getAppliedMigrations(): Promise<string[]> {
    const result = await this.pool.query(
      'SELECT name FROM _migrations ORDER BY applied_at ASC'
    );
    return result.rows.map((row: any) => row.name);
  }

  /**
   * Get migration file content
   */
  private getMigrationFile(filename: string): string {
    const filepath = path.join(this.migrationsDir, filename);
    if (!fs.existsSync(filepath)) {
      throw new Error(`Migration file not found: ${filename}`);
    }
    return fs.readFileSync(filepath, 'utf-8');
  }

  /**
   * Apply a single migration
   */
  async applyMigration(migration: {
    name: string;
    filename: string;
    description: string;
  }): Promise<boolean> {
    const applied = await this.pool.query(
      'SELECT * FROM _migrations WHERE name = $1',
      [migration.name]
    );

    if (applied.rows.length > 0) {
      console.log(`  ✓ ${migration.name} - already applied`);
      return false;
    }

    console.log(`  → Applying: ${migration.name} - ${migration.description}`);

    try {
      const sql = this.getMigrationFile(migration.filename);

      // Begin transaction
      await this.pool.query('BEGIN');

      // Execute migration
      await this.pool.query(sql);

      // Record migration
      await this.pool.query(
        'INSERT INTO _migrations (name, filename) VALUES ($1, $2)',
        [migration.name, migration.filename]
      );

      // Commit transaction
      await this.pool.query('COMMIT');

      console.log(`  ✓ ${migration.name} - applied successfully`);
      return true;
    } catch (error: any) {
      await this.pool.query('ROLLBACK');
      console.error(`  ✗ ${migration.name} - FAILED: ${error.message}`);
      throw error;
    }
  }

  /**
   * Get status of all migrations
   */
  async getStatus(): Promise<{
    applied: string[];
    pending: string[];
    all: typeof REQUIRED_MIGRATIONS;
  }> {
    const applied = await this.getAppliedMigrations();
    const pending = REQUIRED_MIGRATIONS
      .filter((m) => !applied.includes(m.name))
      .map((m) => m.name);

    return {
      applied,
      pending,
      all: REQUIRED_MIGRATIONS,
    };
  }

  /**
   * Run all pending migrations
   */
  async run(): Promise<void> {
    console.log('\n========================================');
    console.log('WMS Migration Runner');
    console.log('========================================\n');

    await this.initialize();

    const status = await this.getStatus();

    console.log('Migration Status:');
    console.log(`  Applied: ${status.applied.length}`);
    console.log(`  Pending: ${status.pending.length}`);
    console.log(`  Total:   ${status.all.length}\n`);

    if (status.pending.length === 0) {
      console.log('✓ All migrations are up to date!\n');
      return;
    }

    console.log('Applying pending migrations:\n');

    let appliedCount = 0;
    for (const migration of REQUIRED_MIGRATIONS) {
      const applied = await this.applyMigration(migration);
      if (applied) appliedCount++;
    }

    console.log(`\n✓ Applied ${appliedCount} migration(s)\n`);
  }

  /**
   * Verify all required tables exist
   */
  async verifyTables(): Promise<{
    exists: string[];
    missing: string[];
  }> {
    const requiredTables = [
      // Core tables
      'users',
      'orders',
      'order_items',
      'skus',
      'pick_tasks',
      'bin_locations',
      // Audit logs
      'audit_logs',
      // Wave picking
      'zone_assignments',
      'wave_plans',
      'wave_tasks',
      // Feature flags
      'feature_flags',
      // Notifications
      'notifications',
      'notification_preferences',
      'notification_templates',
      'notification_queue',
      // Quality control
      'quality_inspections',
      'inspection_checklists',
      'inspection_checklist_items',
      'inspection_results',
      'return_authorizations',
      'return_items',
      // Cycle counting
      'cycle_count_plans',
      'cycle_count_entries',
      'cycle_count_tolerances',
      // Location capacity
      'location_capacities',
      'capacity_rules',
      'capacity_alerts',
    ];

    const exists: string[] = [];
    const missing: string[] = [];

    for (const table of requiredTables) {
      const result = await this.pool.query(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_schema = 'public'
          AND table_name = $1
        )`,
        [table]
      );

      if (result.rows[0].exists) {
        exists.push(table);
      } else {
        missing.push(table);
      }
    }

    return { exists, missing };
  }
}

// ============================================================================
// CLI INTERFACE
// ============================================================================

async function main() {
  const runner = new MigrationRunner();

  const args = process.argv.slice(2);
  const command = args[0] || 'run';

  try {
    switch (command) {
      case 'run':
        await runner.run();
        break;

      case 'status':
        await runner.initialize();
        const status = await runner.getStatus();
        console.log('\nMigration Status:\n');
        console.log(`Applied (${status.applied.length}):`);
        status.applied.forEach((name) => console.log(`  ✓ ${name}`));
        console.log(`\nPending (${status.pending.length}):`);
        status.pending.forEach((name) => console.log(`  ○ ${name}`));
        console.log('');
        break;

      case 'verify':
        await runner.initialize();
        const tables = await runner.verifyTables();
        console.log('\nTable Verification:\n');
        console.log(`Existing (${tables.exists.length}):`);
        tables.exists.forEach((t) => console.log(`  ✓ ${t}`));
        if (tables.missing.length > 0) {
          console.log(`\nMissing (${tables.missing.length}):`);
          tables.missing.forEach((t) => console.log(`  ✗ ${t}`));
          console.log('\n⚠ Run "npm run db:migrate" to apply missing migrations');
          process.exit(1);
        } else {
          console.log('\n✓ All required tables exist!\n');
        }
        break;

      default:
        console.log(`
Usage: npx tsx packages/backend/src/db/run-migrations.ts [command]

Commands:
  run     Apply all pending migrations (default)
  status  Show migration status
  verify  Verify all required tables exist
        `);
        break;
    }
  } catch (error: any) {
    console.error(`\n✗ Error: ${error.message}\n`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
