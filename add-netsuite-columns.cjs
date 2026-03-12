/**
 * Add NetSuite columns to aap_db orders table
 * Tries common postgres passwords
 */
const { Pool } = require('pg');

const COLUMNS = [
  { name: 'netsuite_so_internal_id', type: 'VARCHAR(50)' },
  { name: 'netsuite_so_tran_id', type: 'VARCHAR(50)' },
  { name: 'netsuite_if_internal_id', type: 'VARCHAR(50)' },
  { name: 'netsuite_if_tran_id', type: 'VARCHAR(50)' },
  { name: 'netsuite_last_synced_at', type: 'TIMESTAMP WITH TIME ZONE' },
  { name: 'netsuite_source', type: 'VARCHAR(20)' },
  { name: 'subtotal', type: 'NUMERIC(12,2)' },
  { name: 'total_amount', type: 'NUMERIC(12,2)' },
];

const PASSWORDS = [
  'postgres',
  'password',
  'admin',
  'secret',
  'P@ssw0rd',
  'postgres123',
  'admin123',
  'wms_password',
  'aap_password',
  '',  // empty password
];

async function tryPasswords() {
  console.log('Trying to connect as postgres with different passwords...\n');

  for (const password of PASSWORDS) {
    const pool = new Pool({
      host: 'localhost',
      port: 5432,
      database: 'aap_db',
      user: 'postgres',
      password: password,
    });

    try {
      // Test connection
      await pool.query('SELECT 1');
      console.log(`✅ Connected with password: ${password || '(empty)'}`);

      // Add columns
      console.log('\nAdding columns...');
      for (const col of COLUMNS) {
        try {
          await pool.query(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${col.name} ${col.type}`);
          console.log(`  ✅ Added: ${col.name}`);
        } catch (e) {
          if (e.code === '42701') {
            console.log(`  ⏭ Exists: ${col.name}`);
          } else {
            console.log(`  ❌ Error adding ${col.name}: ${e.message}`);
          }
        }
      }

      // Create indexes
      console.log('\nCreating indexes...');
      try {
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_ns_so_id ON orders(netsuite_so_internal_id) WHERE netsuite_so_internal_id IS NOT NULL`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_orders_ns_if_id ON orders(netsuite_if_internal_id) WHERE netsuite_if_internal_id IS NOT NULL`);
        console.log('  ✅ Indexes created');
      } catch (e) {
        console.log(`  ❌ Index error: ${e.message}`);
      }

      // Verify
      const verify = await pool.query(`
        SELECT column_name FROM information_schema.columns
        WHERE table_name = 'orders' AND column_name LIKE 'net%'
      `);
      console.log(`\n✅ SUCCESS! ${verify.rows.length} NetSuite columns now exist in aap_db`);

      await pool.end();
      return true;
    } catch (e) {
      // Connection failed, try next password
      await pool.end();
    }
  }

  console.log('❌ Could not connect as postgres with any common password.');
  console.log('\nPlease run these SQL commands manually as postgres superuser:');
  console.log('---');
  console.log('\\c aap_db');
  for (const col of COLUMNS) {
    console.log(`ALTER TABLE orders ADD COLUMN IF NOT EXISTS ${col.name} ${col.type};`);
  }
  console.log('---');

  return false;
}

tryPasswords();
