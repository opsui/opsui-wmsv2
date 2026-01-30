/**
 * Create reports tables
 */

import { getPool } from './client';
import { readFileSync } from 'fs';
import { join } from 'path';

async function createReportsTables() {
  console.log('Creating reports tables...');

  try {
    const migrationPath = join(__dirname, 'migrations', '014_create_reports.sql');
    const migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Remove comment lines
    const cleanedSQL = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n');

    // Use pool directly for DDL statements (avoids row mapping issues)
    const pool = getPool();
    await pool.query(cleanedSQL);

    console.log('✓ Created reports tables');
    console.log('Migration completed successfully!');
  } catch (error: any) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  }
}

createReportsTables()
  .then(() => {
    console.log('Done! Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
