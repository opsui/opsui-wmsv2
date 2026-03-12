/**
 * Re-sync NetSuite Orders Script
 *
 * This script clears old test orders and triggers a fresh sync from NetSuite
 * to get the correct SO numbers in the netsuite_so_tran_id column.
 *
 * Usage: node scripts/resync-netsuite-orders.cjs
 */

const { Pool } = require('pg');
const https = require('https');
const crypto = require('crypto');

// Load environment variables
require('dotenv').config({ path: '.env' });

// Database connection
const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
});

// NetSuite credentials from environment
const NETSUITE_CONFIG = {
  accountId: process.env.NETSUITE_ACCOUNT_ID,
  tokenId: process.env.NETSUITE_TOKEN_ID,
  tokenSecret: process.env.NETSUITE_TOKEN_SECRET,
  consumerKey: process.env.NETSUITE_CONSUMER_KEY,
  consumerSecret: process.env.NETSUITE_CONSUMER_SECRET,
};

// ============================================================================
// NETSUITE SOAP CLIENT (Minimal version for sync)
// ============================================================================

const NS_VERSION = '2023_1';
const NAMESPACES = {
  soap: 'http://schemas.xmlsoap.org/soap/envelope/',
  xsi: 'http://www.w3.org/2001/XMLSchema-instance',
  tns: `urn:messages_${NS_VERSION}.platform.webservices.netsuite.com`,
  platformCore: `urn:core_${NS_VERSION}.platform.webservices.netsuite.com`,
  platformCommon: `urn:common_${NS_VERSION}.platform.webservices.netsuite.com`,
  tranSales: `urn:sales_${NS_VERSION}.transactions.webservices.netsuite.com`,
};

function generateTokenPassport(config) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');
  const baseString = `${config.accountId}&${config.consumerKey}&${config.tokenId}&${nonce}&${timestamp}`;
  const signingKey = `${config.consumerSecret}&${config.tokenSecret}`;
  const signature = crypto.createHmac('sha256', signingKey).update(baseString).digest('base64');

  return [
    '<tns:tokenPassport>',
    `  <platformCore:account>${config.accountId}</platformCore:account>`,
    `  <platformCore:consumerKey>${config.consumerKey}</platformCore:consumerKey>`,
    `  <platformCore:token>${config.tokenId}</platformCore:token>`,
    `  <platformCore:nonce>${nonce}</platformCore:nonce>`,
    `  <platformCore:timestamp>${timestamp}</platformCore:timestamp>`,
    `  <platformCore:signature algorithm="HMAC-SHA256">${signature}</platformCore:signature>`,
    '</tns:tokenPassport>',
  ].join('\n');
}

function buildEnvelope(config, headerExtra, body) {
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<soap:Envelope xmlns:soap="${NAMESPACES.soap}"`,
    `  xmlns:xsi="${NAMESPACES.xsi}"`,
    `  xmlns:tns="${NAMESPACES.tns}"`,
    `  xmlns:platformCore="${NAMESPACES.platformCore}"`,
    `  xmlns:platformCommon="${NAMESPACES.platformCommon}"`,
    `  xmlns:tranSales="${NAMESPACES.tranSales}">`,
    '  <soap:Header>',
    `    ${generateTokenPassport(config)}`,
    headerExtra ? `    ${headerExtra}` : '',
    '  </soap:Header>',
    '  <soap:Body>',
    `    ${body}`,
    '  </soap:Body>',
    '</soap:Envelope>',
  ].join('\n');
}

function escapeXml(str) {
  return str
    .replace(/&/g, '&')
    .replace(/</g, '<')
    .replace(/>/g, '>')
    .replace(/"/g, '"')
    .replace(/'/g, ''');
}

function extractTag(xml, tag) {
  const regex = new RegExp(`<(?:[\\w-]+:)?${tag}[^>]*>([\\s\\S]*?)</(?:[\\w-]+:)?${tag}>`, 'i');
  const match = xml.match(regex);
  return match ? match[1].trim() : '';
}

function extractAttribute(xml, tag, attr) {
  const regex = new RegExp(`<(?:[\\w-]+:)?${tag}[^>]*?${attr}="([^"]*)"`, 'i');
  const match = xml.match(regex);
  return match ? match[1] : '';
}

