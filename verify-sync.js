const { Pool } = require('pg');
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function verify() {
  console.log('=== NetSuite Order Sync Verification ===\n');

  // Get all orders from aap_db
  const aapOrders = await pool.query(`
    SELECT order_id, customer_reference, status, created_at, updated_at
    FROM orders 
    WHERE source = 'netsuite' OR customer_reference LIKE 'SO-%'
    ORDER BY created_at DESC
    LIMIT 20
  `);

  console.log('Recent NetSuite-sourced orders in aap_db:');
  console.log(JSON.stringify(aapOrders.rows, null, 2));

  // Get sync status counts
  const syncStatus = await pool.query(`
    SELECT 
      COUNT(*) FILTER (WHERE source = 'netsuite') as netsuite_orders,
      COUNT(*) FILTER (WHERE source = 'netsuite' AND netsuite_last_synced_at < NOW() - INTERVAL '5 minutes') as stale_sync,
      COUNT(*) FILTER (WHERE source = 'netsuite' AND netsuite_last_synced_at IS NULL) as never_synced,
      COUNT(*) FILTER (WHERE status = 'PENDING') as pending_orders
    FROM orders
  `);

  console.log('\nSync Status Summary:');
  console.log(JSON.stringify(syncStatus.rows[0], null, 2));

  await pool.end();
}

verify().catch(e => {
  console.error(e);
  process.exit(1);
});
