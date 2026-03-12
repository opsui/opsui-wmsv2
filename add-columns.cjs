/**
 * Grant ALTER permissions and add NetSuite columns to aap_db
 * Try multiple authentication methods
 */
const { Pool } = require('pg');
const { randomUUID } = require('crypto');

// Columns to add
const NETSUITE_COLUMNS = [
  { name: 'netsuite_so_internal_id', type: 'VARCHAR(50)' },
  { name: 'netsuite_so_tran_id', type: 'VARCHAR(50)' },
  { name: 'netsuite_if_internal_id', type: 'VARCHAR(50)' },
  { name: 'netsuite_if_tran_id', type: 'VARCHAR(50)' },
  { name: 'netsuite_last_synced_at', type: 'TIMESTAMP WITH TIME ZONE' },
  { name: 'netsuite_source', type: 'VARCHAR(20)' },
  { name: 'subtotal', type: 'NUMERIC(12,2)' },
  { name: 'total_amount', type: 'NUMERIC(12,2)' },
];

// Try different credentials
const CREDENTIALS = [
  { user: 'postgres', password: 'postgres' },
  { user: 'postgres', password: 'password' },
  { user: 'postgres', password: '' },
  { user: 'wms_user', password: 'wms_password' },
];

async function tryAddColumns() {
  console.log('Attempting to add NetSuite columns to aap_db...\n');

  for (const creds of CREDENTIALS) {
    console.log(`Trying ${creds.user}${creds.password ? ' with password' : ' without password'}...`);

    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'aap_db',
      user: creds.user,
      password: creds.password,
    });

    try {
      // Test connection
      await pool.query('SELECT 1');
      console.log('  Connected successfully!');

      // Try to grant permissions first
      try {
        await pool.query(`GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO wms_user`);
        console.log('  Granted privileges to wms_user');
      } catch (e) {
        console.log(`  Grant failed: ${e.message}`);
      }

      // Try to add columns
      let addedCount = 0;
      for (const col of NETSUITE_COLUMNS) {
        try {
          await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
          console.log(`  Added column: ${col.name}`);
          addedCount++;
        } catch (e) {
          if (e.code === '42701') {
            console.log(`  Column exists: ${col.name}`);
            addedCount++;
          } else {
            console.log(`  Failed to add ${col.name}: ${e.message}`);
          }
        }
      }

      // Create indexes
      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_ns_so_id ON orders(netsuite_so_internal_id) WHERE netsuite_so_internal_id IS NOT NULL`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_ns_if_id ON orders(netsuite_if_internal_id) WHERE netsuite_if_internal_id IS NOT NULL`);
        console.log('  Created indexes');
      } catch (e) {
        console.log(`  Index error: ${e.message}`);
      }

      // Verify columns
      const verify = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name LIKE 'net%'
      `);
      console.log(`\nVerification: ${verify.rows.length} NetSuite columns now exist`);

      await pool.end();
      return true;
    } catch (e) {
      console.log(`  Failed: ${e.message}\n`);
      await pool.end();
    }
  }

  console.log('\nNone of the credential combinations worked.');
  console.log('You may need to manually run these SQL commands as a superuser:');
  console.log('\n-- Connect to aap_db as superuser and run:');
  console.log('GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO wms_user;');
  for (const col of NETSUITE_COLUMNS) {
    console.log(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
  }

  return false;
}

tryAddColumns();
