const { Client } = require('pg');

async function checkConstraints() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password'
  });

  try {
    await client.connect();

    // Get unique constraints
    const result = await client.query(`
      SELECT constraint_name, constraint_type
      FROM information_schema.table_constraints
      WHERE table_name = 'user_role_assignments'
      AND constraint_type = 'UNIQUE'
    `);
    console.log('Unique constraints on user_role_assignments:');
    result.rows.forEach(r => console.log(`  - ${r.constraint_name}`));

    // Get indexes
    const indexes = await client.query(`
      SELECT indexname, indexdef
      FROM pg_indexes
      WHERE tablename = 'user_role_assignments'
    `);
    console.log('\nIndexes on user_role_assignments:');
    indexes.rows.forEach(r => console.log(`  - ${r.indexname}`));

    // Get primary key
    const pk = await client.query(`
      SELECT a.attname
      FROM pg_index i
      JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = ANY(i.indkey)
      WHERE i.indrelid = 'user_role_assignments'::regclass AND i.indisprimary
    `);
    console.log('\nPrimary key:', pk.rows.map(r => r.attname).join(', '));

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.end();
  }
}

checkConstraints();
