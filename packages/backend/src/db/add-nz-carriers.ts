/**
 * Migration: Add New Zealand carriers
 *
 * Replaces generic carriers with NZ-specific shipping companies
 */

import { query, closePool } from './client';

async function addNZCarriers() {
  console.log('Adding New Zealand carriers...');

  try {
    // First, deactivate or remove generic carriers
    await query(`DELETE FROM carriers WHERE carrier_id IN ('FEDex', 'UPS', 'USPS');`);
    console.log('Removed generic carriers');

    // Insert NZ Courier
    await query(`
      INSERT INTO carriers (carrier_id, name, carrier_code, service_types, contact_email, contact_phone, api_endpoint, is_active, requires_account_number, requires_package_dimensions, requires_weight)
      VALUES (
        'CARR-NZC',
        'NZ Courier',
        'NZCOURIER',
        '["STANDARD", "EXPRESS", "OVERNIGHT", "SAME_DAY"]'::jsonb,
        'support@nzcourier.co.nz',
        '0800-800-800',
        'https://customer-integration.ep-sandbox.freightways.co.nz',
        true,
        true,
        true,
        true
      )
      ON CONFLICT (carrier_id) DO UPDATE SET
        name = EXCLUDED.name,
        carrier_code = EXCLUDED.carrier_code,
        service_types = EXCLUDED.service_types,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
        api_endpoint = EXCLUDED.api_endpoint,
        is_active = EXCLUDED.is_active;
    `);
    console.log('Added NZ Courier');

    // Insert Mainfreight
    await query(`
      INSERT INTO carriers (carrier_id, name, carrier_code, service_types, contact_email, contact_phone, api_endpoint, is_active, requires_account_number, requires_package_dimensions, requires_weight)
      VALUES (
        'CARR-MF',
        'Mainfreight',
        'MAINFREIGHT',
        '["STANDARD", "EXPRESS", "OVERNIGHT", "INTERNATIONAL"]'::jsonb,
        'support@mainfreight.co.nz',
        '0800-800-111',
        'https://api.mainfreight.com',
        true,
        true,
        true,
        true
      )
      ON CONFLICT (carrier_id) DO UPDATE SET
        name = EXCLUDED.name,
        carrier_code = EXCLUDED.carrier_code,
        service_types = EXCLUDED.service_types,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
        api_endpoint = EXCLUDED.api_endpoint,
        is_active = EXCLUDED.is_active;
    `);
    console.log('Added Mainfreight');

    // Insert NZ Post
    await query(`
      INSERT INTO carriers (carrier_id, name, carrier_code, service_types, contact_email, contact_phone, api_endpoint, is_active, requires_account_number, requires_package_dimensions, requires_weight)
      VALUES (
        'CARR-NZPOST',
        'NZ Post',
        'NZPOST',
        '["STANDARD", "EXPRESS", "OVERNIGHT", "INTERNATIONAL"]'::jsonb,
        'support@nzpost.co.nz',
        '0800-501-501',
        'https://api.nzpost.co.nz',
        true,
        true,
        true,
        true
      )
      ON CONFLICT (carrier_id) DO UPDATE SET
        name = EXCLUDED.name,
        carrier_code = EXCLUDED.carrier_code,
        service_types = EXCLUDED.service_types,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
        api_endpoint = EXCLUDED.api_endpoint,
        is_active = EXCLUDED.is_active;
    `);
    console.log('Added NZ Post');

    // Insert Castle Parcel
    await query(`
      INSERT INTO carriers (carrier_id, name, carrier_code, service_types, contact_email, contact_phone, api_endpoint, is_active, requires_account_number, requires_package_dimensions, requires_weight)
      VALUES (
        'CARR-CP',
        'Castle Parcel',
        'CASTLE',
        '["STANDARD", "EXPRESS"]'::jsonb,
        'support@castleparcel.co.nz',
        '0800-462-785',
        'https://api.castleparcel.co.nz',
        true,
        true,
        true,
        true
      )
      ON CONFLICT (carrier_id) DO UPDATE SET
        name = EXCLUDED.name,
        carrier_code = EXCLUDED.carrier_code,
        service_types = EXCLUDED.service_types,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
        api_endpoint = EXCLUDED.api_endpoint,
        is_active = EXCLUDED.is_active;
    `);
    console.log('Added Castle Parcel');

    // Insert Pace Courier
    await query(`
      INSERT INTO carriers (carrier_id, name, carrier_code, service_types, contact_email, contact_phone, api_endpoint, is_active, requires_account_number, requires_package_dimensions, requires_weight)
      VALUES (
        'CARR-PACE',
        'Pace Courier',
        'PACE',
        '["STANDARD", "EXPRESS", "OVERNIGHT"]'::jsonb,
        'support@pacecourier.co.nz',
        '0800-722-322',
        'https://api.pacecourier.co.nz',
        true,
        true,
        true,
        true
      )
      ON CONFLICT (carrier_id) DO UPDATE SET
        name = EXCLUDED.name,
        carrier_code = EXCLUDED.carrier_code,
        service_types = EXCLUDED.service_types,
        contact_email = EXCLUDED.contact_email,
        contact_phone = EXCLUDED.contact_phone,
        api_endpoint = EXCLUDED.api_endpoint,
        is_active = EXCLUDED.is_active;
    `);
    console.log('Added Pace Courier');

    // Verify the carriers were added
    const result = await query(`
      SELECT carrier_id, name, carrier_code, contact_phone, is_active
      FROM carriers
      ORDER BY name;
    `);

    console.log('\nCarriers in database:');
    console.table(result.rows);

    console.log('\nSuccessfully added New Zealand carriers!');
  } catch (error) {
    console.error('Error adding NZ carriers:', error);
    throw error;
  }
}

// Run the migration
addNZCarriers()
  .then(async () => {
    console.log('Migration completed successfully');
    await closePool();
  })
  .catch(async error => {
    console.error('Migration failed:', error);
    await closePool();
    process.exit(1);
  });
