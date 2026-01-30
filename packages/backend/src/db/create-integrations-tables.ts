/**
 * Create integrations tables
 */

import { query } from './client';
import { readFileSync } from 'fs';
import { join } from 'path';

async function createIntegrationsTables() {
  console.log('Creating integrations tables...');

  try {
    const migrationPath = join(__dirname, 'migrations', '013_create_integrations.sql');
    let migrationSQL = readFileSync(migrationPath, 'utf-8');

    // Remove comments and split by semicolon
    const statements = migrationSQL
      .split('\n')
      .filter(line => !line.trim().startsWith('--'))
      .join('\n')
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      await query(statement, []);
    }

    console.log('✓ Created integrations tables');
    console.log('Migration completed successfully!');
  } catch (error: any) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  }
}

createIntegrationsTables()
  .then(() => {
    console.log('Done! Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
