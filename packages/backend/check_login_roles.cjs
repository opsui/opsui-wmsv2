const { Client } = require('pg');

async function checkUserRoles() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password'
  });

  try {
    await client.connect();
    console.log('Connected to database');

    // Get user info
    const user = await client.query(`
      SELECT * FROM users WHERE user_id = 'USR-ADMIN'
    `);
    console.log('\nUser info:', user.rows[0]);

    // Get all role assignments
    const roles = await client.query(`
      SELECT role, active, granted_at
      FROM user_role_assignments
      WHERE user_id = 'USR-ADMIN'
      ORDER BY role
    `);
    console.log('\nRole assignments for USR-ADMIN:');
    console.log('Total count:', roles.rows.length);
    roles.rows.forEach(r => {
      console.log(`  - ${r.role} (active: ${r.active})`);
    });

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkUserRoles();
