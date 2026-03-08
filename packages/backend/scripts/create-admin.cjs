/**
 * Create admin@wms.local user
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'wms_password',
});

async function createAdmin() {
  const client = await pool.connect();
  
  try {
    const hash = await bcrypt.hash('Admin123!', 10);
    
    const result = await client.query(
      `INSERT INTO users (user_id, name, email, password_hash, role, active)
       VALUES ('USR-ADMIN01', 'System Admin', 'admin@wms.local', $1, 'ADMIN', true)
       ON CONFLICT (email) DO UPDATE SET password_hash = $1
       RETURNING user_id, email, role`,
      [hash]
    );
    
    console.log('✅ Created/updated admin user:');
    console.log('   Email: admin@wms.local');
    console.log('   Password: Admin123!');
    console.log('   Role:', result.rows[0].role);
    
  } catch (error) {
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

createAdmin();