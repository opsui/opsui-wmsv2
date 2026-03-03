const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function main() {
  const pool = new Pool({
    host: 'localhost',
    port: 5433,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password',
  });

  const password = 'test1234';
  const hash = await bcrypt.hash(password, 10);

  try {
    // Update admin password
    await pool.query(
      'UPDATE users SET password_hash = $1, active = true WHERE email = $2',
      [hash, 'admin@wms.local']
    );
    console.log('Updated admin@wms.local password to: test1234');
    
    // Check if test picker exists, if not create
    const existing = await pool.query('SELECT * FROM users WHERE email = $1', ['testpicker@wms.local']);
    
    if (existing.rows.length === 0) {
      await pool.query(
        `INSERT INTO users (user_id, name, email, password_hash, role, active) 
         VALUES ('USR-TEST01', 'Test Picker', 'testpicker@wms.local', $1, 'PICKER', true)`,
        [hash]
      );
      console.log('Created testpicker@wms.local with password: test1234');
    } else {
      await pool.query(
        'UPDATE users SET password_hash = $1, active = true WHERE email = $2',
        [hash, 'testpicker@wms.local']
      );
      console.log('Updated testpicker@wms.local password to: test1234');
    }
    
    console.log('\nTest credentials:');
    console.log('Admin: admin@wms.local / test1234');
    console.log('Picker: testpicker@wms.local / test1234');
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();