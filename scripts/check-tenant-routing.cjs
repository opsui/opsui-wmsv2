const { Pool } = require('pg');

async function check() {
  const wms = new Pool({ host: 'localhost', port: 5432, database: 'wms_db', user: 'wms_user', password: 'wms_password' });
  const aap = new Pool({ host: 'localhost', port: 5432, database: 'aap_db', user: 'wms_user', password: 'wms_password' });

  console.log('=== wms_db ===');
  const wmsUser = await wms.query("SELECT user_id, email, default_organization_id FROM users WHERE email = 'stores@aap.co.nz'");
  console.log('User:', wmsUser.rows[0] || 'NOT FOUND');

  const wmsOrg = await wms.query("SELECT organization_id, slug, database_name FROM organizations WHERE slug = 'aap'");
  console.log('Org:', wmsOrg.rows[0] || 'NOT FOUND');

  if (wmsUser.rows[0] && wmsOrg.rows[0]) {
    const link = await wms.query(
      'SELECT organization_user_id, role FROM organization_users WHERE user_id = $1 AND organization_id = $2',
      [wmsUser.rows[0].user_id, wmsOrg.rows[0].organization_id]
    );
    console.log('Org-User link:', link.rows[0] || 'MISSING');
  }

  const wmsOrders = await wms.query('SELECT count(*) as count FROM orders');
  console.log('Orders:', wmsOrders.rows[0].count);

  console.log('\n=== aap_db ===');
  const aapUser = await aap.query("SELECT user_id, email, default_organization_id FROM users WHERE email = 'stores@aap.co.nz'");
  console.log('User:', aapUser.rows[0] || 'NOT FOUND');

  const aapOrg = await aap.query("SELECT organization_id, slug, database_name FROM organizations WHERE slug = 'aap'");
  console.log('Org:', aapOrg.rows[0] || 'NOT FOUND');

  const aapOrders = await aap.query('SELECT count(*) as count FROM orders');
  console.log('Orders:', aapOrders.rows[0].count);

  await wms.end();
  await aap.end();
}

check().catch(e => console.error(e));
