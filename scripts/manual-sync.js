const { Pool } = require('pg');
const {
  NetSuiteClient,
} = require('/root/opsui-wmsv2/packages/backend/dist/services/NetSuiteClient');
const {
  NetSuiteOrderSyncService,
} = require('/root/opsui-wmsv2/packages/backend/dist/services/NetSuiteOrderSyncService');

(async () => {
  const pool = new Pool({
    host: 'localhost',
    port: 5432,
    database: 'wms_db',
    user: 'wms_user',
    password: 'wms_password',
  });
  const res = await pool.query(
    "SELECT integration_id, configuration FROM integrations WHERE integration_id = 'INT-AAP-NS01'"
  );
  if (!res.rows.length) {
    console.error('Integration not found');
    process.exit(1);
  }
  const config = res.rows[0].configuration || {};
  const auth = config.auth || config;
  const client = new NetSuiteClient({
    accountId: auth.accountId,
    tokenId: auth.tokenId,
    tokenSecret: auth.tokenSecret,
    consumerKey: auth.consumerKey,
    consumerSecret: auth.consumerSecret,
  });

  const service = new NetSuiteOrderSyncService(client);
  const result = await service.syncOrders('INT-AAP-NS01', { limit: 200 });
  console.log('SYNC RESULT');
  console.log(JSON.stringify(result, null, 2));
  await pool.end();
})().catch(err => {
  console.error(err);
  process.exit(1);
});
