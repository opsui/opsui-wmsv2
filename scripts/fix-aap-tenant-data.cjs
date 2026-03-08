/**
 * Fix AAP Tenant Data Consistency
 *
 * Ensures aap_db has the same org/user IDs as wms_db so tenant routing works.
 * The wms_db is the source of truth for IDs.
 */

const { Pool } = require('pg');
const bcrypt = require('bcrypt');

async function fix() {
  const wms = new Pool({ host: 'localhost', port: 5432, database: 'wms_db', user: 'wms_user', password: 'wms_password' });
  const aap = new Pool({ host: 'localhost', port: 5432, database: 'aap_db', user: 'wms_user', password: 'wms_password' });

  // Get the canonical IDs from wms_db
  const wmsUser = await wms.query("SELECT user_id, email FROM users WHERE email = 'stores@aap.co.nz'");
  const wmsOrg = await wms.query("SELECT organization_id, organization_code, slug FROM organizations WHERE slug = 'aap'");
  const wmsLink = await wms.query(
    'SELECT organization_user_id FROM organization_users WHERE user_id = $1 AND organization_id = $2',
    [wmsUser.rows[0].user_id, wmsOrg.rows[0].organization_id]
  );

  const userId = wmsUser.rows[0].user_id;
  const orgId = wmsOrg.rows[0].organization_id;
  const orgCode = wmsOrg.rows[0].organization_code;
  const linkId = wmsLink.rows[0].organization_user_id;

  // Get NetSuite integration from wms_db
  const wmsIntegration = await wms.query(
    `SELECT i.* FROM integrations i
     JOIN integration_organizations io ON io.integration_id = i.integration_id
     WHERE io.organization_id = $1 AND i.provider = 'NETSUITE'`,
    [orgId]
  );

  console.log('Canonical IDs from wms_db:');
  console.log('  User ID:', userId);
  console.log('  Org ID:', orgId);
  console.log('  Link ID:', linkId);

  // Clear stale data from aap_db
  const aapClient = await aap.connect();
  try {
    await aapClient.query('BEGIN');

    // Remove old mismatched records
    await aapClient.query('DELETE FROM integration_organizations');
    await aapClient.query("DELETE FROM integrations WHERE provider = 'NETSUITE'");
    await aapClient.query('DELETE FROM organization_users');
    await aapClient.query("DELETE FROM users WHERE email = 'stores@aap.co.nz'");
    await aapClient.query("DELETE FROM organizations WHERE slug = 'aap'");

    // Insert with matching IDs from wms_db
    const passwordHash = await bcrypt.hash('password123', 10);

    await aapClient.query(
      `INSERT INTO organizations (
        organization_id, organization_code, organization_name, slug,
        legal_name, tier, status, is_active,
        base_currency, timezone, date_format, fiscal_year_start_month,
        max_users, max_entities, max_storage_mb,
        database_name, settings,
        created_at, updated_at
      ) VALUES (
        $1, $2, 'AAP', 'aap',
        'AAP', 'ENTERPRISE', 'ACTIVE', true,
        'NZD', 'Pacific/Auckland', 'DD/MM/YYYY', 4,
        500, 50, 100000,
        'aap_db', $3,
        NOW(), NOW()
      )`,
      [orgId, orgCode, JSON.stringify({ netsuite: { accountId: '7438866', enabled: true } })]
    );

    await aapClient.query(
      `INSERT INTO users (
        user_id, name, email, password_hash, role, active,
        default_organization_id, created_at
      ) VALUES ($1, 'AAP Admin', 'stores@aap.co.nz', $2, 'ADMIN', true, $3, NOW())`,
      [userId, passwordHash, orgId]
    );

    await aapClient.query(
      `INSERT INTO organization_users (
        organization_user_id, organization_id, user_id, role, is_primary,
        can_manage_users, can_manage_billing, can_manage_settings, can_invite_users,
        is_active, joined_at, created_at, updated_at
      ) VALUES ($1, $2, $3, 'ORG_OWNER', true, true, true, true, true, true, NOW(), NOW(), NOW())`,
      [linkId, orgId, userId]
    );

    // Mirror NetSuite integration if it exists in wms_db
    if (wmsIntegration.rows.length > 0) {
      const int = wmsIntegration.rows[0];
      await aapClient.query(
        `INSERT INTO integrations (
          integration_id, name, description, type, provider, status,
          configuration, sync_settings, enabled, created_by,
          created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())`,
        [
          int.integration_id,
          int.name,
          int.description,
          int.type,
          int.provider,
          int.status,
          JSON.stringify(int.configuration),
          JSON.stringify(int.sync_settings),
          int.enabled,
          userId,
        ]
      );
      await aapClient.query(
        `INSERT INTO integration_organizations (integration_id, organization_id)
         VALUES ($1, $2)`,
        [int.integration_id, orgId]
      );
      console.log('Mirrored NetSuite integration:', int.integration_id);
    }

    await aapClient.query('COMMIT');
    console.log('\naap_db data fixed with matching IDs');
  } catch (error) {
    await aapClient.query('ROLLBACK');
    console.error('Error:', error.message);
    throw error;
  } finally {
    aapClient.release();
  }

  // Verify
  console.log('\n=== Verification ===');
  const aapUser = await aap.query("SELECT user_id, default_organization_id FROM users WHERE email = 'stores@aap.co.nz'");
  const aapOrg = await aap.query("SELECT organization_id, database_name FROM organizations WHERE slug = 'aap'");
  console.log('aap_db user:', aapUser.rows[0]);
  console.log('aap_db org:', aapOrg.rows[0]);
  console.log('IDs match wms_db:', aapUser.rows[0].user_id === userId && aapOrg.rows[0].organization_id === orgId ? 'YES' : 'NO');

  await wms.end();
  await aap.end();
}

fix().catch(e => { console.error(e); process.exit(1); });
