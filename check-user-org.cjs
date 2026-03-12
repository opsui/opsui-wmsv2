const { Pool } = require('pg');
const wmsPool = new Pool({ host: 'localhost', port: 5432, database: 'wms_db', user: 'wms_user', password: 'wms_password' });

async function check() {
  // Check user -> organization mapping
  console.log('=== USER -> ORGANIZATION MAPPING ===');
  const userOrgs = await wmsPool.query(`
    SELECT u.user_id, u.email, ou.organization_id, o.slug, o.database_name, ou.is_primary
    FROM users u
    LEFT JOIN organization_users ou ON ou.user_id = u.user_id
    LEFT JOIN organizations o ON o.organization_id = ou.organization_id
    ORDER BY u.email
  `);

  userOrgs.rows.forEach(r => {
    console.log(`${r.email} -> org: ${r.slug || 'NONE'} (db: ${r.database_name || 'shared'}) | primary: ${r.is_primary || false}`);
  });

  // Check orders in wms_db that might be in picking queue
  console.log('\n=== ORDERS IN PICKING QUEUE (wms_db) ===');
  const wmsOrders = await wmsPool.query(`
    SELECT order_id, status, customer_email, created_at, organization_id
    FROM orders
    WHERE status IN ('PENDING', 'PICKING')
    ORDER BY status, created_at DESC
    LIMIT 20
  `);
  console.log('Total PENDING/PICKING orders in wms_db:', wmsOrders.rows.length);

  const pending = wmsOrders.rows.filter(o => o.status === 'PENDING');
  const picking = wmsOrders.rows.filter(o => o.status === 'PICKING');

  console.log('PENDING:', pending.length);
  pending.slice(0, 10).forEach(o => {
    console.log(`  ${o.order_id} | org: ${o.organization_id || 'none'} | ${o.customer_email || 'no email'}`);
  });

  console.log('PICKING:', picking.length);
  picking.forEach(o => {
    console.log(`  ${o.order_id} | org: ${o.organization_id || 'none'} | ${o.customer_email || 'no email'}`);
  });

  await wmsPool.end();
}
check();
