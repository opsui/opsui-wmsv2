/**
 * Run the feature_flags migration (010)
 */

import { readFileSync } from 'fs';
import { join } from 'path';
import { getPool, closePool } from './client';
import type { Pool } from 'pg';

async function runMigration() {
  let pool: Pool;
  try {
    console.log('Running feature_flags migration (010)...');

    // Read migration file
    const migrationPath = join(__dirname, 'migrations/010_feature_flags.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Get pool and execute migration directly
    pool = getPool();
    console.log('Executing migration...');

    await pool.query(migrationSQL);

    console.log('Migration completed successfully!');
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await closePool();
    process.exit(1);
  }
}

runMigration();
