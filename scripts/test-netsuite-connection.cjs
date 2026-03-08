/**
 * Test NetSuite TBA Connection - try multiple approaches
 */

const crypto = require('crypto');
const https = require('https');

const config = {
  accountId: '7438866',
  tokenId: 'dc1317d98250f2005412139dc8b6566c55abba1fb366132f9019c568638fbf80',
  tokenSecret: 'fbea850ce901b7f048d485ce0ccb3ceefa798546ef77376fd6e21b8c0c1f5a56',
  consumerKey: '1b5b7c6729175e166c0135fbee83901d429e7f87ceb99341f91374ec077e2170',
  consumerSecret: 'cce6b894d3d87b708e77b25dc1cef8bb5eb4146dede6c941738c083544f604c0',
};

function generateOAuthHeader(method, url) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonce = crypto.randomBytes(16).toString('hex');

  const params = {
    oauth_consumer_key: config.consumerKey,
    oauth_token: config.tokenId,
    oauth_nonce: nonce,
    oauth_timestamp: timestamp,
    oauth_signature_method: 'HMAC-SHA256',
    oauth_version: '1.0',
  };

  // Parse URL to get base URL and query params
  const urlObj = new URL(url);
  const baseUrl = `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;

  // Combine OAuth params with query params for signature
  const combined = { ...params };
  for (const [k, v] of urlObj.searchParams) {
    combined[k] = v;
  }

  const sortedParams = Object.keys(combined).sort().map(k =>
    `${encodeURIComponent(k)}=${encodeURIComponent(combined[k])}`
  ).join('&');

  const signatureBase = `${method.toUpperCase()}&${encodeURIComponent(baseUrl)}&${encodeURIComponent(sortedParams)}`;
  const signingKey = `${encodeURIComponent(config.consumerSecret)}&${encodeURIComponent(config.tokenSecret)}`;
  const signature = crypto.createHmac('sha256', signingKey).update(signatureBase).digest('base64');

  params.oauth_signature = signature;

  return 'OAuth realm="' + config.accountId + '", ' +
    Object.keys(params).map(k => `${k}="${encodeURIComponent(params[k])}"`).join(', ');
}

function request(method, url, body) {
  return new Promise((resolve, reject) => {
    const authHeader = generateOAuthHeader(method, url);
    const urlObj = new URL(url);
    const bodyStr = body ? JSON.stringify(body) : null;

    const options = {
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      method,
      headers: {
        'Authorization': authHeader,
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Prefer': 'transient',
      },
    };
    if (bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, data: parsed });
      });
    });
    req.on('error', reject);
    req.setTimeout(15000, () => { req.destroy(); reject(new Error('Timeout')); });
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  const base = `https://${config.accountId}.suitetalk.api.netsuite.com/services/rest`;

  console.log('NetSuite API Probe - Account:', config.accountId);
  console.log('');

  // Try various record types to find what this role can access
  const recordTypes = [
    'inventoryItem', 'customer', 'salesOrder', 'purchaseOrder',
    'item', 'contact', 'employee', 'vendor', 'invoice',
    'itemFulfillment', 'transferOrder', 'bin', 'location',
    'subsidiary', 'department', 'classification', 'account',
    'nonInventoryItem', 'lotNumberedInventoryItem', 'assemblyItem',
  ];

  console.log('=== Probing Record Types ===');
  for (const type of recordTypes) {
    try {
      const result = await request('GET', `${base}/record/v1/${type}?limit=1`);
      const status = result.status;
      if (status === 200) {
        const total = result.data.totalResults || result.data.count || '?';
        console.log(`  ${type}: ${status} OK (${total} records)`);
      } else {
        const err = result.data?.['o:errorDetails']?.[0]?.o_errorCode ||
                    result.data?.['o:errorDetails']?.[0]?.['o:errorCode'] ||
                    result.status;
        console.log(`  ${type}: ${status} (${err})`);
      }
    } catch (e) {
      console.log(`  ${type}: ERROR (${e.message})`);
    }
  }

  // Try SuiteQL with simpler queries
  console.log('\n=== Probing SuiteQL ===');
  const queries = [
    { name: 'subsidiaries', q: "SELECT id, name FROM subsidiary WHERE ROWNUM <= 3" },
    { name: 'locations', q: "SELECT id, name FROM location WHERE ROWNUM <= 3" },
    { name: 'departments', q: "SELECT id, name FROM department WHERE ROWNUM <= 3" },
    { name: 'accounts', q: "SELECT id, acctnumber, acctname FROM account WHERE ROWNUM <= 3" },
    { name: 'items', q: "SELECT id, itemid, displayname FROM item WHERE ROWNUM <= 3" },
    { name: 'transactions', q: "SELECT id, tranid, type FROM transaction WHERE ROWNUM <= 3" },
  ];

  for (const { name, q } of queries) {
    try {
      const result = await request('POST', `${base}/query/v1/suiteql`, { q });
      if (result.status === 200) {
        console.log(`  ${name}: ${result.status} OK`);
        if (result.data.items) {
          result.data.items.forEach(i => console.log(`    ${JSON.stringify(i)}`));
        }
      } else {
        const err = result.data?.['o:errorDetails']?.[0]?.['o:errorCode'] || result.status;
        console.log(`  ${name}: ${result.status} (${err})`);
      }
    } catch (e) {
      console.log(`  ${name}: ERROR (${e.message})`);
    }
  }
}

main();
