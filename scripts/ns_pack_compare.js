const fs = require('fs');
const path = '/root/opsui-wmsv2/packages/backend/.env';
try {
  const content = fs.readFileSync(path, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    if (!line || line.trim().startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    let val = line.slice(idx + 1).trim();
    if (!process.env[key]) process.env[key] = val;
  }
} catch (e) {}

const { Pool } = require('pg');
const {
  NetSuiteClient,
} = require('/root/opsui-wmsv2/packages/backend/dist/services/NetSuiteClient');

(async () => {
  const client = new NetSuiteClient();
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.AAP_DB_NAME || 'aap_db',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });

  const ifResp = await client.getItemFulfillments({ limit: 500 });
  const fulfillments = ifResp.items || [];
  const statusCounts = {};
  for (const f of fulfillments) {
    const s = (f.shipStatus || '').toLowerCase();
    statusCounts[s] = (statusCounts[s] || 0) + 1;
  }

  const soIds = new Set();
  for (const f of fulfillments) {
    if (f.createdFrom && f.createdFrom.id) soIds.add(String(f.createdFrom.id));
  }

  const sql =
    'SELECT order_id, netsuite_so_internal_id, netsuite_so_tran_id, status, updated_at ' +
    'FROM orders ' +
    "WHERE netsuite_source = 'NETSUITE' " +
    "AND status IN ('PICKED','PACKING')";

  const picked = await pool.query(sql);
  const missing = picked.rows.filter(
    r => !r.netsuite_so_internal_id || !soIds.has(String(r.netsuite_so_internal_id))
  );

  console.log(
    JSON.stringify(
      {
        fulfillments: fulfillments.length,
        fulfillmentSoCount: soIds.size,
        shipStatusCounts: statusCounts,
        pickedCount: picked.rows.length,
        missingCount: missing.length,
        missingSample: missing.slice(0, 10).map(r => ({
          order_id: r.order_id,
          soId: r.netsuite_so_internal_id,
          soTran: r.netsuite_so_tran_id,
        })),
      },
      null,
      2
    )
  );

  await pool.end();
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
