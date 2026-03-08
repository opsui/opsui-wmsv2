/**
 * Seed AAP Organization
 *
 * Creates the AAP organization (NetSuite customer) and admin user.
 */

const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');
const bcrypt = require('bcrypt');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'wms_password',
});

async function seedAAPOrganization() {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // 1. Check if organization already exists
    const existingOrg = await client.query(
      `SELECT * FROM organizations WHERE slug = $1`,
      ['aap']
    );

    let organizationId;

    if (existingOrg.rows.length > 0) {
      console.log('Organization already exists:', existingOrg.rows[0].organization_id);
      organizationId = existingOrg.rows[0].organization_id;
    } else {
      organizationId = `ORG${uuidv4().substring(0, 7).toUpperCase()}`;

      await client.query(
        `INSERT INTO organizations (
          organization_id, organization_code, organization_name, slug,
          legal_name, tier, status, is_active,
          base_currency, timezone, date_format, fiscal_year_start_month,
          max_users, max_entities, max_storage_mb,
          settings,
          created_at, updated_at
        ) VALUES (
          $1, $2, $3, $4,
          $5, $6, $7, true,
          'NZD', 'Pacific/Auckland', 'DD/MM/YYYY', 4,
          500, 50, 100000,
          $8,
          NOW(), NOW()
        )`,
        [
          organizationId,
          'AAP',
          'AAP',
          'aap',
          'AAP',
          'ENTERPRISE',
          'ACTIVE',
          JSON.stringify({
            netsuite: {
              accountId: '7438866',
              enabled: true,
            },
          }),
        ]
      );

      console.log('Created AAP organization:', organizationId);
    }

    // 2. Check if admin user already exists
    const existingUser = await client.query(
      `SELECT * FROM users WHERE email = $1`,
      ['stores@aap.co.nz']
    );

    let userId;

    if (existingUser.rows.length > 0) {
      console.log('Admin user already exists:', existingUser.rows[0].user_id);
      userId = existingUser.rows[0].user_id;
    } else {
      userId = `USR${uuidv4().substring(0, 7).toUpperCase()}`;
      const passwordHash = await bcrypt.hash('password123', 10);

      await client.query(
        `INSERT INTO users (
          user_id, name, email, password_hash, role, active,
          default_organization_id, created_at
        ) VALUES ($1, $2, $3, $4, $5, true, $6, NOW())`,
        [
          userId,
          'AAP Admin',
          'stores@aap.co.nz',
          passwordHash,
          'ADMIN',
          organizationId,
        ]
      );

      console.log('Created admin user:', userId, '(stores@aap.co.nz)');
    }

    // 3. Link user to organization as ORG_OWNER
    const existingLink = await client.query(
      `SELECT * FROM organization_users WHERE organization_id = $1 AND user_id = $2`,
      [organizationId, userId]
    );

    if (existingLink.rows.length === 0) {
      const orgUserId = `OU${uuidv4().substring(0, 7).toUpperCase()}`;

      await client.query(
        `INSERT INTO organization_users (
          organization_user_id, organization_id, user_id, role, is_primary,
          can_manage_users, can_manage_billing, can_manage_settings, can_invite_users,
          is_active, joined_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, true, true, true, true, true, true, NOW(), NOW(), NOW())`,
        [orgUserId, organizationId, userId, 'ORG_OWNER']
      );

      console.log('Linked user to organization as ORG_OWNER');
    } else {
      console.log('User already linked to organization');
    }

    await client.query('COMMIT');

    console.log('\nAAP Organization setup complete!');
    console.log(`  Organization ID: ${organizationId}`);
    console.log(`  User ID: ${userId}`);
    console.log(`  Login: stores@aap.co.nz / password123`);

  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error:', error);
    throw error;
  } finally {
    client.release();
  }
}

seedAAPOrganization()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
