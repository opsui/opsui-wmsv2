const { Pool } = require('pg');

async function main() {
  var aapPool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'aap_db',
    user: 'wms_user',
    password: 'wms_password'
  });

  console.log('Adding NetSuite columns to aap_db.orders...');

  var columns = [
    ['netsuite_so_internal_id', 'VARCHAR(50)'],
    ['netsuite_so_tran_id', 'VARCHAR(50)'],
    ['netsuite_if_internal_id', 'VARCHAR(50)'],
    ['netsuite_if_tran_id', 'VARCHAR(50)'],
    ['netsuite_last_synced_at', 'TIMESTAMP WITH TIME ZONE'],
    ['netsuite_source', 'VARCHAR(20)'],
    ['subtotal', 'NUMERIC(12,2)'],
    ['total_amount', 'NUMERIC(12, 2)']
  ];

  for (var i = 0; i < columns.length; i++) {
    var name = columns[i][0];
    var type = columns[i][1];
    var sql = 'ALTER TABLE orders ADD COLUMN IF NOT EXISTS ' + name + ' ' + type;
    try {
      await aapPool.query(sql);
      console.log('Added: ' + name);
    } catch (e) {
      if (e.code === '42701') {
        console.log('Exists: ' + name);
      } else {
        console.log('Failed ' + name + ': ' + e.message);
      }
    }
  }

  try {
    await aapPool.query('CREATE INDEX IF NOT EXISTS idx_orders_ns_so ON orders(netsuite_so_internal_id)');
    await aapPool.query('CREATE INDEX IF NOT EXISTS idx_orders_ns_if ON orders(netsuite_if_internal_id)');
    console.log('Created indexes');
  } catch (e) {
    console.log('Index error: ' + e.message);
  }

  var result = await aapPool.query(
    "SELECT column_name FROM information_schema.columns " +
    "WHERE table_name = 'orders' AND column_name LIKE 'net%' " +
    "ORDER BY column_name"
  );

  console.log('NetSuite columns in aap_db.orders:');
  for (var i = 0; i < result.rows.length; i++) {
    console.log('  - ' + result.rows[i].column_name);
  }

  await aapPool.end();
}

 main().catch(function(e) {
  console.error('Error:', e);
});
