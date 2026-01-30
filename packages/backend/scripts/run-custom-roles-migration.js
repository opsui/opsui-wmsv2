const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { Pool } = require('pg');

async function runMigration() {
  const pool = new Pool({
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '5432'),
    database: process.env.DB_NAME || 'wms_db',
    user: process.env.DB_USER || 'wms_user',
    password: process.env.DB_PASSWORD || 'wms_password',
  });

  try {
    const migrationPath = path.join(
      __dirname,
      '../src/db/migrations/005_create_custom_roles.sql'
    );
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('Running migration: 005_create_custom_roles.sql');
    await pool.query(sql);
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runMigration();
