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
  const pool = new Pool({
    host: process.env.DB_HOST,
    port: parseInt(process.env.DB_PORT || '5432', 10),
    database: process.env.AAP_DB_NAME || 'aap_db',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
  });
  const client = new NetSuiteClient();

  const rows = await pool.query(
    "SELECT order_id, netsuite_so_internal_id FROM orders WHERE order_id IN ('SO68375','SO68510')"
  );
  for (const row of rows.rows) {
    if (!row.netsuite_so_internal_id) continue;
    const so = await client.getSalesOrder(String(row.netsuite_so_internal_id));
    const subtotal = so.subTotal != null ? so.subTotal : 0;
    const total = so.total != null ? so.total : subtotal;
    await pool.query('UPDATE orders SET subtotal = $1, total_amount = $2 WHERE order_id = $3', [
      subtotal,
      total,
      row.order_id,
    ]);
    console.log(`Updated ${row.order_id}: subtotal=${subtotal} total=${total}`);
  }
  await pool.end();
})().catch(err => {
  console.error(err.message);
  process.exit(1);
});
