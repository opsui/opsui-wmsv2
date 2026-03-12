const { Pool } = require('pg');

const aapPool = new Pool({ host: 'localhost', port: 5432, database: 'aap_db', user: 'wms_user', password: 'wms_password' });

async function checkOwner() {
  // Check table owner
  const owner = await aapPool.query(`
    SELECT tableowner, tablename
    FROM pg_tables
    WHERE tablename = 'orders' AND schemaname = 'public'
  `);

  console.log('=== TABLE OWNER INFO ===');
  if (owner.rows.length > 0) {
    console.log(`Orders table owner: ${owner.rows[0].tableowner}`);
  }

  // Check database owner
  const dbOwner = await aapPool.query(`
    SELECT pg_catalog.pg_get_userbyid(d.datdba) as owner, d.datname
    FROM pg_catalog.pg_database d
    WHERE d.datname = 'aap_db'
  `);
  console.log(`Database owner: ${dbOwner.rows[0]?.owner}`);

  // Check current user permissions
  const userPerms = await aapPool.query(`
    SELECT rolname, rolsuper, rolcreaterole, rolcreatedb
    FROM pg_roles
    WHERE rolname = current_user
  `);
  console.log('\nCurrent user:', userPerms.rows[0]?.rolname);
  console.log('Is superuser:', userPerms.rows[0]?.rolsuper);
  console.log('Can create roles:', userPerms.rows[0]?.rolcreaterole);
  console.log('Can create DB:', userPerms.rows[0]?.rolcreatedb);

  // List all roles
  const roles = await aapPool.query(`
    SELECT rolname, rolsuper
    FROM pg_roles
    WHERE rolcanlogin = true
    ORDER BY rolname
  `);
  console.log('\nLogin roles:');
  roles.rows.forEach(r => console.log(`  ${r.rolname}${r.rolsuper ? ' (superuser)' : ''}`));

  await aapPool.end();
}

checkOwner();
