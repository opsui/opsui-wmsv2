const { Client } = require('pg');

async function checkSchema() {
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

    // Get table schema
    const result = await client.query(`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'user_role_assignments'
      ORDER BY ordinal_position
    `);
    console.log('\nuser_role_assignments table schema:');
    result.rows.forEach(r => console.log(`  - ${r.column_name}: ${r.data_type} (nullable: ${r.is_nullable})`));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkSchema();
