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
  const ifResp = await client.getItemFulfillments({ limit: 500 });
  const fulfillments = ifResp.items || [];
  const target = fulfillments.find(f => (f.tranId || '').trim() === 'IF73367');
  if (!target) {
    console.log('IF73367 not found in search');
    return;
  }
  const full = await client.getItemFulfillment(target.id);
  console.log(
    JSON.stringify(
      {
        search: target,
        full: {
          id: full.id,
          tranId: full.tranId,
          createdFrom: full.createdFrom,
          shipStatus: full.shipStatus,
          itemCount: full.item?.items?.length || 0,
        },
      },
      null,
      2
    )
  );
})();
