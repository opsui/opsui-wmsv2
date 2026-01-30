/**
 * Add NZC Carrier
 *
 * This script adds the NZC (NZ Couriers) carrier to the carriers table
 */

import { getPool } from './client';

export async function addNZCCarrier() {
  const client = await getPool();

  try {
    // Check if NZC carrier already exists
    const existing = await client.query(
      `SELECT carrier_id FROM carriers WHERE carrier_code = 'NZC'`
    );

    if (existing.rows.length > 0) {
      console.log('NZC carrier already exists with ID:', existing.rows[0].carrier_id);
      return existing.rows[0];
    }

    // Insert NZC carrier
    const result = await client.query(
      `INSERT INTO carriers
        (carrier_id, name, carrier_code, service_types, contact_email, contact_phone,
         api_endpoint, is_active, requires_account_number, requires_package_dimensions,
         requires_weight)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       ON CONFLICT (carrier_code) DO UPDATE SET
         name = EXCLUDED.name,
         service_types = EXCLUDED.service_types,
         is_active = EXCLUDED.is_active
       RETURNING *`,
      [
        'CARR-NZC', // carrier_id
        'NZ Couriers', // name
        'NZC', // carrier_code
        JSON.stringify(['Standard', 'Express', 'Same Day', 'Overnight']), // service_types
        'support@gosweetspot.com', // contact_email
        '', // contact_phone
        'https://api.gosweetspot.com', // api_endpoint
        true, // is_active
        true, // requires_account_number
        true, // requires_package_dimensions
        true, // requires_weight
      ]
    );

    console.log('NZC carrier added successfully:', result.rows[0]);
    return result.rows[0];
  } catch (error) {
    console.error('Error adding NZC carrier:', error);
    throw error;
  }
}

// Run if called directly
if (require.main === module) {
  addNZCCarrier()
    .then(() => {
      console.log('NZC carrier added successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('Failed to add NZC carrier:', error);
      process.exit(1);
    });
}

export default addNZCCarrier;
