/**
 * Diagnostic script to check packing queue discrepancy
 *
 * Compares:
 * - AAP packing queue (orders with status PICKED)
 * - NetSuite Item Fulfillments (orders with fulfillments not shipped)
 */

const { Pool } = require('pg');

async function main() {
  // Connect to the shared database first to find tenant info
  const sharedPool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'opsui_dev',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
  });

  console.log('=== PACKING QUEUE DIAGNOSTIC ===\n');

  try {
    // 1. Get status breakdown of all orders
    const statusBreakdown = await sharedPool.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      GROUP BY status
      ORDER BY count DESC
    `);
    console.log('1. Order Status Breakdown:');
    console.table(statusBreakdown.rows);

    // 2. Get PICKED orders details
    const pickedOrders = await sharedPool.query(`
      SELECT
        order_id,
        customer_name,
        status,
        netsuite_so_internal_id,
        netsuite_so_tran_id,
        netsuite_if_internal_id,
        netsuite_if_tran_id,
        netsuite_source,
        netsuite_last_synced_at,
        created_at,
        updated_at
      FROM orders
      WHERE status = 'PICKED'
      ORDER BY updated_at DESC
      LIMIT 20
    `);
    console.log('\n2. Sample PICKED Orders (latest 20):');
    console.table(pickedOrders.rows);

    // 3. Count PICKED orders by NetSuite sync status
    const syncStatus = await sharedPool.query(`
      SELECT
        CASE
          WHEN netsuite_source IS NULL THEN 'Non-NetSuite'
          WHEN netsuite_if_internal_id IS NOT NULL THEN 'Has Fulfillment ID'
          ELSE 'No Fulfillment ID'
        END as category,
        COUNT(*) as count
      FROM orders
      WHERE status = 'PICKED'
      GROUP BY category
    `);
    console.log('\n3. PICKED Orders by NetSuite Sync Status:');
    console.table(syncStatus.rows);

    // 4. Count PICKED orders by age
    const ageBreakdown = await sharedPool.query(`
      SELECT
        CASE
          WHEN updated_at > NOW() - INTERVAL '1 day' THEN '< 1 day old'
          WHEN updated_at > NOW() - INTERVAL '7 days' THEN '1-7 days old'
          WHEN updated_at > NOW() - INTERVAL '30 days' THEN '7-30 days old'
          ELSE '> 30 days old'
        END as age_category,
        COUNT(*) as count
      FROM orders
      WHERE status = 'PICKED'
      GROUP BY age_category
      ORDER BY age_category
    `);
    console.log('\n4. PICKED Orders by Age (based on updated_at):');
    console.table(ageBreakdown.rows);

    // 5. Check for old orders that might be stale
    const staleOrders = await sharedPool.query(`
      SELECT
        order_id,
        netsuite_so_tran_id,
        netsuite_last_synced_at,
        updated_at,
        EXTRACT(EPOCH FROM (NOW() - updated_at)) / 3600 as hours_since_update
      FROM orders
      WHERE status = 'PICKED'
        AND (netsuite_last_synced_at IS NULL OR netsuite_last_synced_at < NOW() - INTERVAL '1 hour')
      ORDER BY updated_at ASC
      LIMIT 20
    `);
    console.log('\n5. Potentially Stale PICKED Orders (not synced in 1+ hour):');
    console.table(staleOrders.rows);

    // 6. Summary
    const totalPicked = await sharedPool.query(`
      SELECT COUNT(*) as total FROM orders WHERE status = 'PICKED'
    `);
    console.log('\n=== SUMMARY ===');
    console.log(`Total PICKED orders in AAP: ${totalPicked.rows[0].total}`);
    console.log(`NetSuite shows 2 orders to pack`);
    console.log(`Discrepancy: ${totalPicked.rows[0].total - 2} orders`);

  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sharedPool.end();
  }
}

main();
