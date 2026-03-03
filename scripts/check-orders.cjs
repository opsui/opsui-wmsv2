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
    const result = await pool.query('SELECT * FROM orders LIMIT 5');
    console.log('Existing orders:');
    console.log(JSON.stringify(result.rows, null, 2));
    
    // Check table structure
    const columns = await pool.query(`
      SELECT column_name, data_type, udt_name 
      FROM information_schema.columns 
      WHERE table_name = 'orders'
    `);
    console.log('\nTable columns:');
    console.log(JSON.stringify(columns.rows, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await pool.end();
  }
}

main();