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

jest.setTimeout(15000);

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
    jest.resetAllMocks();
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

  it('cancels active picking orders using their current status instead of a hard-coded pending filter', async () => {
    const { service } = createService();
    const queryMock = jest.spyOn(service as any, 'query').mockResolvedValue({
      rows: [{ order_id: 'SO67672' }],
      rowCount: 1,
    });

    const cancelled = await (service as any).cancelOrderIfCurrentStatus('SO67672', 'PICKING');

    expect(cancelled).toBe(true);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'CANCELLED'::order_status"),
      ['SO67672', 'PICKING']
    );
  });

  it('moves pending orders to picked when a targeted NetSuite fulfillment is found', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PENDING', 'PICKING', 'SHIPPED')")) {
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

  it('keeps ready-to-ship orders in sync when the pending-fulfillment summary omits readyToShip', async () => {
    const { client, service } = createService();
    jest.spyOn(service as any, 'query').mockResolvedValue({ rows: [], rowCount: 0 });
    jest.spyOn(service as any, 'findOrderByNetSuiteSoId').mockResolvedValue({
      orderId: 'SO68563',
      status: 'CANCELLED',
      netsuiteIfInternalId: null,
    });
    jest.spyOn(service as any, 'findOrderByExternalIdFull').mockResolvedValue(null);
    jest.spyOn(service as any, 'syncExistingOrderItemsFromSalesOrder').mockResolvedValue(undefined);

    jest.spyOn(client, 'getSalesOrders').mockResolvedValue({
      links: [],
      count: 1,
      hasMore: false,
      items: [
        baseSalesOrder({
          id: '1708563',
          tranId: 'SO68563',
          readyToShip: undefined as any,
        }) as any,
      ],
      offset: 0,
      totalResults: 1,
    });
    jest.spyOn(client, 'getSalesOrder').mockResolvedValue(
      baseSalesOrder({
        id: '1708563',
        tranId: 'SO68563',
        readyToShip: true,
      })
    );
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

    expect(result.updated).toBe(1);
    expect(client.getSalesOrder).toHaveBeenCalledWith('1708563');
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO68563', 'PENDING');
    expect((service as any).markOrderSynced).toHaveBeenCalledWith('SO68563', expect.any(Date));
  });

  it('does not cancel a pending order when pending-fulfillment detail fetch fails during cleanup', async () => {
    const { client, service } = createService();
    const queryMock = jest
      .spyOn(service as any, 'query')
      .mockImplementation(async (sql: string) => {
        if (sql.includes("status IN ('PENDING', 'PICKING', 'SHIPPED')")) {
          return {
            rows: [
              {
                order_id: 'SO68563',
                status: 'PENDING',
                netsuite_so_internal_id: '1708563',
                netsuite_so_tran_id: 'SO68563',
              },
            ],
            rowCount: 1,
          };
        }

        return { rows: [], rowCount: 0 };
      });

    jest.spyOn(client, 'getSalesOrders').mockResolvedValue({
      links: [],
      count: 1,
      hasMore: false,
      items: [
        baseSalesOrder({ id: '1708563', tranId: 'SO68563', readyToShip: undefined as any }) as any,
      ],
      offset: 0,
      totalResults: 1,
    });
    jest
      .spyOn(client, 'getSalesOrder')
      .mockRejectedValue(
        new Error('SuiteTalk concurrent request limit exceeded. Request blocked.')
      );
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

    expect(result.cleaned).toBe(0);
    expect((service as any).markOrderSynced).toHaveBeenCalledWith('SO68563', expect.any(Date));
    expect(queryMock).not.toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'CANCELLED'::order_status"),
      ['SO68563']
    );
  });

  it('keeps stale pending orders when NetSuite still shows them as pending fulfillment', async () => {
    const client = new NetSuiteClient(credentials);
    const service = new NetSuiteOrderSyncService(client);
    const queryMock = jest
      .spyOn(service as any, 'query')
      .mockImplementation(async (sql: string) => {
        if (sql.includes("status IN ('PENDING', 'PICKING', 'PICKED', 'PACKING')")) {
          return {
            rows: [
              {
                order_id: 'SO68561',
                status: 'PENDING',
                netsuite_so_internal_id: '1605076',
                netsuite_so_tran_id: 'SO68561',
                netsuite_last_synced_at: '2026-03-14T23:31:53.560Z',
              },
            ],
            rowCount: 1,
          };
        }

        return { rows: [], rowCount: 0 };
      });

    jest.spyOn(service as any, 'getSalesOrderCached').mockResolvedValue(
      baseSalesOrder({
        id: '1605076',
        tranId: 'SO68561',
        readyToShip: true,
        status: { id: '_pendingFulfillment', refName: 'Pending Fulfillment' },
      })
    );

    const cleaned = await (service as any).cleanupStaleOrders(new Date('2026-03-14T23:34:42.000Z'));

    expect(cleaned).toBe(0);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining(
        'UPDATE orders SET netsuite_last_synced_at = NOW(), updated_at = NOW()'
      ),
      ['SO68561']
    );
    expect(queryMock).not.toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'CANCELLED'::order_status"),
      ['SO68561']
    );
  });

  it('does not reopen shipped orders when the sales order is still pending fulfillment without a fulfillment', async () => {
    const { service } = createService();

    jest.spyOn(service as any, 'findOrderByNetSuiteSoId').mockResolvedValue({
      orderId: 'SO68381',
      status: 'SHIPPED',
      netsuiteIfInternalId: '1602045',
    });
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
        updated: false,
        skipped: true,
        tranId: 'SO68381',
      })
    );
    expect((service as any).updateOrderStatus).not.toHaveBeenCalledWith('SO68381', 'PENDING');
    expect((service as any).markOrderSynced).toHaveBeenCalledWith('SO68381', expect.any(Date));
  });

  it('moves shipped orders back to pending during sync when NetSuite returns the sales order to ready-to-ship without a fulfillment', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PENDING', 'PICKING', 'SHIPPED')")) {
        return {
          rows: [
            {
              order_id: 'SO68563',
              status: 'SHIPPED',
              netsuite_so_internal_id: '1708563',
              netsuite_so_tran_id: 'SO68563',
            },
          ],
          rowCount: 1,
        };
      }

      return { rows: [], rowCount: 0 };
    });

    jest.spyOn(client, 'getSalesOrders').mockResolvedValue({
      links: [],
      count: 1,
      hasMore: false,
      items: [baseSalesOrder({ id: '1708563', tranId: 'SO68563' }) as any],
      offset: 0,
      totalResults: 1,
    });
    jest
      .spyOn(client, 'getSalesOrder')
      .mockResolvedValue(baseSalesOrder({ id: '1708563', tranId: 'SO68563' }));
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

    expect(result.updated).toBe(1);
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO68563', 'PENDING');
    expect((service as any).markOrderSynced).toHaveBeenCalledWith('SO68563', expect.any(Date));
  });

  it('reopens cancelled orders to pending when NetSuite returns the sales order to ready-to-ship without a fulfillment', async () => {
    const { service } = createService();

    jest.spyOn(service as any, 'findOrderByNetSuiteSoId').mockResolvedValue({
      orderId: 'SO68563',
      status: 'CANCELLED',
      netsuiteIfInternalId: null,
    });
    jest.spyOn(service as any, 'findOrderByExternalIdFull').mockResolvedValue(null);
    jest.spyOn(service as any, 'syncExistingOrderItemsFromSalesOrder').mockResolvedValue(undefined);

    const result = await (service as any).upsertFromSalesOrder(
      baseSalesOrder({ id: '1708563', tranId: 'SO68563' }),
      new Map(),
      new Date('2026-03-14T00:00:00.000Z'),
      {}
    );

    expect(result).toEqual(
      expect.objectContaining({
        created: false,
        updated: true,
        skipped: false,
        tranId: 'SO68563',
      })
    );
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO68563', 'PENDING');
    expect((service as any).markOrderSynced).toHaveBeenCalledWith('SO68563', expect.any(Date));
  });

  it('updates an existing fulfillment-backed order', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'findOrderByNetSuiteSoId').mockResolvedValue({
      orderId: 'SO70010',
      status: 'PENDING',
      netsuiteIfInternalId: null,
    });
    jest.spyOn(service as any, 'findOrderByNetSuiteIfId').mockResolvedValue(null);
    jest.spyOn(service as any, 'findOrderByExternalIdFull').mockResolvedValue(null);

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
  });

  it('downgrades a packed order back to picked when NetSuite fulfillment is recreated as picked', async () => {
    const { service } = createService();

    jest.spyOn(service as any, 'findOrderByNetSuiteSoId').mockResolvedValue({
      orderId: 'SO70010',
      status: 'PACKED',
      netsuiteIfInternalId: '1702999',
    });
    jest.spyOn(service as any, 'findOrderByNetSuiteIfId').mockResolvedValue(null);
    jest.spyOn(service as any, 'findOrderByExternalIdFull').mockResolvedValue(null);

    const result = await (service as any).upsertFromFulfillment(
      {
        id: '1702002',
        tranId: 'IF90011',
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
        tranId: 'IF90011',
      })
    );
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO70010', 'PICKED', {
      ifInternalId: '1702002',
      ifTranId: 'IF90011',
    });
  });

  it('resets packing verification when moving an order back to picked', async () => {
    const client = new NetSuiteClient(credentials);
    const service = new NetSuiteOrderSyncService(client);
    const queryMock = jest
      .spyOn(service as any, 'query')
      .mockResolvedValue({ rows: [], rowCount: 0 });

    await (service as any).updateOrderStatus('SO70012', 'PICKED', {
      ifInternalId: '1702012',
      ifTranId: 'IF90012',
      items: [
        {
          item: { refName: 'SKU-1' },
          quantity: 1,
        },
      ],
    });

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'PICKED'::order_status"),
      ['SO70012']
    );
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('SET verified_quantity = 0'), [
      'SO70012',
    ]);
    expect(queryMock).not.toHaveBeenCalledWith(
      expect.stringContaining('SET verified_quantity = $1'),
      expect.arrayContaining([1, 'SO70012', 'SKU-1'])
    );
  });

  it('clears stale ownership when moving an order back to pending', async () => {
    const client = new NetSuiteClient(credentials);
    const service = new NetSuiteOrderSyncService(client);
    const queryMock = jest
      .spyOn(service as any, 'query')
      .mockResolvedValue({ rows: [], rowCount: 0 });

    await (service as any).updateOrderStatus('SO70014', 'PENDING');

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("SET status = 'PENDING'::order_status"),
      ['SO70014']
    );
    const updateSql = String(queryMock.mock.calls[0][0]);
    expect(updateSql).toContain('picker_id = NULL');
    expect(updateSql).toContain('packer_id = NULL');
    expect(updateSql).toContain('claimed_at = NULL');
    expect(updateSql).toContain('picked_at = NULL');
    expect(updateSql).toContain('cancelled_at = NULL');
    expect(updateSql).toContain('tracking_number = NULL');
    expect(updateSql).toContain('progress = 0');
    expect(updateSql).toContain('netsuite_if_internal_id = NULL');
    expect(updateSql).toContain('netsuite_if_tran_id = NULL');
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('SET picked_quantity = 0'), [
      'SO70014',
    ]);
    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining("status = 'PENDING'::order_item_status"),
      ['SO70014']
    );
  });

  it('moves a packing queue order back to picked when the linked fulfillment is only picked', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PICKED', 'PACKING', 'PACKED')")) {
        return {
          rows: [
            {
              order_id: 'SO70013',
              status: 'PACKING',
              netsuite_so_internal_id: '1700013',
              netsuite_so_tran_id: 'SO70013',
              netsuite_if_internal_id: '1702013',
              netsuite_if_tran_id: 'IF90013',
              netsuite_last_synced_at: '2026-03-13T00:00:00.000Z',
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
          id: '1702013',
          tranId: 'IF90013',
          shipStatus: '_picked',
          createdFrom: { id: '1700013', refName: 'SO70013' },
        },
      ],
      offset: 0,
      totalResults: 1,
    });
    jest.spyOn(client, 'getItemFulfillment').mockResolvedValue({
      id: '1702013',
      tranId: 'IF90013',
      shipStatus: '_picked',
      createdFrom: { id: '1700013', refName: 'SO70013' },
      item: { items: [] },
    });
    jest.spyOn(client, 'getItemFulfillmentsBySalesOrder').mockResolvedValue([]);

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'incremental' });

    expect(result.updated).toBe(0);
    expect((service as any).updateOrderStatus).not.toHaveBeenCalledWith(
      'SO70013',
      'PICKED',
      expect.anything()
    );
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
      if (sql.includes("status IN ('PENDING', 'PICKING', 'SHIPPED')")) {
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

  it('moves shipped orders back to pending when NetSuite says the sales order is ready to ship again with no fulfillment', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PENDING', 'PICKING', 'SHIPPED')")) {
        return {
          rows: [
            {
              order_id: 'SO70001B',
              status: 'SHIPPED',
              netsuite_so_internal_id: '1700001B',
              netsuite_so_tran_id: 'SO70001B',
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
    jest.spyOn(client, 'getSalesOrders').mockResolvedValue({
      links: [],
      count: 1,
      hasMore: false,
      items: [baseSalesOrder({ id: '1700001B', tranId: 'SO70001B' }) as any],
      offset: 0,
      totalResults: 1,
    });
    jest
      .spyOn(client, 'getSalesOrder')
      .mockResolvedValue(baseSalesOrder({ id: '1700001B', tranId: 'SO70001B' }));
    jest.spyOn(client, 'getItemFulfillmentsBySalesOrder').mockResolvedValue([]);

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'full' });

    expect(result.updated).toBe(1);
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO70001B', 'PENDING');
  });

  it('moves pending orders to packed when a targeted packed fulfillment is found', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PENDING', 'PICKING', 'SHIPPED')")) {
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
      if (sql.includes("status IN ('PENDING', 'PICKING', 'SHIPPED')")) {
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

  it('refreshes existing order items with NetSuite available quantity and catalog metadata', async () => {
    const { service } = createService();
    const queryMock = jest
      .spyOn(service as any, 'query')
      .mockImplementation(async (sql: string) => {
        if (sql.includes('SELECT bin_locations[1] as bin_location FROM skus')) {
          return { rows: [{ bin_location: 'I1A' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      });

    jest
      .spyOn(service as any, 'findOrderByNetSuiteSoId')
      .mockResolvedValue({ orderId: 'SO68539', status: 'PICKING', netsuiteIfInternalId: null });
    jest.spyOn(service as any, 'findOrderByExternalIdFull').mockResolvedValue(null);
    jest.spyOn(service as any, 'findSkuByNetSuiteItem').mockResolvedValue('INFINITY GARAGE');
    jest.spyOn(service as any, 'getItemDetails').mockResolvedValue({
      itemId: 'INFINITY GARAGE',
      displayName: 'INFINITY GARAGE',
      upcCode: '9421036673999',
      binNumber: 'I1A',
    });

    await (service as any).upsertFromSalesOrder(
      baseSalesOrder({
        id: '1604613',
        tranId: 'SO68539',
        item: {
          items: [
            {
              item: { id: '3223', refName: 'INFINITY GARAGE' },
              quantity: 1,
              quantityCommitted: 1,
              quantityAvailable: 251,
              line: 1,
            },
          ],
        },
      }),
      new Map(),
      new Date('2026-03-13T00:00:00.000Z'),
      {}
    );

    expect(queryMock).toHaveBeenCalledWith(
      expect.stringContaining('netsuite_available_quantity = $2'),
      ['INFINITY GARAGE', 251, 'I1A', 'SO68539', 'INFINITY GARAGE']
    );
    expect(queryMock).toHaveBeenCalledWith(expect.stringContaining('UPDATE pick_tasks'), [
      'INFINITY GARAGE',
      'I1A',
      'SO68539',
      'INFINITY GARAGE',
    ]);
  });

  it('moves picking orders directly to packed when NetSuite fulfillment is already packed', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PENDING', 'PICKING', 'SHIPPED')")) {
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
  }, 15000);

  it('does not downgrade active packing orders back to picked when NetSuite fulfillment is only picked', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PICKED', 'PACKING', 'PACKED')")) {
        return {
          rows: [
            {
              order_id: 'SO70005B',
              status: 'PACKING',
              netsuite_so_internal_id: '1700005B',
              netsuite_so_tran_id: 'SO70005B',
              netsuite_if_internal_id: '1701005B',
              hours_since_update: '0',
              hours_since_created: '1',
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
    jest.spyOn(client, 'getItemFulfillment').mockResolvedValue({
      id: '1701005B',
      tranId: 'IF90005B',
      shipStatus: '_picked',
      createdFrom: { id: '1700005B', refName: 'SO70005B' },
      item: { items: [] },
    });

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'incremental' });

    expect(result.updated).toBe(0);
    expect((service as any).updateOrderStatus).not.toHaveBeenCalledWith(
      'SO70005B',
      'PICKED',
      expect.anything()
    );
  }, 15000);

  it('chooses the most advanced fulfillment instead of the last one for pending orders', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PENDING', 'PICKING', 'SHIPPED')")) {
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

  it('loads a linked packing fulfillment directly when fulfillment searches miss it', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PICKED', 'PACKING', 'PACKED')")) {
        return {
          rows: [
            {
              order_id: 'SO70007',
              status: 'PICKED',
              netsuite_so_internal_id: '1700007',
              netsuite_so_tran_id: 'SO70007',
              netsuite_if_internal_id: '1701007',
              hours_since_update: '0',
              hours_since_created: '1',
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
    jest.spyOn(client, 'getItemFulfillment').mockResolvedValue({
      id: '1701007',
      tranId: 'IF90007',
      shipStatus: '_packed',
      createdFrom: { id: '1700007', refName: 'SO70007' },
      item: { items: [] },
    } as any);

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'incremental' });

    expect(result.updated).toBe(1);
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO70007', 'PACKED', {
      ifInternalId: '1701007',
      ifTranId: 'IF90007',
      items: [],
    });
  });

  it('moves packing queue orders to packed when the linked fulfillment is gone but NetSuite no longer shows ready to ship', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PICKED', 'PACKING', 'PACKED')")) {
        return {
          rows: [
            {
              order_id: 'SO70008',
              status: 'PICKED',
              netsuite_so_internal_id: '1700008',
              netsuite_so_tran_id: 'SO70008',
              netsuite_if_internal_id: '1701008',
              hours_since_update: '0',
              hours_since_created: '1',
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
    jest
      .spyOn(client, 'getItemFulfillment')
      .mockRejectedValue(
        new Error('Failed to fetch item fulfillment 1701008: That record does not exist.')
      );
    jest.spyOn(client, 'getSalesOrder').mockResolvedValue(
      baseSalesOrder({
        id: '1700008',
        tranId: 'SO70008',
        readyToShip: false,
        status: { id: '_pendingFulfillment', refName: 'Pending Fulfillment' },
      })
    );

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'incremental' });

    expect(result.updated).toBe(1);
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO70008', 'PACKED');
  });

  it('restores ready to ship and moves orders back to pending when the linked fulfillment was deleted', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PICKED', 'PACKING', 'PACKED')")) {
        return {
          rows: [
            {
              order_id: 'SO70008B',
              status: 'PACKED',
              netsuite_so_internal_id: '1700008B',
              netsuite_so_tran_id: 'SO70008B',
              netsuite_if_internal_id: '1701008B',
              hours_since_update: '0',
              hours_since_created: '1',
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
    jest
      .spyOn(client, 'getItemFulfillment')
      .mockRejectedValue(
        new Error('Failed to fetch item fulfillment 1701008B: That record does not exist.')
      );
    jest.spyOn(client, 'getSalesOrder').mockResolvedValue(
      baseSalesOrder({
        id: '1700008B',
        tranId: 'SO70008B',
        readyToShip: false,
        status: { id: '_pendingFulfillment', refName: 'Pending Fulfillment' },
      })
    );
    const updateSalesOrderStatus = jest
      .spyOn(client, 'updateSalesOrderStatus')
      .mockResolvedValue(undefined);

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'incremental' });

    expect(result.updated).toBe(1);
    expect(updateSalesOrderStatus).toHaveBeenCalledWith('1700008B', { custbody8: true });
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO70008B', 'PENDING');
  });

  it('moves packing queue orders to shipped when the linked fulfillment is gone and the sales order is closed', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PICKED', 'PACKING', 'PACKED')")) {
        return {
          rows: [
            {
              order_id: 'SO70009',
              status: 'PICKED',
              netsuite_so_internal_id: '1700009',
              netsuite_so_tran_id: 'SO70009',
              netsuite_if_internal_id: '1701009',
              hours_since_update: '0',
              hours_since_created: '1',
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
    jest
      .spyOn(client, 'getItemFulfillment')
      .mockRejectedValue(
        new Error('Failed to fetch item fulfillment 1701009: That record does not exist.')
      );
    jest.spyOn(client, 'getSalesOrder').mockResolvedValue(
      baseSalesOrder({
        id: '1700009',
        tranId: 'SO70009',
        readyToShip: false,
        status: { id: '_closed', refName: 'Closed' },
      })
    );

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'incremental' });

    expect(result.updated).toBe(1);
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO70009', 'SHIPPED');
  });

  it('moves packed orders back to pending when the linked fulfillment was deleted and the sales order is ready to ship again', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PICKED', 'PACKING', 'PACKED')")) {
        return {
          rows: [
            {
              order_id: 'SO70010',
              status: 'PACKED',
              netsuite_so_internal_id: '1700010',
              netsuite_so_tran_id: 'SO70010',
              netsuite_if_internal_id: '1701010',
              hours_since_update: '0',
              hours_since_created: '1',
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
    jest
      .spyOn(client, 'getItemFulfillment')
      .mockRejectedValue(
        new Error('Failed to fetch item fulfillment 1701010: That record does not exist.')
      );
    jest.spyOn(client, 'getSalesOrder').mockResolvedValue(
      baseSalesOrder({
        id: '1700010',
        tranId: 'SO70010',
        readyToShip: true,
        status: { id: '_pendingFulfillment', refName: 'Pending Fulfillment' },
      })
    );

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'incremental' });

    expect(result.updated).toBe(1);
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO70010', 'PENDING');
  });

  it('moves shipped orders back to pending during sales-order fallback when the sales order is ready to ship again', async () => {
    const { client, service } = createService();

    jest.spyOn(service as any, 'query').mockImplementation(async (sql: string) => {
      if (sql.includes("status IN ('PENDING', 'PICKING', 'SHIPPED')")) {
        return {
          rows: [
            {
              order_id: 'SO70010B',
              status: 'SHIPPED',
              netsuite_so_internal_id: '1700010B',
              netsuite_so_tran_id: 'SO70010B',
              hours_since_update: '0',
              hours_since_created: '1',
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
        id: '1700010B',
        tranId: 'SO70010B',
        readyToShip: true,
        status: { id: '_pendingFulfillment', refName: 'Pending Fulfillment' },
      })
    );

    const result = await service.syncOrders('INT-AAP-NS01', { mode: 'incremental' });

    expect(result.updated).toBe(1);
    expect((service as any).updateOrderStatus).toHaveBeenCalledWith('SO70010B', 'PENDING');
  });
});
