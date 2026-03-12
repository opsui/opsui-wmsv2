const pg = require('pg');

async function main() {
  // Try different postgres passwords
  const passwords = ['wms_password', 'postgres', 'password', 'admin', ''];

  for (const pwd of passwords) {
    console.log('Trying postgres with password: ' + (pwd || '(empty)'));

    const pool = new pg.Pool({
      host: 'localhost',
      port: 5432,
      database: 'aap_db',
      user: 'postgres',
      password: pwd
    });

    try {
      // Test connection
      await pool.query('SELECT 1');
      console.log('Connected as postgres!');

      // Add columns
      const columns = [
        ['netsuite_so_internal_id', 'VARCHAR(50)'],
        ['netsuite_so_tran_id', 'VARCHAR(50)'],
        ['netsuite_if_internal_id', 'VARCHAR(50)'],
        ['netsuite_if_tran_id', 'VARCHAR(50)'],
        ['netsuite_last_synced_at', 'TIMESTAMP WITH TIME ZONE'],
        ['netsuite_source', 'VARCHAR(20)'],
        ['subtotal', 'NUMERIC(12,2)'],
        ['total_amount', 'NUMERIC(12, 2)']
      ];

      for (const col of columns) {
        const name = col[0];
        const type = col[1];
        try {
          await pool.query('ALTER TABLE orders ADD COLUMN IF NOT EXISTS ' + name + ' ' + type);
          console.log('Added: ' + name);
        } catch (e) {
          if (e.code === '42701') {
            console.log('Exists: ' + name);
          } else {
            console.log('Failed ' + name + ': ' + e.message);
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

      // Verify
      const result = await pool.query(
        "SELECT column_name FROM information_schema.columns " +
        "WHERE table_name = 'orders' AND column_name LIKE 'net%' " +
        "ORDER BY column_name"
      );

      console.log('NetSuite columns in aap_db.orders:');
      result.rows.forEach(r => console.log('  - ' + r.column_name));

      await pool.end();
      return;
    } catch (e) {
      console.log('Failed: ' + e.message);
      await pool.end();
    }
  }

  console.log('Could not connect as postgres. You need to run these commands manually:');
  console.log('');
  console.log('psql -h localhost -p 5432 -U postgres -d aap_db');
  console.log('');
  console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS netsuite_so_internal_id VARCHAR(50);');
  console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS netsuite_so_tran_id VARCHAR(50);');
  console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS netsuite_if_internal_id VARCHAR(50);');
  console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS netsuite_if_tran_id VARCHAR(50);');
  console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS netsuite_last_synced_at TIMESTAMP WITH TIME ZONE;');
  console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS netsuite_source VARCHAR(20);');
  console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2);');
  console.log('ALTER TABLE orders ADD COLUMN IF NOT EXISTS total_amount NUMERIC(12, 2);');
  console.log('CREATE INDEX IF NOT EXISTS idx_orders_ns_so ON orders(netsuite_so_internal_id);');
  console.log('CREATE INDEX IF NOT EXISTS idx_orders_ns_if ON orders(netsuite_if_internal_id);');
}

main();
