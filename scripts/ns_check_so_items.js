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

const {
  NetSuiteClient,
} = require('/root/opsui-wmsv2/packages/backend/dist/services/NetSuiteClient');

(async () => {
  const client = new NetSuiteClient();
  const so = await client.getSalesOrder('1599815');
  const count = so.item?.items?.length || 0;
  console.log(
    JSON.stringify(
      { id: so.id, tranId: so.tranId, itemCount: count, readyToShip: so.readyToShip },
      null,
      2
    )
  );
})();
