/**
 * Migration: Add skip_reason column to order_items table
 *
 * This column stores the reason when an item is skipped during packing
 */

import { query, closePool } from './client';

async function addSkipReasonColumn() {
  console.log('Adding skip_reason column to order_items table...');

  try {
    // Check if column already exists
    const checkResult = await query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'order_items'
      AND column_name = 'skip_reason';
    `);

    if (checkResult.rows.length > 0) {
      console.log('Column skip_reason already exists, skipping migration');
      return;
    }

    // Add the column
    await query(`
      ALTER TABLE order_items
      ADD COLUMN skip_reason TEXT;
    `);

    console.log('Successfully added skip_reason column to order_items table');

    // Verify the column was added
    const verifyResult = await query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'order_items'
      AND column_name = 'skip_reason';
    `);

    console.log('Column details:', verifyResult.rows[0]);
  } catch (error) {
    console.error('Error adding skip_reason column:', error);
    throw error;
  }
}

// Run the migration
addSkipReasonColumn()
  .then(() => {
    console.log('Migration completed successfully');
    closePool();
  })
  .catch(error => {
    console.error('Migration failed:', error);
    closePool();
    process.exit(1);
  });