function extractCustomFieldValue(xml, scriptId) {
  const regex = new RegExp(
    `<(?:[\\w-]+:)?customField[^>]*scriptId="${scriptId}"[^>]*>[\\s\\S]*?<\\/(?:[\\w-]+:)?customField>`,
    'i'
  );
  const match = xml.match(regex);
  if (!match) return '';
  return extractTag(match[0], 'value');
}

function extractAllRecords(xml) {
  const records = [];
  const regex =
    /<(?:[\w-]+:)?record\s[^>]*xsi:type="tranSales:SalesOrder"[^>]*>[\s\S]*?<\/(?:[\w-]+:)?record>/gi;
  let match;
  while ((match = regex.exec(xml)) !== null) {
    records.push(match[0]);
  }
  return records;
}

async function soapRequest(config, soapAction, envelope) {
  const restAccountId = config.accountId.toLowerCase().replace(/_/g, '-');
  const soapUrl = `https://${restAccountId}.suitetalk.api.netsuite.com/services/NetSuitePort_${NS_VERSION}`;
  const urlObj = new URL(soapUrl);
  const bodyBuf = Buffer.from(envelope, 'utf-8');

  return new Promise((resolve, reject) => {
    const req = https.request(
      {
        hostname: urlObj.hostname,
        path: urlObj.pathname,
        method: 'POST',
        headers: {
          'Content-Type': 'text/xml; charset=utf-8',
          SOAPAction: soapAction,
          'Content-Length': bodyBuf.length,
        },
      },
      res => {
        let data = '';
        res.on('data', chunk => (data += chunk));
        res.on('end', () => resolve(data));
      }
    );

    req.on('error', reject);
    req.setTimeout(120000, () => {
      req.destroy();
      reject(new Error('NetSuite SOAP request timeout'));
    });

    req.write(bodyBuf);
    req.end();
  });
}

// ============================================================================
// MAIN SCRIPT
// ============================================================================

