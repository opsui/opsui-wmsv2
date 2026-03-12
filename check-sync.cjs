const { Pool } = require('pg');

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  database: 'wms_db',
  user: 'wms_user',
  password: 'wms_password'
});

async function check() {
  try {
    // List all databases
    const dbs = await pool.query(`
      SELECT datname FROM pg_database WHERE datistemplate = false
    `);
    console.log('Databases:');
    console.table(dbs.rows);

    // Check organizations/tenants
    const orgs = await pool.query(`
      SELECT id, name, slug FROM organizations ORDER BY created_at
    `);
    console.log('\nOrganizations:');
    console.table(orgs.rows);

    // Check integrations
    const integrations = await pool.query(`
      SELECT id, org_id, name, type, status, last_sync_at, sync_error
      FROM integrations
      ORDER BY created_at DESC
    `);
    console.log('\nIntegrations:');
    console.table(integrations.rows);

    // Check orders by status (all orgs)
    const statusCounts = await pool.query(`
      SELECT org_id, status, COUNT(*) as count
      FROM orders
      WHERE deleted_at IS NULL
      GROUP BY org_id, status
      ORDER BY org_id, count DESC
    `);
    console.log('\nOrders by status:');
    console.table(statusCounts.rows);

    // Check orders with netsuite sync info
    const nsSync = await pool.query(`
      SELECT org_id,
             COUNT(*) as total,
             COUNT(netsuite_internal_id) as with_ns_id,
             COUNT(*) FILTER (WHERE netsuite_synced_at IS NOT NULL) as synced,
             COUNT(*) FILTER (WHERE netsuite_synced_at IS NULL OR netsuite_synced_at < NOW() - INTERVAL '1 hour') as stale
      FROM orders
      WHERE deleted_at IS NULL
      GROUP BY org_id
    `);
    console.log('\nNetSuite sync status:');
    console.table(nsSync.rows);

    // Check sync history
    const syncHistory = await pool.query(`
      SELECT sh.id, sh.integration_id, sh.status, sh.error_message, sh.created_at, i.name as integration_name
      FROM sync_history sh
      JOIN integrations i ON i.id = sh.integration_id
      ORDER BY sh.created_at DESC
      LIMIT 10
    `);
    console.log('\nRecent sync history:');
    console.table(syncHistory.rows);

    // Check PENDING and PICKED orders for AAP
    const aapOrders = await pool.query(`
      SELECT status, COUNT(*) as count,
             COUNT(*) FILTER (WHERE netsuite_internal_id IS NOT NULL) as has_ns_id
      FROM orders
      WHERE org_id = 'aap' AND deleted_at IS NULL
      GROUP BY status
    `);
    console.log('\nAAP orders by status:');
    console.table(aapOrders.rows);

    await pool.end();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}
check();
