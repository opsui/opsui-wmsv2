const { Pool } = require('pg');
const wmsPool = new Pool({ host: 'localhost', port: 5432, database: 'wms_db', user: 'wms_user', password: 'wms_password' });
const aapPool = new Pool({ host: 'localhost', port: 5432, database: 'aap_db', user: 'wms_user', password: 'wms_password' });

async function check() {
  console.log('=== CHECKING wms_db ===');
  try {
    // Check orders table structure
    const wmsColumns = await wmsPool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position
    `);
    console.log('Orders columns:', wmsColumns.rows.map(r => r.column_name).join(', '));

    // Get all NetSuite-sourced orders
    const wmsNsOrders = await wmsPool.query(`
      SELECT order_id, status, netsuite_so_tran_id, netsuite_source, created_at, netsuite_last_synced_at
      FROM orders
      WHERE netsuite_source = 'NETSUITE'
         OR netsuite_so_tran_id IS NOT NULL
      ORDER BY created_at DESC
      LIMIT 20
    `);
    console.log('\nNetSuite-sourced orders (wms_db):', wmsNsOrders.rows.length);
    wmsNsOrders.rows.forEach(o => {
      const created = o.created_at.toISOString().slice(0, 16).replace('T', ' ');
      const synced = o.netsuite_last_synced_at ? o.netsuite_last_synced_at.toISOString().slice(0, 16).replace('T', ' ') : 'never';
      console.log(`  ${o.netsuite_so_tran_id || o.order_id} | status: ${o.status} | created: ${created} | synced: ${synced}`);
    });

    // Count by status
    const statusCounts = await wmsPool.query(`
      SELECT status, COUNT(*) as count
      FROM orders
      WHERE netsuite_source = 'NETSUITE' OR netsuite_so_tran_id IS NOT NULL
      GROUP BY status
      ORDER BY status
    `);
    console.log('\nStatus counts (NetSuite orders):');
    statusCounts.rows.forEach(r => console.log(`  ${r.status}: ${r.count}`));

  } catch (e) {
    console.log('Error:', e.message);
  }

  console.log('\n=== CHECKING aap_db ===');
  try {
    // Check orders table structure
    const aapColumns = await aapPool.query(`
      SELECT column_name FROM information_schema.columns WHERE table_name = 'orders' ORDER BY ordinal_position
    `);
    console.log('Orders columns:', aapColumns.rows.map(r => r.column_name).join(', '));

    // Check for NetSuite columns
    const hasNsColumns = aapColumns.rows.some(r => r.column_name.startsWith('netsuite'));
    console.log('Has NetSuite columns:', hasNsColumns);

    if (hasNsColumns) {
      const aapNsOrders = await aapPool.query(`
        SELECT order_id, status, netsuite_so_tran_id, netsuite_source, created_at, netsuite_last_synced_at
        FROM orders
        WHERE netsuite_source = 'NETSUITE'
           OR netsuite_so_tran_id IS NOT NULL
        ORDER BY created_at DESC
        LIMIT 20
      `);
      console.log('\nNetSuite-sourced orders (aap_db):', aapNsOrders.rows.length);
      aapNsOrders.rows.forEach(o => {
        const created = o.created_at.toISOString().slice(0, 16).replace('T', ' ');
        const synced = o.netsuite_last_synced_at ? o.netsuite_last_synced_at.toISOString().slice(0, 16).replace('T', ' ') : 'never';
        console.log(`  ${o.netsuite_so_tran_id || o.order_id} | status: ${o.status} | created: ${created} | synced: ${synced}`);
      });
    }
  } catch (e) {
    console.log('Error:', e.message);
  }

  await wmsPool.end();
  await aapPool.end();
}
check();
