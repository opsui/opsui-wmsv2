/**
 * Migration: Remove US-specific carriers
 *
 * Removes FedEx, UPS, and USPS as they don't operate in New Zealand
 */

import { query, closePool } from './client';

async function removeUSCarriers() {
  console.log('Removing US-specific carriers...');

  try {
    const result = await query(`
      DELETE FROM carriers
      WHERE carrier_id IN ('CARRIER-FEDEX', 'CARRIER-UPS', 'CARRIER-USPS')
      RETURNING carrier_id, name;
    `);

    console.log(`Removed ${result.rowCount} carriers:`);
    result.rows.forEach(row => {
      console.log(`  - ${row.name} (${row.carrier_id})`);
    });

    // Verify remaining carriers
    const remaining = await query(`
      SELECT carrier_id, name, carrier_code FROM carriers WHERE is_active = true ORDER BY
        CASE
          WHEN carrier_id LIKE 'CARR-%' THEN 0
          ELSE 1
        END,
        name;
    `);

    console.log('\nRemaining active carriers:');
    console.table(remaining.rows);

    console.log('\nSuccessfully removed US carriers!');
  } catch (error) {
    console.error('Error removing US carriers:', error);
    throw error;
  }
}

// Run the migration
removeUSCarriers()
  .then(() => {
    console.log('Migration completed successfully');
    closePool();
  })
  .catch(error => {
    console.error('Migration failed:', error);
    closePool();
    process.exit(1);
  });
