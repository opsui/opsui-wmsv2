/**
 * Add version column to business_rules table
 */

import { query } from './client';

async function addVersionColumn() {
  console.log('Adding version column to business_rules table...');

  try {
    await query(`
      ALTER TABLE business_rules
      ADD COLUMN IF NOT EXISTS version INTEGER DEFAULT 1
    `);
    console.log('✓ Added version column');

    // Update any existing rows to have version = 1
    await query(`
      UPDATE business_rules
      SET version = 1
      WHERE version IS NULL
    `);
    console.log('✓ Updated existing rows');

    console.log('Migration completed successfully!');
  } catch (error: any) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  }
}

addVersionColumn()
  .then(() => {
    console.log('Done! Exiting...');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
