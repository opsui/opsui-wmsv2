const { Pool } = require('pg');

async function main() {
  const pool = new Pool({
    host: 'localhost',
    port: 5433,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password',
  });

  try {
    const result = await pool.query('SELECT * FROM users LIMIT 20');
    console.log('Users in database:');
    console.log(JSON.stringify(result.rows, null, 2));
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();