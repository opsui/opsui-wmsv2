/**
 * Update NULL verified_quantity values to 0
 *
 * This ensures all existing order_items have verified_quantity set to 0
 * instead of NULL, which can cause issues in the verifyPackingItem function.
 */

import { query, closePool } from './client';

async function updateDefaults() {
  console.log('Updating NULL verified_quantity values to 0...');

  try {
    const result = await query(`
      UPDATE order_items
      SET verified_quantity = 0
      WHERE verified_quantity IS NULL
    `);
    console.log(`Updated ${result.rowCount} rows`);

    // Verify the update
    const checkResult = await query(`
      SELECT COUNT(*) as count,
             COUNT(CASE WHEN verified_quantity IS NULL THEN 1 END) as null_count
      FROM order_items
    `);
    console.log('Total rows:', checkResult.rows[0].count);
    console.log('NULL rows remaining:', checkResult.rows[0].null_count);

    if (checkResult.rows[0].null_count > 0) {
      console.warn('Warning: Some rows still have NULL values');
    } else {
      console.log('Success: All rows now have verified_quantity set to 0');
    }
  } catch (error) {
    console.error('Error updating defaults:', error);
    throw error;
  }
}

// Run the update
updateDefaults()
  .then(() => {
    console.log('Update completed successfully');
    closePool();
  })
  .catch(error => {
    console.error('Update failed:', error);
    closePool();
    process.exit(1);
  });
