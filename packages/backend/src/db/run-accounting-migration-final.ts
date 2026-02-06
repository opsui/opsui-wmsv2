/**
 * Run the accounting tables migration (final)
 */

import { query, closePool } from './client';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  try {
    console.log('Running accounting tables migration (final)...');

    // Read and execute the migration SQL file
    const migrationPath = path.join(__dirname, 'migrations', '043_add_accounting_tables_final.sql');
    const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

    // Execute the migration
    await query(migrationSQL);

    console.log('✅ Accounting tables migration completed successfully!');
    await closePool();
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    await closePool();
    process.exit(1);
  }
}

runMigration();
