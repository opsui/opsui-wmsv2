const { Client } = require('pg');

async function addAccountingRole() {
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

    // Check if role already exists
    const existing = await client.query(`
      SELECT * FROM user_role_assignments
      WHERE user_id = 'USR-ADMIN' AND role = 'ACCOUNTING'
    `);

    if (existing.rows.length > 0) {
      // Update existing role to active
      await client.query(`
        UPDATE user_role_assignments
        SET active = true
        WHERE user_id = 'USR-ADMIN' AND role = 'ACCOUNTING'
      `);
      console.log('✓ ACCOUNTING role already exists, activated it');
    } else {
      // Generate a short ID using timestamp
      const shortId = 'URA-' + Date.now().toString(36).toUpperCase();

      // Insert new role
      await client.query(`
        INSERT INTO user_role_assignments (assignment_id, user_id, role, granted_by, granted_at, active)
        VALUES ($1, 'USR-ADMIN', 'ACCOUNTING', 'USR-ADMIN', NOW(), true)
      `, [shortId]);
      console.log('✓ Successfully added ACCOUNTING role to USR-ADMIN (ID:', shortId + ')');
    }

    // Show all roles for this user
    const allRoles = await client.query(`
      SELECT role, active FROM user_role_assignments
      WHERE user_id = 'USR-ADMIN' ORDER BY role
    `);
    console.log('\nAll roles for USR-ADMIN:');
    allRoles.rows.forEach(r => console.log(`  - ${r.role} (active: ${r.active})`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

addAccountingRole();
