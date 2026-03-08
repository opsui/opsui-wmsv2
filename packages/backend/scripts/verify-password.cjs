/**
 * Verify Admin Password Script
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

async function verifyPassword() {
  const client = await pool.connect();
  
  try {
    const result = await client.query(
      "SELECT email, password_hash FROM users WHERE email = 'admin@wms.local'"
    );
    
    if (result.rows.length === 0) {
      console.log('Admin user not found!');
      return;
    }
    
    const user = result.rows[0];
    console.log('Email:', user.email);
    console.log('Hash length:', user.password_hash.length);
    console.log('Hash prefix:', user.password_hash.substring(0, 20) + '...');
    
    // Test password comparison
    const testPasswords = ['Admin123!', 'admin123', 'password123', 'Admin@123'];
    
    for (const pwd of testPasswords) {
      const match = await bcrypt.compare(pwd, user.password_hash);
      console.log(`Password "${pwd}" matches: ${match}`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    client.release();
    await pool.end();
  }
}

verifyPassword();