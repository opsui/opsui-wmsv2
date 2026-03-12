import { NetSuiteClient, NetSuiteSalesOrder } from '../NetSuiteClient';
import { NetSuiteOrderSyncService } from '../NetSuiteOrderSyncService';

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../db/client', () => ({
  query: jest.fn(),
}));

jest.mock('../../db/tenantContext', () => ({
  tenantPoolManager: {
    getPool: jest.fn(),
  },
}));

const { query: sharedQuery } = require('../../db/client');

describe('NetSuiteOrderSyncService', () => {
  const credentials = {
    accountId: 'TEST_ACCOUNT',
    tokenId: 'token-id',
    tokenSecret: 'token-secret',
    consumerKey: 'consumer-key',
    consumerSecret: 'consumer-secret',
  };

  const createService = () => {
    const client = new NetSuiteClient(credentials);
    const service = new NetSuiteOrderSyncService(client);

    jest.spyOn(service as any, 'ensureSchemaColumns').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'cleanupStaleOrders').mockResolvedValue(0);
    jest.spyOn(service as any, 'markOrderSynced').mockResolvedValue(undefined);
    jest.spyOn(service as any, 'updateOrderStatus').mockResolvedValue(undefined);

    return { client, service };
  };

  beforeEach(() => {
    jest.clearAllMocks();
    sharedQuery.mockResolvedValue({ rows: [], rowCount: 0 });
  });

  const baseSalesOrder = (overrides: Partial<NetSuiteSalesOrder> = {}): NetSuiteSalesOrder => ({
    id: '1599718',
    tranId: 'SO68381',
    readyToShip: true,
    tranDate: '2026-03-13',
    status: { id: '_pendingFulfillment', refName: 'Pending Fulfillment' },
    entity: { id: 'cust-1', refName: 'Customer' },
    item: {
      items: [
        {
          item: { id: 'sku-1', refName: 'SKU-1' },
          quantity: 1,
          line: 1,
        },
      ],
    },
    ...overrides,
  });

  it('cancels pending orders when NetSuite still shows pending fulfillment but readyToShip is false', async () => {
    const { client, service } = createService();
    const queryMock = jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PENDING', 'PICKING')")) {
        return {
          rows: [
            {
              order_id: 'SO67672',
              status: 'PENDING',
              netsuite_so_internal_id: '1580042',
              netsuite_so_tran_id: 'SO67672',
            },
          ],
          rowCount: 1,
        };
      }

      return { rows: [], rowCount: 0 };
    });

    const pendingNotReadySalesOrder: NetSuiteSalesOrder = {
      id: '1580042',
      tranId: 'SO67672',
      readyToShip: false,
      tranDate: '2026-03-13',
      status: { id: '_pendingFulfillment', refName: 'Pending Fulfillment' },
      entity: { id: 'cust-1', refName: 'Customer' },
      item: {
        items: [
          {
            item: { id: 'sku-1', refName: 'SKU-1' },
            quantity: 1,
            line: 1,
          },
        ],
      },
    };

    jest.spyOn(client, 'getSalesOrders').mockResolvedValue({
      links: [],
      count: 1,
      hasMore: false,
      items: [pendingNotReadySalesOrder as any],
      offset: 0,
      totalResults: 1,
    });
    jest.spyOn(client, 'getSalesOrder').mockResolvedValue(pendingNotReadySalesOrder);
    jest.spyOn(client, 'getItemFulfillments').mockResolvedValue({
      links: [],
      count: 0,
      hasMore: false,
      items: [],
      offset: 0,
      totalResults: 0,
    });
    jest.spyOn(client, 'getItemFulfillmentsBySalesOrder').mockResolvedValue([]);

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'full' });

    expect(result.cleaned).toBe(1);
    expect(client.getSalesOrders).toHaveBeenCalledWith({
      status: '_pendingFulfillment',
    });
    expect((service as any).markOrderSynced).toHaveBeenCalledWith('SO67672', expect.any(Date));
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'CANCELLED'::order_status"),
      ['SO67672']
    );
  });

  it('moves pending orders to picked when a targeted NetSuite fulfillment is found', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PENDING', 'PICKING')")) {
        return {
          rows: [
            {
              order_id: 'SO68381',
              status: 'PENDING',
              netsuite_so_internal_id: '1599718',
              netsuite_so_tran_id: 'SO68381',
            },
          ],
          rowCount: 1,
        };
      }

      return { rows: [], rowCount: 0 };
    });

    jest.spyOn(client, 'getItemFulfillments').mockResolvedValue({
      links: [],
      count: 0,
      hasMore: false,
      items: [],
      offset: 0,
      totalResults: 0,
    });
    jest.spyOn(client, 'getItemFulfillmentsBySalesOrder').mockResolvedValue([
      {
        id: '1602045',
        tranId: 'IF73531',
        shipStatus: '_picked',
        createdFrom: { id: '1599718', refName: 'SO68381' },
      },
    ]);

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'incremental' });

    expect(result.updated).toBe(1);
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO68381', 'PICKED', {
      ifInternalId: '1602045',
      ifTranId: 'IF73531',
      items: [],
    });
  });

  it('continues full discovery when one sales order detail fetch fails', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockResolvedValue({ rows: [], rowCount: 0 });
    jest.spyOn(service as any, 'createWMSOrder').mockResolvedValue({ orderId: 'SO70002' });

    jest.spyOn(client, 'getSalesOrders').mockResolvedValue({
      links: [],
      count: 2,
      hasMore: false,
      items: [
        baseSalesOrder({ id: '1700002', tranId: 'SO70002' }) as any,
        baseSalesOrder({ id: '1700003', tranId: 'SO70003' }) as any,
      ],
      offset: 0,
      totalResults: 2,
    });

    jest.spyOn(client, 'getSalesOrder').mockImplementation(async (id: string) => {
      if (id === '1700003') {
        throw new Error('SuiteTalk concurrent request limit exceeded. Request blocked.');
      }

      return baseSalesOrder({ id: '1700002', tranId: 'SO70002' });
    });

    jest.spyOn(client, 'getItemFulfillments').mockResolvedValue({
      links: [],
      count: 0,
      hasMore: false,
      items: [],
      offset: 0,
      totalResults: 0,
    });
    jest.spyOn(client, 'getItemFulfillmentsBySalesOrder').mockResolvedValue([]);

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'full' });

    expect(result.succeeded).toBe(1);
    expect(result.failed).toBe(0);
    expect(client.getSalesOrder).toHaveBeenCalledTimes(2);
    expect((service as any).createWMSOrder).toHaveBeenCalledWith(
      expect.objectContaining({ tranId: 'SO70002' }),
      '1700002',
      'PENDING',
      expect.any(Date),
      null
    );
  });

  it('reverts shipped orders to pending when the sales order is still pending fulfillment without a fulfillment', async () => {
    const { service } = createService();
    const queryMock = jest.spyOn(service as any, 'query').mockResolvedValue({ rows: [], rowCount: 0 });

    jest
      .spyOn(service as any, 'findOrderByNetSuiteSoId')
      .mockResolvedValue({ orderId: 'SO68381', status: 'SHIPPED', netsuiteIfInternalId: '1602045' });
    jest.spyOn(service as any, 'findOrderByExternalIdFull').mockResolvedValue(null);

    const salesOrder = baseSalesOrder();

    const result = await (service as any).upsertFromSalesOrder(
      salesOrder,
      new Map(),
      new Date('2026-03-13T00:00:00.000Z'),
      {}
    );

    expect(result).toEqual(
      expect.objectContaining({
        created: false,
        updated: true,
        skipped: false,
        tranId: 'SO68381',
      })
    );
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'PENDING'::order_status"),
      ['SO68381']
    );
    expect((service as any).markOrderSynced).toHaveBeenCalledWith('SO68381', expect.any(Date));
  });

  it('updates an existing fulfillment-backed order without fetching the parent sales order', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'findOrderByNetSuiteSoId').mockResolvedValue({
      orderId: 'SO70010',
      status: 'PENDING',
      netsuiteIfInternalId: null,
    });
    jest.spyOn(service as any, 'findOrderByNetSuiteIfId').mockResolvedValue(null);
    jest.spyOn(service as any, 'findOrderByExternalIdFull').mockResolvedValue(null);

    const getSalesOrderSpy = jest.spyOn(client, 'getSalesOrder');

    const result = await (service as any).upsertFromFulfillment(
      {
        id: '1702001',
        tranId: 'IF90010',
        shipStatus: '_picked',
        createdFrom: { id: '1701001', refName: 'Sales Order #SO70010' },
      },
      new Date('2026-03-13T00:00:00.000Z'),
      {}
    );

    expect(result).toEqual(
      expect.objectContaining({
        created: false,
        updated: true,
        skipped: false,
        tranId: 'IF90010',
      })
    );
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO70010', 'PICKED', {
      ifInternalId: '1702001',
      ifTranId: 'IF90010',
    });
    expect(getSalesOrderSpy).not.toHaveBeenCalled();
  });

  it('caches order lookups by NetSuite sales order id within a sync cycle', async () => {
    const { service } = createService();
    const queryMock = jest.spyOn(service as any, 'query').mockResolvedValue({
      rows: [{ order_id: 'SO70011', status: 'PENDING', netsuite_if_internal_id: null }],
      rowCount: 1,
    });

    const first = await (service as any).findOrderByNetSuiteSoId('1700011');
    const second = await (service as any).findOrderByNetSuiteSoId('1700011');

    expect(first).toEqual({
      orderId: 'SO70011',
      status: 'PENDING',
      netsuiteIfInternalId: null,
    });
    expect(second).toEqual(first);
    expect(queryMock).toHaveBeenCalledTimes(1);
  });

  it('moves pending orders to shipped when a targeted shipped fulfillment is found', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PENDING', 'PICKING')")) {
        return {
          rows: [
            {
              order_id: 'SO70001',
              status: 'PENDING',
              netsuite_so_internal_id: '1700001',
              netsuite_so_tran_id: 'SO70001',
            },
          ],
          rowCount: 1,
        };
      }

      return { rows: [], rowCount: 0 };
    });

    jest.spyOn(client, 'getItemFulfillments').mockResolvedValue({
      links: [],
      count: 0,
      hasMore: false,
      items: [],
      offset: 0,
      totalResults: 0,
    });
    jest.spyOn(client, 'getItemFulfillmentsBySalesOrder').mockResolvedValue([
      {
        id: '1701001',
        tranId: 'IF90001',
        shipStatus: '_shipped',
        createdFrom: { id: '1700001', refName: 'SO70001' },
      },
    ]);

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'incremental' });

    expect(result.updated).toBe(1);
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO70001', 'SHIPPED', {
      ifInternalId: '1701001',
      ifTranId: 'IF90001',
      items: [],
    });
  });

  it('moves pending orders to packed when a targeted packed fulfillment is found', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PENDING', 'PICKING')")) {
        return {
          rows: [
            {
              order_id: 'SO70004',
              status: 'PENDING',
              netsuite_so_internal_id: '1700004',
              netsuite_so_tran_id: 'SO70004',
            },
          ],
          rowCount: 1,
        };
      }

      return { rows: [], rowCount: 0 };
    });

    jest.spyOn(client, 'getItemFulfillments').mockResolvedValue({
      links: [],
      count: 0,
      hasMore: false,
      items: [],
      offset: 0,
      totalResults: 0,
    });
    jest.spyOn(client, 'getItemFulfillmentsBySalesOrder').mockResolvedValue([
      {
        id: '1701004',
        tranId: 'IF90004',
        shipStatus: '_packed',
        createdFrom: { id: '1700004', refName: 'SO70004' },
      },
    ]);

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'incremental' });

    expect(result.updated).toBe(1);
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO70004', 'PACKED', {
      ifInternalId: '1701004',
      ifTranId: 'IF90004',
      items: [],
    });
  });

  it('uses fulfilled quantity fallback when sales-order detail shows fulfillment but targeted fulfillment search is empty', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PENDING', 'PICKING')")) {
        return {
          rows: [
            {
              order_id: 'SO70002',
              status: 'PENDING',
              netsuite_so_internal_id: '1700002',
              netsuite_so_tran_id: 'SO70002',
            },
          ],
          rowCount: 1,
        };
      }

      return { rows: [], rowCount: 0 };
    });

    jest.spyOn(client, 'getItemFulfillments').mockResolvedValue({
      links: [],
      count: 0,
      hasMore: false,
      items: [],
      offset: 0,
      totalResults: 0,
    });
    jest.spyOn(client, 'getItemFulfillmentsBySalesOrder').mockResolvedValue([]);
    jest.spyOn(client, 'getSalesOrder').mockResolvedValue(
      baseSalesOrder({
        id: '1700002',
        tranId: 'SO70002',
        item: {
          items: [
            {
              item: { id: 'sku-1', refName: 'SKU-1' },
              quantity: 1,
              quantityFulfilled: 1,
              line: 1,
            },
          ],
        },
      })
    );

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'incremental' });

    expect(result.updated).toBe(1);
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO70002', 'PICKED');
  });

  it('updates an existing pending order to packed when sales-order upsert sees a packed fulfillment', async () => {
    const { service } = createService();

    jest
      .spyOn(service as any, 'findOrderByNetSuiteSoId')
      .mockResolvedValue({ orderId: 'SO70003', status: 'PENDING', netsuiteIfInternalId: null });
    jest.spyOn(service as any, 'findOrderByExternalIdFull').mockResolvedValue(null);
    jest.spyOn(service as any, 'query').mockResolvedValue({ rows: [], rowCount: 0 });

    const result = await (service as any).upsertFromSalesOrder(
      baseSalesOrder({ id: '1700003', tranId: 'SO70003' }),
      new Map([
        [
          '1700003',
          [
            {
              id: '1701003',
              tranId: 'IF90003',
              shipStatus: '_packed',
            },
          ],
        ],
      ]),
      new Date('2026-03-13T00:00:00.000Z'),
      {}
    );

    expect(result).toEqual(
      expect.objectContaining({
        created: false,
        updated: true,
        skipped: false,
        tranId: 'SO70003',
      })
    );
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO70003', 'PACKED', {
      ifInternalId: '1701003',
      ifTranId: 'IF90003',
    });
  });

  it(
    'moves picking orders directly to packed when NetSuite fulfillment is already packed',
    async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PENDING', 'PICKING')")) {
        return {
          rows: [
            {
              order_id: 'SO70005',
              status: 'PICKING',
              netsuite_so_internal_id: '1700005',
              netsuite_so_tran_id: 'SO70005',
            },
          ],
          rowCount: 1,
        };
      }

      return { rows: [], rowCount: 0 };
    });

    jest.spyOn(client, 'getItemFulfillments').mockResolvedValue({
      links: [],
      count: 1,
      hasMore: false,
      items: [
        {
          id: '1701005',
          tranId: 'IF90005',
          shipStatus: '_packed',
          createdFrom: { id: '1700005', refName: 'SO70005' },
          item: { items: [] },
        },
      ],
      offset: 0,
      totalResults: 1,
    });
    jest.spyOn(client, 'getItemFulfillmentsBySalesOrder').mockResolvedValue([]);

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'incremental' });

    expect(result.updated).toBe(1);
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO70005', 'PACKED', {
      ifInternalId: '1701005',
      ifTranId: 'IF90005',
      items: [],
    });
    },
    15000
  );

  it('chooses the most advanced fulfillment instead of the last one for pending orders', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PENDING', 'PICKING')")) {
        return {
          rows: [
            {
              order_id: 'SO70006',
              status: 'PENDING',
              netsuite_so_internal_id: '1700006',
              netsuite_so_tran_id: 'SO70006',
            },
          ],
          rowCount: 1,
        };
      }

      return { rows: [], rowCount: 0 };
    });

    jest.spyOn(client, 'getItemFulfillments').mockResolvedValue({
      links: [],
      count: 0,
      hasMore: false,
      items: [],
      offset: 0,
      totalResults: 0,
    });
    jest.spyOn(client, 'getItemFulfillmentsBySalesOrder').mockResolvedValue([
      {
        id: '1701006A',
        tranId: 'IF90006A',
        shipStatus: '_shipped',
        createdFrom: { id: '1700006', refName: 'SO70006' },
      },
      {
        id: '1701006B',
        tranId: 'IF90006B',
        shipStatus: '_picked',
        createdFrom: { id: '1700006', refName: 'SO70006' },
      },
    ]);

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'incremental' });

    expect(result.updated).toBe(1);
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO70006', 'SHIPPED', {
      ifInternalId: '1701006A',
      ifTranId: 'IF90006A',
      items: [],
    });
  });
});
