const { Pool } = require('pg');

// Connect to aap_db directly
const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'aap_db',
  user: 'postgres',
  password: 'postgres'
});

async function check() {
  try {
    // Check orders by status
    const statusCounts = await pool.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      WHERE deleted_at IS NULL
      GROUP BY status
      ORDER BY count DESC
    `);
    console.log('Orders by status:');
    console.table(statusCounts.rows);

    // Check orders with netsuite sync info
    const nsSync = await pool.query(`
      SELECT COUNT(*) as total,
             COUNT(netsuite_internal_id) as with_ns_id,
             COUNT(*) FILTER (WHERE netsuite_synced_at IS NOT NULL) as synced,
             COUNT(*) FILTER (WHERE netsuite_synced_at IS NULL) as never_synced,
             COUNT(*) FILTER (WHERE netsuite_synced_at < NOW() - INTERVAL '1 hour') as stale_sync
      FROM orders
      WHERE deleted_at IS NULL
    `);
    console.log('\nNetSuite sync status:');
    console.table(nsSync.rows);

    // Check integrations
    const integrations = await pool.query(`
      SELECT id, name, type, status, last_sync_at, sync_error, created_at
      FROM integrations
      ORDER BY created_at DESC
    `);
    console.log('\nIntegrations:');
    console.table(integrations.rows);

    // Check sync history
    const syncHistory = await pool.query(`
      SELECT id, integration_id, status, records_processed, records_failed, error_message, created_at
      FROM sync_history
      ORDER BY created_at DESC
      LIMIT 10
    `);
    console.log('\nRecent sync history:');
    console.table(syncHistory.rows);

    // Check PENDING orders that should be in picking queue
    const pendingOrders = await pool.query(`
      SELECT order_id, order_number, status, netsuite_internal_id, netsuite_synced_at, created_at
      FROM orders
      WHERE status = 'PENDING' AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 20
    `);
    console.log('\nPENDING orders (picking queue):');
    console.table(pendingOrders.rows);

    // Check PICKED/PACKING orders (packing queue)
    const packingOrders = await pool.query(`
      SELECT order_id, order_number, status, netsuite_internal_id, netsuite_synced_at, created_at
      FROM orders
      WHERE status IN ('PICKED', 'PACKING') AND deleted_at IS NULL
      ORDER BY created_at DESC
      LIMIT 20
    `);
    console.log('\nPICKED/PACKING orders (packing queue):');
    console.table(packingOrders.rows);

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    console.error(err.stack);
    process.exit(1);
  }
}
check();
