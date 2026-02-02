/**
 * Database migration runner
 *
 * Reads and executes the schema.sql file to create/refresh the database schema.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { query, closePool } from './client';
import { logger } from '../config/logger';

// ============================================================================
// MIGRATION FUNCTIONS
// ============================================================================

/**
 * Run database migrations
 */
export async function runMigrations(): Promise<void> {
  try {
    logger.info('Starting database migrations...');

    // Read schema file - check both dist and src locations
    let schemaPath = join(__dirname, 'schema.sql');
    try {
      readFileSync(schemaPath, 'utf-8');
    } catch {
      // Not in dist, try src (for development)
      schemaPath = join(__dirname, '../../src/db/schema.sql');
    }
    const schema = readFileSync(schemaPath, 'utf-8');

    // Execute schema
    await query(schema);

    logger.info('Database migrations completed successfully');
  } catch (error) {
    logger.error('Database migration failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Drop all tables (use with caution!)
 */
export async function dropAllTables(): Promise<void> {
  try {
    logger.warn('Dropping all database tables...');

    await query(`
      DROP TABLE IF EXISTS
        order_state_changes CASCADE,
        inventory_transactions CASCADE,
        pick_tasks CASCADE,
        order_items CASCADE,
        orders CASCADE,
        inventory_units CASCADE,
        bin_locations CASCADE,
        skus CASCADE,
        users CASCADE;
    `);

    logger.warn('All tables dropped successfully');
  } catch (error) {
    logger.error('Failed to drop tables', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Reset database (drop and recreate)
 */
export async function resetDatabase(): Promise<void> {
  try {
    logger.warn('Resetting database...');

    await dropAllTables();
    await runMigrations();

    logger.warn('Database reset completed');
  } catch (error) {
    logger.error('Database reset failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

// ============================================================================
// CLI ENTRY POINT
// ============================================================================

/**
 * Main function for running migrations from command line
 */
async function main(): Promise<void> {
  const command = process.argv[2] || 'migrate';

  try {
    switch (command) {
      case 'migrate':
        await runMigrations();
        break;
      case 'drop':
        await dropAllTables();
        break;
      case 'reset':
        await resetDatabase();
        break;
      default:
        console.error(`Unknown command: ${command}`);
        console.error('Usage: npm run db:migrate | npm run db:drop | npm run db:reset');
        process.exit(1);
    }

    await closePool();
    process.exit(0);
  } catch (error) {
    logger.error('Migration script failed', {
      error: error instanceof Error ? error.message : String(error),
    });
    await closePool();
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export { main as migrateCli };
