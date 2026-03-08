/**
 * Seed Default Organization
 * 
 * Creates a default organization and assigns all existing users to it.
 * This is for the initial customer setup.
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'wms_password',
});

async function seedDefaultOrganization() {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    console.log('🏢 Creating default organization...');
    
    // Check if default organization already exists
    const existingOrg = await client.query(
      `SELECT * FROM organizations WHERE slug = $1`,
      ['opsui-default']
    );
    
    let organizationId;
    
    if (existingOrg.rows.length > 0) {
      console.log('✅ Default organization already exists:', existingOrg.rows[0].organization_id);
      organizationId = existingOrg.rows[0].organization_id;
    } else {
      // Create default organization
      organizationId = `ORG${uuidv4().substring(0, 7).toUpperCase()}`;
      
      await client.query(
        `INSERT INTO organizations (
          organization_id, organization_code, organization_name, slug,
          legal_name, tier, status, is_active,
          base_currency, timezone, date_format, fiscal_year_start_month,
          max_users, max_entities, max_storage_mb,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, true,
          'NZD', 'Pacific/Auckland', 'DD/MM/YYYY', 4,
          500, 50, 100000,
          NOW(), NOW()
        )`,
        [
          organizationId,
          organizationId,
          'OpsUI Default',
          'opsui-default',
          'OpsUI Default Organization',
          'ENTERPRISE',
          'ACTIVE',
        ]
      );
      
      console.log('✅ Created default organization:', organizationId);
    }
    
    // Get all users not already in this organization
    const usersResult = await client.query(
      `SELECT user_id, name, email, role FROM users 
       WHERE user_id NOT IN (
         SELECT user_id FROM organization_users WHERE organization_id = $1
       )`,
      [organizationId]
    );
    
    console.log(`👥 Found ${usersResult.rows.length} users to add to organization...`);
    
    // Add each user to the organization
    for (const user of usersResult.rows) {
      const organizationUserId = `OU${uuidv4().substring(0, 7).toUpperCase()}`;
      
      // Determine role based on user's system role
      let orgRole = 'ORG_MEMBER';
      let canManageUsers = false;
      let canManageBilling = false;
      let canManageSettings = false;
      let canInviteUsers = false;
      
      if (user.role === 'ADMIN') {
        orgRole = 'ORG_OWNER';
        canManageUsers = true;
        canManageBilling = true;
        canManageSettings = true;
        canInviteUsers = true;
      } else if (user.role === 'MANAGER' || user.role === 'STOCK_CONTROLLER') {
        orgRole = 'ORG_ADMIN';
        canManageUsers = true;
        canManageSettings = true;
        canInviteUsers = true;
      }
      
      await client.query(
        `INSERT INTO organization_users (
          organization_user_id, organization_id, user_id, role, is_primary,
          can_manage_users, can_manage_billing, can_manage_settings, can_invite_users,
          is_active, joined_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, true, $5, $6, $7, $8, true, NOW(), NOW(), NOW())`,
        [
          organizationUserId,
          organizationId,
          user.user_id,
          orgRole,
          canManageUsers,
          canManageBilling,
          canManageSettings,
          canInviteUsers,
        ]
      );
      
      // Update user's default_organization_id
      await client.query(
        `UPDATE users SET default_organization_id = $1 WHERE user_id = $2`,
        [organizationId, user.user_id]
      );
      
      console.log(`  ✅ Added ${user.name} (${user.email}) as ${orgRole}`);
    }
    
    await client.query('COMMIT');
    
    console.log('\n🎉 Default organization seeding complete!');
    console.log(`   Organization ID: ${organizationId}`);
    console.log(`   Users added: ${usersResult.rows.length}`);
    
    return {
      organizationId,
      usersAdded: usersResult.rows.length,
    };
    
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Error seeding default organization:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Run the seed function
seedDefaultOrganization()
  .then(result => {
    console.log('\n✅ Done!');
    process.exit(0);
  })
  .catch(error => {
    console.error('\n❌ Failed:', error);
    process.exit(1);
  });