/**
 * Run the accounting tables migration v2
 * This version uses non-conflicting table names
 */

import { query, closePool } from './client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('Running accounting tables migration v2...');

    // Read and execute the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '042_add_accounting_tables_v2.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await query(migrationSQL);

    console.log('✅ Accounting tables migration v2 completed successfully!');
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await closePool();
    process.exit(1);
  }
}

runMigration();
