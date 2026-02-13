/**
 * Run order_exceptions table migration
 *
 * Creates the order_exceptions table for tracking exceptions during fulfillment.
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool, closePool } from './client';

async function runOrderExceptionsMigration(): Promise<void> {
  console.log('Running order_exceptions migration...');

  const pool = await getPool();

  try {
    // Read the migration file
    const migrationPath = join(__dirname, 'migrations', '035_fix_order_exceptions_foreign_key.sql');
    const sql = readFileSync(migrationPath, 'utf-8');

    console.log('Executing order_exceptions migration SQL...');
    await pool.query(sql);

    console.log('✓ order_exceptions table created successfully');
  } catch (error) {
    console.error('Error running order_exceptions migration:', error);
    throw error;
  } finally {
    await closePool();
  }
}

// Run if called directly
if (require.main === module) {
  runOrderExceptionsMigration()
    .then(() => {
      console.log('Migration completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Migration failed:', error);
      process.exit(1);
    });
}

export { runOrderExceptionsMigration };
