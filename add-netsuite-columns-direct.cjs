const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'aap_db',
  user: 'wms_user',
  password: 'wms_password'
});

async function main() {
  const columns = [
    { name: 'netsuite_so_internal_id', type: 'VARCHAR(50)' },
    { name: 'netsuite_so_tran_id', type: 'VARCHAR(50)' },
    { name: 'netsuite_if_internal_id', type: 'VARCHAR(50)' },
    { name: 'netsuite_if_tran_id', type: 'VARCHAR(50)' },
    { name: 'netsuite_last_synced_at', type: 'TIMESTAMP WITH TIME ZONE' },
    { name: 'netsuite_source', type: 'VARCHAR(20)' },
    { name: 'subtotal', type: 'NUMERIC(12,2)' },
    { name: 'total_amount', type: 'NUMERIC(12,2)' },
  ];

  console.log('Adding NetSuite columns to aap_db.orders...\n');

  for (const col of columns) {
    try {
      await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS ' + col.name + ' ' + col.type);
      console.log('Added: ' + col.name);
    } catch (e) {
      if (e.code === '42701') {
        console.log('Exists: ' + col.name);
      } else {
        console.log('Failed: ' + col.name + ' - ' + e.message);
      }
    }
  }

  // Create indexes
  try {
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_ns_so ON orders(netsuite_so_internal_id)');
    await pool.query('CREATE INDEX IF NOT EXISTS idx_orders_ns_if ON orders(netsuite_if_internal_id)');
    console.log('Created indexes');
  } catch (e) {
    console.log('Index error: ' + e.message);
  }

  // Verify columns
  const result = await pool.query(
    "SELECT column_name FROM information_schema.columns " +
    "WHERE table_name = 'orders' AND column_name LIKE 'net%' " +
    "ORDER BY column_name"
  );

  console.log('\nNetSuite columns in aap_db.orders:');
);
  result.rows.forEach(r => console.log('  - ' + r.column_name));

  await pool.end();
}

main().catch(e => {
  console.error('Error:', e);
  process.exit(1);
});
