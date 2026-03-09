/**
 * Update AAP NetSuite Integration Tokens
 *
 * One-time script to update the AAP organization's NetSuite integration
 * credentials in the database after a token reset.
 *
 * Usage: node scripts/update-aap-netsuite-tokens.cjs
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../packages/backend/.env') });
const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'wms_password',
});

const NEW_TOKEN_ID = process.env.NETSUITE_TOKEN_ID;
const NEW_TOKEN_SECRET = process.env.NETSUITE_TOKEN_SECRET;

async function updateTokens() {
  const client = await pool.connect();

  try {
    // Find AAP organization's NetSuite integration
    const result = await client.query(`
      SELECT i.integration_id, i.name, i.configuration
      FROM integrations i
      JOIN integration_organizations io ON io.integration_id = i.integration_id
      JOIN organizations o ON o.organization_id = io.organization_id
      WHERE o.slug = 'aap' AND i.provider = 'NETSUITE'
    `);

    if (result.rows.length === 0) {
      console.error('No NetSuite integration found for AAP organization.');
      process.exit(1);
    }

    const integration = result.rows[0];
    console.log(`Found integration: ${integration.name} (${integration.integration_id})`);

    // Update the configuration JSONB with new token credentials
    const config = integration.configuration || {};
    const auth = config.auth || {};

    console.log('Old Token ID:', auth.tokenId ? auth.tokenId.substring(0, 8) + '...' : '(not set)');

    auth.tokenId = NEW_TOKEN_ID;
    auth.tokenSecret = NEW_TOKEN_SECRET;
    config.auth = auth;

    await client.query(
      `UPDATE integrations SET configuration = $1, updated_at = NOW() WHERE integration_id = $2`,
      [JSON.stringify(config), integration.integration_id]
    );

    console.log('New Token ID:', NEW_TOKEN_ID.substring(0, 8) + '...');
    console.log('Token credentials updated successfully!');
  } catch (error) {
    console.error('Error updating tokens:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

updateTokens()
  .then(() => process.exit(0))
  .catch(() => process.exit(1));
