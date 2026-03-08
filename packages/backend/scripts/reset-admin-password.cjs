/**
 * Reset Admin Password Script
 * 
 * Usage: node packages/backend/scripts/reset-admin-password.cjs <new_password>
 * 
 * This script will:
 * 1. Find the admin user in the database
 * 2. Generate a bcrypt hash of the new password
 * 3. Update the admin user's password_hash
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

// Database configuration - adjust if needed
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: process.env.DB_PORT || 5432,
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'wms_password',
});

async function resetAdminPassword(newPassword) {
  const client = await pool.connect();
  
  try {
    console.log('Looking for admin users...');
    
    // First check the actual column name
    const columnCheck = await client.query(`
      SELECT column_name FROM information_schema.columns 
      WHERE table_name = 'users' AND column_name IN ('base_role', 'role')
    `);
    const columns = columnCheck.rows.map(r => r.column_name);
    console.log('Found columns:', columns);
    
    // Find admin users - try both column names
    let adminResult;
    if (columns.includes('base_role')) {
      adminResult = await client.query(
        "SELECT user_id, email, name FROM users WHERE base_role = 'ADMIN' OR role = 'ADMIN'"
      );
    } else {
      adminResult = await client.query(
        "SELECT user_id, email, name FROM users WHERE role = 'ADMIN'"
      );
    }
    
    if (adminResult.rows.length === 0) {
      console.log('No admin users found. Creating one...');
      
      // Create admin user
      const hash = await bcrypt.hash(newPassword, 10);
      const userId = 'USR-ADMIN-' + Date.now();
      
      if (columns.includes('base_role')) {
        await client.query(
          `INSERT INTO users (user_id, email, name, password_hash, base_role, role, active, created_at)
           VALUES ($1, 'admin@wms.local', 'System Admin', $2, 'ADMIN', 'ADMIN', true, NOW())
           RETURNING user_id, email`,
          [userId, hash]
        );
      } else {
        await client.query(
          `INSERT INTO users (user_id, email, name, password_hash, role, active, created_at)
           VALUES ($1, 'admin@wms.local', 'System Admin', $2, 'ADMIN', true, NOW())
           RETURNING user_id, email`,
          [userId, hash]
        );
      }
      
      console.log('✅ Admin user created!');
      console.log('   Email: admin@wms.local');
      console.log('   Password: ' + newPassword);
      return;
    }
    
    console.log(`Found ${adminResult.rows.length} admin user(s):`);
    adminResult.rows.forEach(user => {
      console.log(`   - ${user.email} (${user.user_id})`);
    });
    
    // Generate bcrypt hash
    console.log('\nGenerating password hash...');
    const hash = await bcrypt.hash(newPassword, 10);
    
    // Update all admin users
    for (const user of adminResult.rows) {
      await client.query(
        'UPDATE users SET password_hash = $1 WHERE user_id = $2',
        [hash, user.user_id]
      );
      console.log(`✅ Updated password for: ${user.email}`);
    }
    
    console.log('\n✅ Admin password reset complete!');
    console.log('   Email: ' + adminResult.rows[0].email);
    console.log('   Password: ' + newPassword);
    
  } catch (error) {
    console.error('Error resetting password:', error.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

// Get password from command line or use default
const newPassword = process.argv[2] || 'Admin123!';

console.log('='.repeat(50));
console.log('Admin Password Reset Script');
console.log('='.repeat(50));
console.log('New password will be:', newPassword);
console.log('='.repeat(50));

resetAdminPassword(newPassword);