async function main() {
  console.log('=== NetSuite Order Re-Sync Script ===\n');

  // Validate NetSuite config
  if (!NETSUITE_CONFIG.accountId || !NETSUITE_CONFIG.tokenId) {
    console.error('ERROR: NetSuite credentials not configured.');
    console.error('Please set NETSUITE_ACCOUNT_ID, NETSUITE_TOKEN_ID, etc. in .env');
    process.exit(1);
  }

  try {
    // Step 1: Check current orders
    console.log('Step 1: Checking current orders in database...');
    const currentOrders = await pool.query(`
      SELECT order_id, customer_name, status, netsuite_so_tran_id, netsuite_source, created_at
      FROM orders
      ORDER BY created_at DESC
      LIMIT 10
    `);
    
    console.log(`Found ${currentOrders.rowCount} recent orders:`);
    for (const row of currentOrders.rows) {
      console.log(`  - ${row.order_id}: ${row.customer_name} | NS SO: ${row.netsuite_so_tran_id || 'NULL'} | Source: ${row.netsuite_source || 'NULL'}`);
    }

    // Step 2: Count orders without NetSuite tracking
    const untrackedCount = await pool.query(`
      SELECT COUNT(*) as count FROM orders
      WHERE netsuite_source IS NULL OR netsuite_so_tran_id IS NULL
    `);
    console.log(`\nOrders without NetSuite tracking: ${untrackedCount.rows[0].count}`);

    // Step 3: Test NetSuite connection
    console.log('\nStep 2: Testing NetSuite connection...');
    const testEnvelope = buildEnvelope(NETSUITE_CONFIG, '', '<tns:getServerTime/>');
    const testResponse = await soapRequest(NETSUITE_CONFIG, 'getServerTime', testEnvelope);
    
    if (testResponse.includes('isSuccess="true"')) {
      console.log('✓ NetSuite connection successful');
    } else {
      const fault = extractTag(testResponse, 'faultstring');
      console.error('✗ NetSuite connection failed:', fault);
      process.exit(1);
    }

    // Step 4: Fetch sales orders from NetSuite
    console.log('\nStep 3: Fetching pending sales orders from NetSuite...');
    
    const searchPrefs = [
      '<tns:searchPreferences>',
      '  <tns:pageSize>200</tns:pageSize>',
      '  <tns:bodyFieldsOnly>false</tns:bodyFieldsOnly>',
      '</tns:searchPreferences>',
    ].join('\n');

    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 7);
    const dateFrom = recentDate.toISOString().split('T')[0] + 'T00:00:00.000Z';

    const searchBody = [
      '<tns:search>',
      '  <tns:searchRecord xsi:type="platformCommon:TransactionSearchBasic">',
      '    <platformCommon:type operator="anyOf">',
      '      <platformCore:searchValue>_salesOrder</platformCore:searchValue>',
      '    </platformCommon:type>',
      '    <platformCommon:lastModifiedDate operator="after">',
      `      <platformCore:searchValue>${dateFrom}</platformCore:searchValue>`,
      '    </platformCommon:lastModifiedDate>',
      '  </tns:searchRecord>',
      '</tns:search>',
    ].join('\n');

    const envelope = buildEnvelope(NETSUITE_CONFIG, searchPrefs, searchBody);
    const response = await soapRequest(NETSUITE_CONFIG, 'search', envelope);

    if (!response.includes('isSuccess="true"')) {
      const fault = extractTag(response, 'faultstring') || 'Unknown error';
      console.error('✗ Failed to fetch sales orders:', fault);
      process.exit(1);
    }

    const totalRecords = parseInt(extractTag(response, 'totalRecords')) || 0;
    const records = extractAllRecords(response);
    
    console.log(`✓ Found ${totalRecords} total sales orders, ${records.length} in first page`);

    // Step 5: Parse and filter to pending fulfillment + ready to ship
    const pendingOrders = [];
    for (const recordXml of records) {
      const statusName = extractTag(recordXml, 'statusRef') || extractTag(recordXml, 'status');
      const readyToShip =
        recordXml.includes('custbody8') &&
        extractCustomFieldValue(recordXml, 'custbody8') === 'true';
      
      if (statusName.toLowerCase().includes('pending fulfillment') && readyToShip) {
        const internalId = extractAttribute(recordXml, 'record', 'internalId');
        const tranId = extractTag(recordXml, 'tranId');
        const entityName = extractTag(recordXml, 'name') || extractTag(recordXml, 'entity');
        
        pendingOrders.push({
          internalId,
          tranId,
          entityName,
          status: statusName,
        });
      }
    }

    console.log(`✓ Found ${pendingOrders.length} orders pending fulfillment and ready to ship`);

    if (pendingOrders.length === 0) {
      console.log('\nNo orders to sync. Exiting.');
      await pool.end();
      return;
    }

    // Step 6: Show what will be synced
    console.log('\nOrders to sync:');
    for (const order of pendingOrders.slice(0, 10)) {
      console.log(`  - ${order.tranId}: ${order.entityName}`);
    }
    if (pendingOrders.length > 10) {
      console.log(`  ... and ${pendingOrders.length - 10} more`);
    }

    // Step 7: Get integration ID
    const integrationResult = await pool.query(`
      SELECT i.integration_id, io.organization_id
      FROM integrations i
      LEFT JOIN integration_organizations io ON io.integration_id = i.integration_id
      WHERE i.provider = 'NETSUITE'
      LIMIT 1
    `);

    if (integrationResult.rowCount === 0) {
      console.error('\n✗ No NetSuite integration found in database.');
      console.error('Please create a NetSuite integration first via the UI.');
      process.exit(1);
    }

    const integrationId = integrationResult.rows[0].integration_id;
    const organizationId = integrationResult.rows[0].organization_id;
    console.log(`\nUsing integration: ${integrationId}`);
    console.log(`Organization: ${organizationId || 'None'}`);

    // Step 8: Trigger sync via API
    console.log('\nStep 4: To complete the sync, run this command:');
    console.log(`\ncurl -X POST "http://localhost:3001/api/integrations/${integrationId}/netsuite/sync-orders" \\`);
    console.log('  -H "Content-Type: application/json" \\');
    console.log('  -H "Authorization: Bearer <YOUR_TOKEN>" \\');
    console.log('  -d \'{"limit": 100}\'');

    console.log('\nOr trigger via the OpsUI dashboard:');
    console.log('  1. Go to Settings > Integrations');
    console.log('  2. Click on the NetSuite integration');
    console.log('  3. Click "Sync Now"');

    await pool.end();
    console.log('\n=== Script Complete ===');

  } catch (error) {
    console.error('\n✗ Error:', error.message);
    console.error(error.stack);
    await pool.end();
    process.exit(1);
  }
}

main();