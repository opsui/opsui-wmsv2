/**
 * Add shipping_carrier and shipping_method to orders table
 * This is needed for wave picking functionality
 */

import { query } from './client';

async function addShippingColumnsToOrders() {
  console.log('Adding shipping columns to orders table...');

  try {
    // Add shipping_carrier column
    await query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS shipping_carrier VARCHAR(50)
    `);
    console.log('✓ Added shipping_carrier column');

    // Add shipping_method column
    await query(`
      ALTER TABLE orders
      ADD COLUMN IF NOT EXISTS shipping_method VARCHAR(50) DEFAULT 'STANDARD'
    `);
    console.log('✓ Added shipping_method column');

    console.log('Migration completed successfully!');
  } catch (error: any) {
    console.error('✗ Migration failed:', error.message);
    throw error;
  }
}

addShippingColumnsToOrders()
  .then(() => {
    console.log('Done! Exiting...');
    process.exit(0);
  })
  .catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
