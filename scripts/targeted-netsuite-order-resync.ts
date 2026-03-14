import { Client } from 'pg';
import NetSuiteClientModule from '../packages/backend/src/services/NetSuiteClient';
import NetSuiteOrderSyncServiceModule from '../packages/backend/src/services/NetSuiteOrderSyncService';

type IntegrationRow = {
  integration_id: string;
  configuration: {
    auth?: {
      accountId?: string;
      tokenId?: string;
      tokenSecret?: string;
      consumerKey?: string;
      consumerSecret?: string;
    };
  };
};

const { NetSuiteClient } = NetSuiteClientModule as any;
const { NetSuiteOrderSyncService } = NetSuiteOrderSyncServiceModule as any;

const targets = process.argv
  .slice(2)
  .map(value => value.trim().toUpperCase())
  .filter(Boolean);

if (targets.length === 0) {
  console.error('Usage: npx tsx scripts/targeted-netsuite-order-resync.ts SO68561 SO68563');
  process.exit(1);
}

const db = new Client({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  database: process.env.DB_NAME || 'wms_db',
  user: process.env.DB_USER || 'wms_user',
  password: process.env.DB_PASSWORD || 'wms_password',
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
});

function normalizeSoRef(value: string | null | undefined): string {
  return String(value || '')
    .replace(/^.*#/, '')
    .trim()
    .toUpperCase();
}

async function main() {
  await db.connect();

  const integrationResult = await db.query<IntegrationRow>(`
    SELECT integration_id, configuration
    FROM integrations
    WHERE type = 'ERP' AND status = 'ACTIVE'
    ORDER BY created_at DESC NULLS LAST
    LIMIT 1
  `);

  const integration = integrationResult.rows[0];
  if (!integration) {
    throw new Error('No active NetSuite integration found');
  }

  const auth = integration.configuration?.auth || {};
  const netsuite = new NetSuiteClient({
    accountId: String(auth.accountId || ''),
    tokenId: String(auth.tokenId || ''),
    tokenSecret: String(auth.tokenSecret || ''),
    consumerKey: String(auth.consumerKey || ''),
    consumerSecret: String(auth.consumerSecret || ''),
  });

  const syncService = new NetSuiteOrderSyncService(netsuite);
  const matchedSalesOrders: any[] = [];
  const matchedFulfillments: any[] = [];

  const salesOrders = await netsuite.getSalesOrders({
    status: '_pendingFulfillment',
    limit: 2500,
    modifiedAfter: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
  });

  for (const order of salesOrders.items || []) {
    if (targets.includes(normalizeSoRef(order.tranId))) {
      matchedSalesOrders.push(order);
    }
  }

  const fulfillments = await netsuite.getItemFulfillments({
    limit: 500,
    modifiedAfter: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000),
  });

  for (const fulfillment of fulfillments.items || []) {
    const soRef = normalizeSoRef(fulfillment.createdFrom?.refName);
    if (targets.includes(soRef) || targets.includes(normalizeSoRef(fulfillment.tranId))) {
      matchedFulfillments.push(fulfillment);
    }
  }

  const results: Array<Record<string, unknown>> = [];

  for (const salesOrder of matchedSalesOrders) {
    const result = await syncService.syncSingleOrder(salesOrder, integration.integration_id);
    results.push({
      type: 'salesOrder',
      tranId: salesOrder.tranId,
      result,
    });
  }

  for (const fulfillment of matchedFulfillments) {
    const result = await syncService.syncSingleFulfillment(fulfillment, integration.integration_id);
    results.push({
      type: 'fulfillment',
      tranId: fulfillment.tranId,
      soRef: normalizeSoRef(fulfillment.createdFrom?.refName),
      shipStatus: fulfillment.shipStatus,
      result,
    });
  }

  const localOrders = await db.query(
    `
      SELECT order_id, status, customer_name, picker_id, packer_id, updated_at
      FROM orders
      WHERE UPPER(order_id) = ANY($1)
      ORDER BY order_id
    `,
    [targets]
  );

  console.log(
    JSON.stringify(
      {
        targets,
        matchedSalesOrders: matchedSalesOrders.map(order => order.tranId),
        matchedFulfillments: matchedFulfillments.map(fulfillment => ({
          tranId: fulfillment.tranId,
          soRef: normalizeSoRef(fulfillment.createdFrom?.refName),
          shipStatus: fulfillment.shipStatus,
        })),
        syncResults: results,
        localOrders: localOrders.rows,
      },
      null,
      2
    )
  );
}

main()
  .catch(error => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await db.end().catch(() => undefined);
  });
