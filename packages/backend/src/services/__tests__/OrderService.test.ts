/**
 * Unit tests for OrderService
 * @covers src/services/OrderService.ts
 */

import { OrderService } from '../OrderService';
import {
  Order,
  OrderStatus,
  OrderPriority,
  CreateOrderDTO,
  ClaimOrderDTO,
  PickItemDTO,
  CompleteOrderDTO,
  CancelOrderDTO,
  NotFoundError,
  ConflictError,
  ValidationError,
  UserRole,
} from '@opsui/shared';

// Mock dependencies
jest.mock('../../repositories/OrderRepository');
jest.mock('../../repositories/PickTaskRepository');
jest.mock('../../repositories/InventoryRepository');
jest.mock('../../config/logger');
jest.mock('../../db/client', () => ({
  query: jest.fn(),
  getDefaultPool: jest.fn(),
}));
jest.mock('../NetSuiteClient');

// Mock validators from @opsui/shared before importing
jest.mock('@opsui/shared', () => {
  const actualModule = jest.requireActual('@opsui/shared');
  return {
    ...actualModule,
    validateOrderItems: jest.fn(),
    validatePickSKU: jest.fn(),
    validatePickQuantity: jest.fn(),
    generateOrderId: jest.fn(() => 'ORD-TEST-001'),
  };
});

const { orderRepository } = require('../../repositories/OrderRepository');
const { pickTaskRepository } = require('../../repositories/PickTaskRepository');
const { query, getDefaultPool } = require('../../db/client');
const { logger } = require('../../config/logger');
const { NetSuiteClient } = require('../NetSuiteClient');
const { validateOrderItems, validatePickSKU, validatePickQuantity } = require('@opsui/shared');

describe('OrderService', () => {
  let orderService: OrderService;

  const mockOrder: Order = {
    orderId: 'ORD-TEST-001',
    customerId: 'customer-123',
    customerName: 'Test Customer',
    status: OrderStatus.PENDING,
    priority: OrderPriority.NORMAL,
    pickerId: null,
    packerId: null,
    items: [],
    progress: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    claimedAt: null,
    pickedAt: null,
    packedAt: null,
    shippedAt: null,
  };

  const mockPickTask = {
    pickTaskId: 'pt-001',
    orderId: 'ORD-TEST-001',
    orderItemId: 'oi-001',
    sku: 'SKU-001',
    name: 'Test Product',
    targetBin: 'A-01-01',
    quantity: 10,
    pickedQuantity: 0,
    status: 'PENDING',
  };

  beforeEach(() => {
    jest.resetAllMocks();
    orderService = new OrderService();

    // Default mock implementations
    query.mockResolvedValue({ rows: [], rowCount: 0 });
    getDefaultPool.mockReturnValue({
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
    });
    orderRepository.withTransaction = jest.fn(callback =>
      callback({
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      })
    );
    orderRepository.getOrderWithItems.mockResolvedValue({ ...mockOrder });
    orderRepository.updateStatus.mockResolvedValue({ ...mockOrder });
    orderRepository.update.mockResolvedValue(undefined);
    orderRepository.cancelOrder.mockResolvedValue({ ...mockOrder });
  });

  afterEach(() => {});

  // ==========================================================================
  // CREATE ORDER TESTS
  // ==========================================================================

  describe('createOrder', () => {
    const validOrderDTO: CreateOrderDTO = {
      customerId: 'customer-123',
      customerName: 'Test Customer',
      priority: OrderPriority.NORMAL,
      items: [
        { sku: 'SKU-001', quantity: 10 },
        { sku: 'SKU-002', quantity: 5 },
      ],
    };

    it('should create order with valid data', async () => {
      validateOrderItems.mockImplementation(() => {});
      orderRepository.createOrderWithItems.mockResolvedValue(mockOrder);

      const result = await orderService.createOrder(validOrderDTO);

      expect(result).toEqual(mockOrder);
      expect(validateOrderItems).toHaveBeenCalledWith(validOrderDTO.items);
      expect(orderRepository.createOrderWithItems).toHaveBeenCalledWith(validOrderDTO);
      expect(logger.info).toHaveBeenCalledWith('Creating order', {
        customerId: validOrderDTO.customerId,
        itemCount: 2,
      });
    });

    it('should throw ValidationError for invalid items', async () => {
      validateOrderItems.mockImplementation(() => {
        throw new ValidationError('Invalid order items');
      });

      await expect(orderService.createOrder(validOrderDTO)).rejects.toThrow(ValidationError);
    });
  });

  // ==========================================================================
  // PICK ITEM TESTS
  // ==========================================================================

  describe('pickItem', () => {
    const pickDTO: PickItemDTO = {
      pickTaskId: 'pt-001',
      sku: 'SKU-001',
      quantity: 5,
      binLocation: 'A-01-01',
    };

    it('should successfully pick item', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation((sql, params) => {
          if (sql.includes('SELECT * FROM orders')) {
            // Direct database query returns snake_case
            return {
              rows: [{ ...mockOrder, status: OrderStatus.PICKING, picker_id: 'picker-123' }],
            };
          }
          if (sql.includes('SELECT * FROM pick_tasks')) {
            // Direct database query returns snake_case
            return {
              rows: [
                {
                  ...mockPickTask,
                  order_id: 'ORD-TEST-001',
                  target_bin: 'A-01-01',
                  quantity: 10,
                  picked_quantity: 0,
                },
              ],
            };
          }
          if (sql.includes('SELECT sku FROM skus WHERE barcode')) {
            return { rows: [] };
          }
          return { rows: [], rowCount: 1 };
        }),
      };

      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));
      orderRepository.getOrderWithItems.mockResolvedValue(mockOrder);
      validatePickSKU.mockImplementation(() => {});
      validatePickQuantity.mockImplementation(() => {});

      const result = await orderService.pickItem('ORD-TEST-001', pickDTO, 'picker-123');

      expect(result.success).toBe(true);
      expect(result.order).toBeDefined();
      expect(validatePickSKU).toHaveBeenCalled();
      expect(validatePickQuantity).toHaveBeenCalled();
    });

    it('should throw NotFoundError when order not found', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({ rows: [] }),
      };
      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));

      await expect(
        orderService.pickItem('non-existent-order', pickDTO, 'picker-123')
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ValidationError when order not in PICKING status', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [{ ...mockOrder, status: OrderStatus.PENDING }],
        }),
      };
      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));

      await expect(orderService.pickItem('ORD-TEST-001', pickDTO, 'picker-123')).rejects.toThrow(
        ValidationError
      );
    });

    it('should throw ValidationError when picker does not match', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [{ ...mockOrder, status: OrderStatus.PICKING, picker_id: 'other-picker' }],
        }),
      };
      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));

      await expect(orderService.pickItem('ORD-TEST-001', pickDTO, 'picker-123')).rejects.toThrow(
        ValidationError
      );
    });

    it('should resolve barcode to SKU', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation((sql, params) => {
          if (sql.includes('SELECT sku FROM skus WHERE barcode')) {
            return { rows: [{ sku: 'ACTUAL-SKU' }] };
          }
          if (sql.includes('SELECT * FROM orders')) {
            // Direct database query returns snake_case
            return {
              rows: [{ ...mockOrder, status: OrderStatus.PICKING, picker_id: 'picker-123' }],
            };
          }
          if (sql.includes('SELECT * FROM pick_tasks')) {
            // Direct database query returns snake_case
            return {
              rows: [
                {
                  ...mockPickTask,
                  order_id: 'ORD-TEST-001',
                  sku: 'ACTUAL-SKU',
                  target_bin: 'A-01-01',
                  quantity: 10,
                  picked_quantity: 0,
                },
              ],
            };
          }
          return { rows: [], rowCount: 1 };
        }),
      };

      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));
      orderRepository.getOrderWithItems.mockResolvedValue(mockOrder);
      validatePickSKU.mockImplementation(() => {});
      validatePickQuantity.mockImplementation(() => {});

      await orderService.pickItem('ORD-TEST-001', { ...pickDTO, sku: '123456789' }, 'picker-123');

      expect(validatePickSKU).toHaveBeenCalledWith('ACTUAL-SKU', 'ACTUAL-SKU');
    });
  });

  // ==========================================================================
  // CLAIM ORDER TESTS
  // ==========================================================================

  describe('claimOrder', () => {
    it('should claim order for picker', async () => {
      const claimDTO: ClaimOrderDTO = { pickerId: 'picker-123' };
      const claimedOrder = { ...mockOrder, status: OrderStatus.PICKING, pickerId: 'picker-123' };

      orderRepository.claimOrder.mockResolvedValue(claimedOrder);

      const result = await orderService.claimOrder('ORD-TEST-001', claimDTO);

      expect(result).toEqual(claimedOrder);
      expect(orderRepository.claimOrder).toHaveBeenCalledWith('ORD-TEST-001', 'picker-123');
    });
  });

  // ==========================================================================
  // COMPLETE ORDER TESTS
  // ==========================================================================

  describe('completeOrder', () => {
    it('should complete order', async () => {
      const completeDTO: CompleteOrderDTO = {
        orderId: 'ORD-TEST-001',
        pickerId: 'picker-123',
      };
      const pickingOrder = {
        ...mockOrder,
        status: OrderStatus.PICKING,
        pickerId: 'picker-123',
      };
      const completedOrder = { ...mockOrder, status: OrderStatus.PICKED, pickerId: 'picker-123' };

      orderRepository.getOrderWithItems.mockResolvedValueOnce(pickingOrder);
      query.mockResolvedValueOnce({
        rows: [{ total_tasks: 2, incomplete_tasks: 0 }],
        rowCount: 1,
      });
      orderRepository.updateStatus.mockResolvedValue(completedOrder);

      const result = await orderService.completeOrder('ORD-TEST-001', completeDTO);

      expect(result).toEqual(completedOrder);
      expect(orderRepository.updateStatus).toHaveBeenCalledWith('ORD-TEST-001', OrderStatus.PICKED);
    });

    it('should reject completion when another picker tries to finish the order', async () => {
      orderRepository.getOrderWithItems.mockResolvedValueOnce({
        ...mockOrder,
        status: OrderStatus.PICKING,
        pickerId: 'other-picker',
      });

      await expect(
        orderService.completeOrder('ORD-TEST-001', {
          orderId: 'ORD-TEST-001',
          pickerId: 'picker-123',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should reject completion when pick tasks are still incomplete', async () => {
      orderRepository.getOrderWithItems.mockResolvedValueOnce({
        ...mockOrder,
        status: OrderStatus.PICKING,
        pickerId: 'picker-123',
      });
      query.mockResolvedValueOnce({
        rows: [{ total_tasks: 3, incomplete_tasks: 1 }],
        rowCount: 1,
      });

      await expect(
        orderService.completeOrder('ORD-TEST-001', {
          orderId: 'ORD-TEST-001',
          pickerId: 'picker-123',
        })
      ).rejects.toThrow(ValidationError);
    });

    it('should create a NetSuite fulfillment for picked lines when a partially skipped order is completed', async () => {
      const completeDTO: CompleteOrderDTO = {
        orderId: 'SO68563',
        pickerId: 'picker-123',
      };
      const pickingOrder = {
        ...mockOrder,
        orderId: 'SO68563',
        status: OrderStatus.PICKING,
        pickerId: 'picker-123',
        organizationId: 'ORG320EDF1',
        netsuiteSource: 'NETSUITE',
        netsuiteSoInternalId: '1605078',
        netsuiteSoTranId: 'SO68563',
      };
      const completedOrder = {
        ...pickingOrder,
        status: OrderStatus.PICKED,
      };
      const defaultPoolQuery = jest.fn().mockResolvedValue({
        rows: [
          {
            integration_id: 'INT-AAP-NS01',
            configuration: {
              auth: {
                accountId: 'acc',
                tokenId: 'tid',
                tokenSecret: 'tsec',
                consumerKey: 'ck',
                consumerSecret: 'cs',
              },
            },
          },
        ],
        rowCount: 1,
      });
      const getItemFulfillmentsBySalesOrder = jest.fn().mockResolvedValue([]);
      const createItemFulfillment = jest.fn().mockResolvedValue('1608001');
      const getItemFulfillment = jest.fn().mockResolvedValue({ id: '1608001', tranId: 'IF74001' });

      NetSuiteClient.mockImplementation(() => ({
        getItemFulfillmentsBySalesOrder,
        createItemFulfillment,
        getItemFulfillment,
      }));
      getDefaultPool.mockReturnValue({ query: defaultPoolQuery });

      orderRepository.getOrderWithItems.mockResolvedValueOnce(pickingOrder);
      query
        .mockResolvedValueOnce({
          rows: [{ total_tasks: 2, incomplete_tasks: 0 }],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [
            {
              organizationId: 'ORG320EDF1',
              netsuiteSoInternalId: '1605078',
              netsuiteSoTranId: 'SO68563',
              netsuiteIfInternalId: null,
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [
            {
              sku: 'EC-TOUCH W',
              name: 'Skipped line',
              quantity: 1,
              pickedQuantity: 0,
              verifiedQuantity: 0,
              status: 'PENDING',
              skip_reason: 'Backordered',
            },
            {
              sku: 'EC-KIT KP W',
              name: 'Picked line',
              quantity: 1,
              pickedQuantity: 1,
              verifiedQuantity: 0,
              status: 'FULLY_PICKED',
              skip_reason: null,
            },
          ],
          rowCount: 2,
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
        })
        .mockResolvedValueOnce({
          rows: [],
          rowCount: 1,
        });
      orderRepository.updateStatus.mockResolvedValue(completedOrder);

      const result = await orderService.completeOrder('SO68563', completeDTO);

      expect(result.status).toBe(OrderStatus.PICKED);
      expect(createItemFulfillment).toHaveBeenCalledWith('1605078', {
        lines: [{ sku: 'EC-KIT KP W', itemName: 'Picked line', quantity: 1 }],
      });
      expect(orderRepository.updateStatus).toHaveBeenCalledWith('SO68563', OrderStatus.PICKED);
    });
  });

  // ==========================================================================
  // CANCEL ORDER TESTS
  // ==========================================================================

  describe('cancelOrder', () => {
    it('should cancel order with reason', async () => {
      const cancelDTO: CancelOrderDTO = {
        orderId: 'ORD-TEST-001',
        userId: 'user-123',
        reason: 'Customer request',
      };
      const cancelledOrder = { ...mockOrder, status: OrderStatus.CANCELLED };

      orderRepository.cancelOrder.mockResolvedValue(cancelledOrder);

      const result = await orderService.cancelOrder('ORD-TEST-001', cancelDTO);

      expect(result).toEqual(cancelledOrder);
      expect(orderRepository.cancelOrder).toHaveBeenCalledWith(
        'ORD-TEST-001',
        'user-123',
        'Customer request'
      );
    });
  });

  // ==========================================================================
  // UNCLAIM ORDER TESTS
  // ==========================================================================

  describe('unclaimOrder', () => {
    it('should unclaim order and reset to PENDING', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation((sql, params) => {
          if (sql.includes('SELECT * FROM orders')) {
            return {
              rows: [
                {
                  ...mockOrder,
                  status: OrderStatus.PICKING,
                  picker_id: 'picker-123',
                },
              ],
            };
          }
          return { rows: [], rowCount: 1 };
        }),
      };

      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));
      orderRepository.getOrderWithItems.mockResolvedValue(mockOrder);

      const result = await orderService.unclaimOrder('ORD-TEST-001', 'picker-123', 'Test reason');

      expect(result).toEqual(mockOrder);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE order_items'),
        expect.arrayContaining(['ORD-TEST-001'])
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM pick_tasks'),
        expect.arrayContaining(['ORD-TEST-001'])
      );
    });

    it('should throw ValidationError when order not in PICKING status', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [{ ...mockOrder, status: OrderStatus.PENDING }],
        }),
      };

      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));

      await expect(
        orderService.unclaimOrder('ORD-TEST-001', 'picker-123', 'Test reason')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw ValidationError when picker does not match', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [{ ...mockOrder, status: OrderStatus.PICKING, picker_id: 'other-picker' }],
        }),
      };

      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));

      await expect(
        orderService.unclaimOrder('ORD-TEST-001', 'picker-123', 'Test reason')
      ).rejects.toThrow(ValidationError);
    });
  });

  // ==========================================================================
  // PACKING METHODS TESTS
  // ==========================================================================

  describe('claimOrderForPacking', () => {
    it('should claim order for packing', async () => {
      const pickedOrder = { ...mockOrder, status: OrderStatus.PICKED };
      const packingOrder = { ...mockOrder, status: OrderStatus.PACKING, packerId: 'packer-123' };

      orderRepository.getOrderWithItems.mockResolvedValue(pickedOrder);
      orderRepository.update.mockResolvedValue(undefined);
      orderRepository.getOrderWithItems
        .mockResolvedValueOnce(pickedOrder)
        .mockResolvedValueOnce(packingOrder);

      const result = await orderService.claimOrderForPacking('ORD-TEST-001', 'packer-123');

      expect(result.status).toBe(OrderStatus.PACKING);
      expect(orderRepository.update).toHaveBeenCalledWith('ORD-TEST-001', {
        status: OrderStatus.PACKING,
        packerId: 'packer-123',
      });
    });

    it('should throw ConflictError when order not in PICKED status', async () => {
      orderRepository.getOrderWithItems.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PENDING,
      });

      await expect(orderService.claimOrderForPacking('ORD-TEST-001', 'packer-123')).rejects.toThrow(
        ConflictError
      );
    });

    it('should throw ConflictError when order already claimed by another packer', async () => {
      orderRepository.getOrderWithItems.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PICKED,
        packerId: 'other-packer',
      });

      await expect(orderService.claimOrderForPacking('ORD-TEST-001', 'packer-123')).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe('completePacking', () => {
    it('should complete packing', async () => {
      const packingOrder = {
        ...mockOrder,
        status: OrderStatus.PACKING,
        packerId: 'packer-123',
      };
      const packedOrder = { ...mockOrder, status: OrderStatus.PACKED, packedAt: expect.any(Date) };

      orderRepository.getOrderWithItems
        .mockResolvedValueOnce(packingOrder)
        .mockResolvedValueOnce(packedOrder);
      query.mockResolvedValueOnce({
        rows: [{ order_item_id: 'oi-001', quantity: 2, verified_quantity: 2, skip_reason: null }],
        rowCount: 1,
      });
      orderRepository.update.mockResolvedValue(undefined);

      const result = await orderService.completePacking('ORD-TEST-001', 'packer-123');

      expect(result.status).toBe(OrderStatus.PACKED);
      expect(orderRepository.update).toHaveBeenCalledWith('ORD-TEST-001', {
        status: OrderStatus.PACKED,
        packedAt: expect.any(Date),
      });
    });

    it('should be idempotent when packing is already completed by the same packer', async () => {
      const packedOrder = {
        ...mockOrder,
        status: OrderStatus.PACKED,
        packerId: 'packer-123',
        packedAt: new Date(),
      };

      orderRepository.getOrderWithItems.mockResolvedValue(packedOrder);

      const result = await orderService.completePacking('ORD-TEST-001', 'packer-123');

      expect(result.status).toBe(OrderStatus.PACKED);
      expect(orderRepository.update).not.toHaveBeenCalled();
    });

    it('should throw ConflictError when packer does not match', async () => {
      orderRepository.getOrderWithItems.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PACKING,
        packerId: 'other-packer',
      });

      await expect(orderService.completePacking('ORD-TEST-001', 'packer-123')).rejects.toThrow(
        ConflictError
      );
    });

    it('should throw ConflictError when order not in PACKING status', async () => {
      orderRepository.getOrderWithItems.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PICKED,
        packerId: 'packer-123',
      });

      await expect(orderService.completePacking('ORD-TEST-001', 'packer-123')).rejects.toThrow(
        ConflictError
      );
    });

    it('should create NetSuite fulfillment (excluding skipped items) when completing packing of a NetSuite-backed order', async () => {
      const packingOrder = {
        ...mockOrder,
        orderId: 'SO68539',
        status: OrderStatus.PACKING,
        packerId: 'packer-123',
      };
      const packedOrder = {
        ...mockOrder,
        orderId: 'SO68539',
        status: OrderStatus.PACKED,
        packedAt: new Date(),
      };
      const defaultPoolQuery = jest.fn().mockResolvedValue({
        rows: [
          {
            integration_id: 'INT-AAP-NS01',
            configuration: {
              auth: {
                accountId: 'acc',
                tokenId: 'tid',
                tokenSecret: 'tsec',
                consumerKey: 'ck',
                consumerSecret: 'cs',
              },
            },
          },
        ],
        rowCount: 1,
      });
      const getItemFulfillment = jest.fn().mockResolvedValue({ id: '1606001', tranId: 'IF73600' });
      const createItemFulfillment = jest.fn().mockResolvedValue('1606001');
      const getItemFulfillmentsBySalesOrder = jest.fn().mockResolvedValue([]);

      NetSuiteClient.mockImplementation(() => ({
        createItemFulfillment,
        getItemFulfillment,
        getItemFulfillmentsBySalesOrder,
      }));

      getDefaultPool.mockReturnValue({ query: defaultPoolQuery });

      orderRepository.getOrderWithItems
        .mockResolvedValueOnce(packingOrder)
        .mockResolvedValueOnce(packedOrder);
      orderRepository.update.mockResolvedValue(undefined);

      query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT order_item_id, sku, quantity, verified_quantity, skip_reason')) {
          return {
            rows: [
              {
                order_item_id: 'oi-001',
                sku: 'SHIP-SKU',
                quantity: 2,
                verified_quantity: 2,
                skip_reason: null,
              },
            ],
            rowCount: 1,
          };
        }
        if (sql.includes('FROM orders o')) {
          return {
            rows: [
              {
                organizationId: 'ORG320EDF1',
                netsuiteSoInternalId: '1604613',
                netsuiteSoTranId: 'SO68539',
                netsuiteIfInternalId: null,
              },
            ],
            rowCount: 1,
          };
        }
        if (
          sql.includes(
            'SELECT sku, name, quantity, picked_quantity, verified_quantity, status, skip_reason'
          )
        ) {
          return {
            rows: [
              {
                sku: 'SHIP-SKU',
                name: 'Shipped item',
                quantity: 2,
                pickedQuantity: 2,
                verifiedQuantity: 2,
                status: 'FULLY_PICKED',
                skip_reason: null,
              },
            ],
            rowCount: 1,
          };
        }
        if (sql.includes('SELECT netsuite_if_internal_id')) {
          return { rows: [{ netsuite_if_internal_id: '1606001' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 1 };
      });

      const result = await orderService.completePacking('SO68539', 'packer-123');

      expect(getItemFulfillmentsBySalesOrder).toHaveBeenCalledWith(['1604613']);
      expect(createItemFulfillment).toHaveBeenCalledWith('1604613', {
        lines: [{ sku: 'SHIP-SKU', itemName: 'Shipped item', quantity: 2 }],
      });
      expect(getItemFulfillment).toHaveBeenCalledWith('1606001');
      expect(result.status).toBe(OrderStatus.PACKED);
    });

    it('should fail packing completion when NetSuite fulfillment creation fails for a NetSuite-backed order', async () => {
      const packingOrder = {
        ...mockOrder,
        orderId: 'SO68539',
        status: OrderStatus.PACKING,
        packerId: 'packer-123',
      };
      const defaultPoolQuery = jest.fn().mockResolvedValue({
        rows: [
          {
            integration_id: 'INT-AAP-NS01',
            configuration: {
              auth: {
                accountId: 'acc',
                tokenId: 'tid',
                tokenSecret: 'tsec',
                consumerKey: 'ck',
                consumerSecret: 'cs',
              },
            },
          },
        ],
        rowCount: 1,
      });
      const createItemFulfillment = jest
        .fn()
        .mockRejectedValue(new Error('Failed to create item fulfillment for SO 1604613: blocked'));

      NetSuiteClient.mockImplementation(() => ({
        createItemFulfillment,
        getItemFulfillment: jest.fn(),
        getItemFulfillmentsBySalesOrder: jest.fn().mockResolvedValue([]),
      }));

      getDefaultPool.mockReturnValue({ query: defaultPoolQuery });

      orderRepository.getOrderWithItems.mockResolvedValue(packingOrder);

      query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT order_item_id, sku, quantity, verified_quantity, skip_reason')) {
          return {
            rows: [
              { order_item_id: 'oi-001', quantity: 1, verified_quantity: 1, skip_reason: null },
            ],
            rowCount: 1,
          };
        }
        if (sql.includes('FROM orders o')) {
          return {
            rows: [
              {
                organizationId: 'ORG320EDF1',
                netsuiteSoInternalId: '1604613',
                netsuiteSoTranId: 'SO68539',
                netsuiteIfInternalId: null,
              },
            ],
            rowCount: 1,
          };
        }
        if (
          sql.includes(
            'SELECT sku, name, quantity, picked_quantity, verified_quantity, status, skip_reason'
          )
        ) {
          return {
            rows: [
              {
                sku: 'SHIP-SKU',
                name: 'Shipped item',
                quantity: 1,
                pickedQuantity: 1,
                verifiedQuantity: 1,
                status: 'FULLY_PICKED',
                skip_reason: null,
              },
            ],
            rowCount: 1,
          };
        }
        return { rows: [], rowCount: 0 };
      });

      await expect(orderService.completePacking('SO68539', 'packer-123')).rejects.toThrow(
        'Failed to create item fulfillment for SO 1604613: blocked'
      );
      expect(orderRepository.update).not.toHaveBeenCalled();
    });

    it('should link an existing NetSuite fulfillment when completing packing instead of creating a duplicate', async () => {
      const packingOrder = {
        ...mockOrder,
        orderId: 'SO68539',
        status: OrderStatus.PACKING,
        packerId: 'packer-123',
      };
      const packedOrder = {
        ...mockOrder,
        orderId: 'SO68539',
        status: OrderStatus.PACKED,
        packedAt: new Date(),
      };
      const defaultPoolQuery = jest.fn().mockResolvedValue({
        rows: [
          {
            integration_id: 'INT-AAP-NS01',
            configuration: {
              auth: {
                accountId: 'acc',
                tokenId: 'tid',
                tokenSecret: 'tsec',
                consumerKey: 'ck',
                consumerSecret: 'cs',
              },
            },
          },
        ],
        rowCount: 1,
      });
      const getItemFulfillmentsBySalesOrder = jest.fn().mockResolvedValue([
        { id: '1607002', tranId: 'IF73610', shipStatus: '_picked' },
        { id: '1607001', tranId: 'IF73609', shipStatus: '_picked' },
      ]);
      const createItemFulfillment = jest.fn();

      NetSuiteClient.mockImplementation(() => ({
        createItemFulfillment,
        getItemFulfillment: jest.fn(),
        getItemFulfillmentsBySalesOrder,
      }));

      getDefaultPool.mockReturnValue({ query: defaultPoolQuery });

      orderRepository.getOrderWithItems
        .mockResolvedValueOnce(packingOrder)
        .mockResolvedValueOnce(packedOrder);
      orderRepository.update.mockResolvedValue(undefined);

      query.mockImplementation((sql: string, params?: any[]) => {
        if (sql.includes('SELECT order_item_id, sku, quantity, verified_quantity, skip_reason')) {
          return {
            rows: [
              { order_item_id: 'oi-001', quantity: 1, verified_quantity: 1, skip_reason: null },
            ],
            rowCount: 1,
          };
        }
        if (sql.includes('FROM orders o')) {
          return {
            rows: [
              {
                organizationId: 'ORG320EDF1',
                netsuiteSoInternalId: '1604613',
                netsuiteSoTranId: 'SO68539',
                netsuiteIfInternalId: null,
              },
            ],
            rowCount: 1,
          };
        }
        if (
          sql.includes(
            'SELECT sku, name, quantity, picked_quantity, verified_quantity, status, skip_reason'
          )
        ) {
          return {
            rows: [
              {
                sku: 'SHIP-SKU',
                name: 'Shipped item',
                quantity: 1,
                pickedQuantity: 1,
                verifiedQuantity: 1,
                status: 'FULLY_PICKED',
                skip_reason: null,
              },
            ],
            rowCount: 1,
          };
        }
        if (sql.includes('SELECT netsuite_if_internal_id')) {
          return { rows: [{ netsuite_if_internal_id: '1607002' }], rowCount: 1 };
        }
        if (sql.includes('UPDATE orders')) {
          return { rows: [], rowCount: 1 };
        }
        return { rows: [], rowCount: 0 };
      });

      await orderService.completePacking('SO68539', 'packer-123');

      expect(createItemFulfillment).not.toHaveBeenCalled();
      expect(query).toHaveBeenCalledWith(expect.stringContaining('UPDATE orders'), [
        '1607002',
        'IF73610',
        'SO68539',
      ]);
    });

    it('should only fulfill verified lines when other lines were explicitly skipped', async () => {
      const packingOrder = {
        ...mockOrder,
        orderId: 'SO68539',
        status: OrderStatus.PACKING,
        packerId: 'packer-123',
      };
      const packedOrder = {
        ...mockOrder,
        orderId: 'SO68539',
        status: OrderStatus.PACKED,
        packedAt: new Date(),
      };
      const defaultPoolQuery = jest.fn().mockResolvedValue({
        rows: [
          {
            integration_id: 'INT-AAP-NS01',
            configuration: {
              auth: {
                accountId: 'acc',
                tokenId: 'tid',
                tokenSecret: 'tsec',
                consumerKey: 'ck',
                consumerSecret: 'cs',
              },
            },
          },
        ],
        rowCount: 1,
      });
      const getItemFulfillment = jest.fn().mockResolvedValue({ id: '1606001', tranId: 'IF73600' });
      const createItemFulfillment = jest.fn().mockResolvedValue('1606001');
      const getItemFulfillmentsBySalesOrder = jest.fn().mockResolvedValue([]);

      NetSuiteClient.mockImplementation(() => ({
        createItemFulfillment,
        getItemFulfillment,
        getItemFulfillmentsBySalesOrder,
      }));

      getDefaultPool.mockReturnValue({ query: defaultPoolQuery });

      orderRepository.getOrderWithItems
        .mockResolvedValueOnce(packingOrder)
        .mockResolvedValueOnce(packedOrder);
      orderRepository.update.mockResolvedValue(undefined);

      query.mockImplementation((sql: string) => {
        if (sql.includes('SELECT order_item_id, sku, quantity, verified_quantity, skip_reason')) {
          return {
            rows: [
              {
                order_item_id: 'oi-001',
                sku: 'BACKORDER-SKU',
                quantity: 1,
                verified_quantity: 0,
                skip_reason: 'Backordered',
              },
              {
                order_item_id: 'oi-002',
                sku: 'SHIP-SKU',
                quantity: 2,
                verified_quantity: 2,
                skip_reason: null,
              },
            ],
            rowCount: 2,
          };
        }
        if (sql.includes('FROM orders o')) {
          return {
            rows: [
              {
                organizationId: 'ORG320EDF1',
                netsuiteSoInternalId: '1604613',
                netsuiteSoTranId: 'SO68539',
                netsuiteIfInternalId: null,
              },
            ],
            rowCount: 1,
          };
        }
        if (
          sql.includes(
            'SELECT sku, name, quantity, picked_quantity, verified_quantity, status, skip_reason'
          )
        ) {
          return {
            rows: [
              {
                sku: 'BACKORDER-SKU',
                name: 'Backordered item',
                quantity: 1,
                pickedQuantity: 0,
                verifiedQuantity: 0,
                status: 'PENDING',
                skip_reason: 'Backordered',
              },
              {
                sku: 'SHIP-SKU',
                name: 'Shipped item',
                quantity: 2,
                pickedQuantity: 2,
                verifiedQuantity: 2,
                status: 'FULLY_PICKED',
                skip_reason: null,
              },
            ],
            rowCount: 2,
          };
        }
        if (sql.includes('SELECT netsuite_if_internal_id')) {
          return { rows: [{ netsuite_if_internal_id: '1606001' }], rowCount: 1 };
        }
        return { rows: [], rowCount: 1 };
      });

      await orderService.completePacking('SO68539', 'packer-123');

      expect(createItemFulfillment).toHaveBeenCalledWith('1604613', {
        lines: [{ sku: 'SHIP-SKU', itemName: 'Shipped item', quantity: 2 }],
      });
    });

    it('should reject packing completion while unverified lines remain', async () => {
      orderRepository.getOrderWithItems.mockResolvedValueOnce({
        ...mockOrder,
        status: OrderStatus.PACKING,
        packerId: 'packer-123',
      });
      query.mockResolvedValueOnce({
        rows: [{ order_item_id: 'oi-001', quantity: 2, verified_quantity: 1, skip_reason: null }],
        rowCount: 1,
      });

      await expect(orderService.completePacking('ORD-TEST-001', 'packer-123')).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe('verifyPackingItem', () => {
    it('should verify packing item', async () => {
      const packingOrder = { ...mockOrder, status: OrderStatus.PACKING };
      const updatedOrder = { ...mockOrder, status: OrderStatus.PACKING };
      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('FROM orders') && sql.includes('FOR UPDATE')) {
            return { rows: [{ order_id: 'ORD-TEST-001', status: OrderStatus.PACKING }] };
          }
          if (sql.includes('FROM order_items') && sql.includes('FOR UPDATE')) {
            return {
              rows: [
                {
                  order_item_id: 'oi-001',
                  quantity: 10,
                  picked_quantity: 10,
                  verified_quantity: 5,
                  status: 'PENDING',
                  skip_reason: null,
                },
              ],
            };
          }
          return { rows: [], rowCount: 1 };
        }),
      };

      orderRepository.getOrderWithItems
        .mockResolvedValueOnce(packingOrder)
        .mockResolvedValueOnce(updatedOrder);
      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));

      const result = await orderService.verifyPackingItem('ORD-TEST-001', 'oi-001', 3);

      expect(result).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SET verified_quantity = $1'),
        [8, 'FULLY_PICKED', 'oi-001']
      );
    });

    it('should throw ConflictError when verifying more than ordered', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('FROM orders') && sql.includes('FOR UPDATE')) {
            return { rows: [{ order_id: 'ORD-TEST-001', status: OrderStatus.PACKING }] };
          }
          if (sql.includes('FROM order_items') && sql.includes('FOR UPDATE')) {
            return {
              rows: [
                {
                  order_item_id: 'oi-001',
                  quantity: 10,
                  picked_quantity: 10,
                  verified_quantity: 9,
                  status: 'PENDING',
                  skip_reason: null,
                },
              ],
            };
          }
          return { rows: [], rowCount: 1 };
        }),
      };
      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));

      await expect(orderService.verifyPackingItem('ORD-TEST-001', 'oi-001', 5)).rejects.toThrow(
        ConflictError
      );
    });

    it('should allow verifying up to the picked quantity for a partially backordered line', async () => {
      const packingOrder = { ...mockOrder, status: OrderStatus.PACKING };
      const updatedOrder = { ...mockOrder, status: OrderStatus.PACKING };
      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('FROM orders') && sql.includes('FOR UPDATE')) {
            return { rows: [{ order_id: 'ORD-TEST-001', status: OrderStatus.PACKING }] };
          }
          if (sql.includes('FROM order_items') && sql.includes('FOR UPDATE')) {
            return {
              rows: [
                {
                  order_item_id: 'oi-001',
                  quantity: 10,
                  picked_quantity: 7,
                  verified_quantity: 6,
                  status: 'PARTIAL_PICKED',
                  skip_reason: 'Backordered remainder',
                },
              ],
            };
          }
          return { rows: [], rowCount: 1 };
        }),
      };

      orderRepository.getOrderWithItems
        .mockResolvedValueOnce(packingOrder)
        .mockResolvedValueOnce(updatedOrder);
      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));

      const result = await orderService.verifyPackingItem('ORD-TEST-001', 'oi-001', 1);

      expect(result).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SET verified_quantity = $1'),
        [7, 'PARTIAL_PICKED', 'oi-001']
      );
    });
  });

  describe('skipPackingItem', () => {
    it('should skip packing item with reason', async () => {
      const packingOrder = { ...mockOrder, status: OrderStatus.PACKING };
      const updatedOrder = { ...mockOrder, status: OrderStatus.PACKING };
      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('FROM orders') && sql.includes('FOR UPDATE')) {
            return { rows: [{ order_id: 'ORD-TEST-001', status: OrderStatus.PACKING }] };
          }
          if (sql.includes('FROM order_items') && sql.includes('FOR UPDATE')) {
            return {
              rows: [
                {
                  order_item_id: 'oi-001',
                  quantity: 2,
                  picked_quantity: 2,
                  verified_quantity: 0,
                  status: 'PENDING',
                  skip_reason: null,
                },
              ],
            };
          }
          return { rows: [], rowCount: 1 };
        }),
      };

      orderRepository.getOrderWithItems
        .mockResolvedValueOnce(packingOrder)
        .mockResolvedValueOnce(updatedOrder);
      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));

      const result = await orderService.skipPackingItem('ORD-TEST-001', 'oi-001', 'Damaged item');

      expect(result).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SET status = $1::order_item_status'),
        ['FULLY_PICKED', 'Damaged item', 0, 'oi-001']
      );
    });

    it('should disable NetSuite ready to ship before skipping a packing item', async () => {
      const packingOrder = {
        ...mockOrder,
        orderId: 'SO68561',
        status: OrderStatus.PACKING,
        organizationId: 'ORG320EDF1',
        netsuiteSource: 'NETSUITE',
        netsuiteSoInternalId: '1604613',
        netsuiteSoTranId: 'SO68561',
      };
      const updatedOrder = { ...packingOrder };
      const markNetSuiteOrderNotReadyToShip = jest
        .spyOn(orderService as any, 'markNetSuiteOrderNotReadyToShip')
        .mockResolvedValue(undefined);

      orderRepository.getOrderWithItems
        .mockResolvedValueOnce(packingOrder)
        .mockResolvedValueOnce(updatedOrder);
      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('FROM orders') && sql.includes('FOR UPDATE')) {
            return { rows: [{ order_id: 'SO68561', status: OrderStatus.PACKING }] };
          }
          if (sql.includes('FROM order_items') && sql.includes('FOR UPDATE')) {
            return {
              rows: [
                {
                  order_item_id: 'oi-001',
                  quantity: 2,
                  picked_quantity: 2,
                  verified_quantity: 0,
                  status: 'PENDING',
                  skip_reason: null,
                },
              ],
            };
          }
          return { rows: [], rowCount: 1 };
        }),
      };
      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));

      await orderService.skipPackingItem('SO68561', 'oi-001', 'Backordered', 1);

      expect(markNetSuiteOrderNotReadyToShip).toHaveBeenCalledWith(
        'SO68561',
        expect.objectContaining({ netsuiteSoInternalId: '1604613' }),
        'Backordered'
      );
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SET status = $1::order_item_status'),
        ['FULLY_PICKED', 'Backordered', 1, 'oi-001']
      );
    });
  });

  describe('undoPackingVerification', () => {
    it('should undo packing verification', async () => {
      const packingOrder = { ...mockOrder, status: OrderStatus.PACKING };
      const updatedOrder = { ...mockOrder, status: OrderStatus.PACKING };
      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('FROM orders') && sql.includes('FOR UPDATE')) {
            return { rows: [{ order_id: 'ORD-TEST-001', status: OrderStatus.PACKING }] };
          }
          if (sql.includes('FROM order_items') && sql.includes('FOR UPDATE')) {
            return {
              rows: [
                {
                  order_item_id: 'oi-001',
                  quantity: 10,
                  picked_quantity: 10,
                  verified_quantity: 5,
                  status: 'PENDING',
                  skip_reason: null,
                },
              ],
            };
          }
          return { rows: [], rowCount: 1 };
        }),
      };

      orderRepository.getOrderWithItems
        .mockResolvedValueOnce(packingOrder)
        .mockResolvedValueOnce(updatedOrder);
      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));

      const result = await orderService.undoPackingVerification(
        'ORD-TEST-001',
        'oi-001',
        2,
        'Mistake'
      );

      expect(result).toBeDefined();
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SET verified_quantity = $1'),
        [3, 'FULLY_PICKED', null, 'oi-001']
      );
    });

    it('should preserve the skip marker when undoing a partially skipped line', async () => {
      const packingOrder = { ...mockOrder, status: OrderStatus.PACKING };
      const updatedOrder = { ...mockOrder, status: OrderStatus.PACKING };
      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('FROM orders') && sql.includes('FOR UPDATE')) {
            return { rows: [{ order_id: 'ORD-TEST-001', status: OrderStatus.PACKING }] };
          }
          if (sql.includes('FROM order_items') && sql.includes('FOR UPDATE')) {
            return {
              rows: [
                {
                  order_item_id: 'oi-001',
                  quantity: 5,
                  picked_quantity: 5,
                  verified_quantity: 5,
                  status: 'SKIPPED',
                  skip_reason: 'Backordered',
                },
              ],
            };
          }
          return { rows: [], rowCount: 1 };
        }),
      };

      orderRepository.getOrderWithItems
        .mockResolvedValueOnce(packingOrder)
        .mockResolvedValueOnce(updatedOrder);
      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));

      await orderService.undoPackingVerification('ORD-TEST-001', 'oi-001', 2, 'Mistake');

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SET verified_quantity = $1'),
        [3, 'FULLY_PICKED', 'Backordered', 'oi-001']
      );
    });
  });

  describe('unclaimPackingOrder', () => {
    it('should unclaim packing order', async () => {
      const mockClient = {
        query: jest.fn().mockImplementation((sql, params) => {
          if (sql.includes('SELECT * FROM orders')) {
            return {
              rows: [
                {
                  ...mockOrder,
                  status: OrderStatus.PACKING,
                  packer_id: 'packer-123',
                },
              ],
            };
          }
          return { rows: [], rowCount: 1 };
        }),
      };

      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));
      orderRepository.getOrderWithItems.mockResolvedValue(mockOrder);

      const result = await orderService.unclaimPackingOrder(
        'ORD-TEST-001',
        'packer-123',
        'Test reason'
      );

      expect(result).toEqual(mockOrder);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE order_items'),
        expect.arrayContaining(['ORD-TEST-001'])
      );
    });

    it('should throw ValidationError when order not in PACKING status', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValue({
          rows: [{ ...mockOrder, status: OrderStatus.PICKED }],
        }),
      };

      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));

      await expect(
        orderService.unclaimPackingOrder('ORD-TEST-001', 'packer-123', 'Test reason')
      ).rejects.toThrow(ValidationError);
    });
  });

  describe('manualOverride', () => {
    it('logs packing overrides to order_exceptions instead of picking_exceptions', async () => {
      const packingOrder = {
        ...mockOrder,
        orderId: 'SO68561',
        status: OrderStatus.PACKING,
      };
      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('FROM pick_tasks pt')) {
            return { rows: [] };
          }
          if (sql.includes('FROM order_items oi')) {
            return {
              rows: [
                {
                  order_item_id: 'OI-SO68561-0',
                  order_id: 'SO68561',
                  sku: 'INFINITY LINK',
                  quantity: 1,
                  picked_quantity: 1,
                  verified_quantity: 0,
                  status: 'FULLY_PICKED',
                  skip_reason: null,
                  order_status: OrderStatus.PACKING,
                },
              ],
            };
          }
          return { rows: [], rowCount: 1 };
        }),
      };

      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));
      orderRepository.getOrderWithItems.mockResolvedValue(packingOrder);

      const result = await orderService.manualOverride(
        'OI-SO68561-0',
        1,
        'Manual override',
        'Confirmed by packer',
        'packer-123'
      );

      expect(result.success).toBe(true);
      expect(result.order).toEqual(packingOrder);
      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO order_exceptions'),
        expect.arrayContaining([
          'SO68561',
          'OI-SO68561-0',
          'INFINITY LINK',
          1,
          1,
          'Manual override',
          'Confirmed by packer',
          'packer-123',
        ])
      );
      expect(
        mockClient.query.mock.calls.some(([sql]: [string]) =>
          sql.includes('INSERT INTO picking_exceptions')
        )
      ).toBe(false);
    });

    it('clears packing skip reasons without relying on a SKIPPED enum value', async () => {
      const packingOrder = {
        ...mockOrder,
        orderId: 'SO68561',
        status: OrderStatus.PACKING,
      };
      const mockClient = {
        query: jest.fn().mockImplementation((sql: string) => {
          if (sql.includes('FROM pick_tasks pt')) {
            return { rows: [] };
          }
          if (sql.includes('FROM order_items oi')) {
            return {
              rows: [
                {
                  order_item_id: 'OI-SO68561-2',
                  order_id: 'SO68561',
                  sku: 'DM12-7.5',
                  quantity: 4,
                  picked_quantity: 4,
                  verified_quantity: 0,
                  status: 'FULLY_PICKED',
                  skip_reason: 'Backordered',
                  order_status: OrderStatus.PACKING,
                },
              ],
            };
          }
          return { rows: [], rowCount: 1 };
        }),
      };

      orderRepository.withTransaction.mockImplementation(callback => callback(mockClient));
      orderRepository.getOrderWithItems.mockResolvedValue(packingOrder);

      await orderService.manualOverride(
        'OI-SO68561-2',
        2,
        'Manual override',
        'Resolved at packing bench',
        'packer-123'
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('SET verified_quantity = $1'),
        [2, 'FULLY_PICKED', null, 'OI-SO68561-2']
      );
      expect(
        mockClient.query.mock.calls.some(([sql]: [string]) => sql.includes("status = 'SKIPPED'"))
      ).toBe(false);
    });
  });

  // ==========================================================================
  // OTHER METHODS TESTS
  // ==========================================================================

  describe('getOrder', () => {
    it('should get order by ID', async () => {
      orderRepository.getOrderWithItems.mockResolvedValue(mockOrder);

      const result = await orderService.getOrder('ORD-TEST-001');

      expect(result).toEqual(mockOrder);
      expect(orderRepository.getOrderWithItems).toHaveBeenCalledWith('ORD-TEST-001');
    });
  });

  describe('getOrderQueue', () => {
    it('should get order queue with filters', async () => {
      const mockResponse = { orders: [mockOrder], total: 1 };
      orderRepository.getOrderQueue.mockResolvedValue(mockResponse);

      const result = await orderService.getOrderQueue({
        status: OrderStatus.PENDING,
        page: 1,
        limit: 10,
      });

      expect(result).toEqual(mockResponse);
      expect(orderRepository.getOrderQueue).toHaveBeenCalledWith({
        status: OrderStatus.PENDING,
        offset: 0,
        page: 1,
        limit: 10,
      });
    });
  });

  describe('getNextPickTask', () => {
    it('should get next pick task for order', async () => {
      pickTaskRepository.getNextPickTask.mockResolvedValue(mockPickTask);
      query.mockResolvedValue({ rows: [], rowCount: 1 });

      const result = await orderService.getNextPickTask('ORD-TEST-001');

      expect(result).toEqual({
        pickTaskId: mockPickTask.pickTaskId,
        sku: mockPickTask.sku,
        name: mockPickTask.name,
        targetBin: mockPickTask.targetBin,
        quantity: mockPickTask.quantity,
        pickedQuantity: mockPickTask.pickedQuantity,
      });
    });

    it('should return null when no pick task found', async () => {
      pickTaskRepository.getNextPickTask.mockResolvedValue(null);
      query.mockResolvedValue({ rows: [], rowCount: 1 });

      const result = await orderService.getNextPickTask('ORD-TEST-001');

      expect(result).toBeNull();
    });
  });

  describe('undoPick', () => {
    it('should undo pick quantity', async () => {
      const mockTask = {
        ...mockPickTask,
        pickedQuantity: 5,
        quantity: 10,
        status: 'IN_PROGRESS',
        orderItemId: 'oi-001',
      };

      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT picked_quantity')) {
          // Mock returns camelCase like the real query function does
          return {
            rows: [
              { pickedQuantity: 5, quantity: 10, status: 'COMPLETED', orderId: 'ORD-TEST-001' },
            ],
          };
        }
        return { rows: [], rowCount: 1 };
      });
      pickTaskRepository.decrementPickedQuantity.mockResolvedValue(mockTask);
      orderRepository.getOrderWithItems.mockResolvedValue(mockOrder);

      const result = await orderService.undoPick('pt-001', 2, 'Mistake');

      expect(result).toEqual(mockOrder);
      expect(pickTaskRepository.decrementPickedQuantity).toHaveBeenCalledWith('pt-001', 2);
    });

    it('should throw NotFoundError when pick task not found', async () => {
      query.mockResolvedValue({ rows: [] });

      await expect(orderService.undoPick('non-existent', 1, 'Test')).rejects.toThrow(NotFoundError);
    });
  });

  describe('skipPickTask', () => {
    it('should skip pick task', async () => {
      const skippedTask = { ...mockPickTask, skipReason: 'Out of stock' };
      query.mockResolvedValueOnce({
        rows: [{ ...mockPickTask, order_item_id: 'oi-001' }],
        rowCount: 1,
      });
      pickTaskRepository.skipPickTask.mockResolvedValue(skippedTask);
      orderRepository.getOrderWithItems.mockResolvedValue(mockOrder);

      const result = await orderService.skipPickTask('pt-001', 'Out of stock', 'picker-123');

      expect(result).toEqual(mockOrder);
      expect(pickTaskRepository.skipPickTask).toHaveBeenCalledWith('pt-001', 'Out of stock');
      expect(query).toHaveBeenCalledWith(expect.stringContaining('picked_quantity = 0'), [
        'oi-001',
        'PENDING',
        'Out of stock',
      ]);
    });

    it('should restore NetSuite ready to ship when other packable lines remain after a skip', async () => {
      const skippedTask = { ...mockPickTask, orderId: 'SO68561', skipReason: 'Out of stock' };
      const defaultPoolQuery = jest.fn().mockResolvedValue({
        rows: [
          {
            integration_id: 'INT-AAP-NS01',
            configuration: {
              auth: {
                accountId: 'acc',
                tokenId: 'tid',
                tokenSecret: 'tsec',
                consumerKey: 'ck',
                consumerSecret: 'cs',
              },
            },
          },
        ],
        rowCount: 1,
      });
      const updateSalesOrderStatus = jest.fn().mockResolvedValue(undefined);

      NetSuiteClient.mockImplementation(() => ({
        updateSalesOrderStatus,
      }));
      getDefaultPool.mockReturnValue({ query: defaultPoolQuery });

      query
        .mockResolvedValueOnce({
          rows: [
            {
              ...mockPickTask,
              order_id: 'SO68561',
              order_item_id: 'oi-001',
              organizationId: 'ORG320EDF1',
              netsuiteSource: 'NETSUITE',
              netsuiteSoInternalId: '1604613',
              netsuiteSoTranId: 'SO68561',
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [
            { quantity: 2, picked_quantity: 0, skip_reason: 'Out of stock' },
            { quantity: 3, picked_quantity: 0, skip_reason: null },
          ],
          rowCount: 2,
        });
      pickTaskRepository.skipPickTask.mockResolvedValue(skippedTask);
      orderRepository.getOrderWithItems.mockResolvedValue({ ...mockOrder, orderId: 'SO68561' });

      await orderService.skipPickTask('pt-001', 'Out of stock', 'picker-123');

      expect(updateSalesOrderStatus).toHaveBeenCalledWith('1604613', { custbody8: true });
    });

    it('should disable NetSuite ready to ship when a skip leaves no packable lines', async () => {
      const skippedTask = { ...mockPickTask, orderId: 'SO68561', skipReason: 'Out of stock' };
      const defaultPoolQuery = jest.fn().mockResolvedValue({
        rows: [
          {
            integration_id: 'INT-AAP-NS01',
            configuration: {
              auth: {
                accountId: 'acc',
                tokenId: 'tid',
                tokenSecret: 'tsec',
                consumerKey: 'ck',
                consumerSecret: 'cs',
              },
            },
          },
        ],
        rowCount: 1,
      });
      const updateSalesOrderStatus = jest.fn().mockResolvedValue(undefined);

      NetSuiteClient.mockImplementation(() => ({
        updateSalesOrderStatus,
      }));
      getDefaultPool.mockReturnValue({ query: defaultPoolQuery });

      query
        .mockResolvedValueOnce({
          rows: [
            {
              ...mockPickTask,
              order_id: 'SO68561',
              order_item_id: 'oi-001',
              organizationId: 'ORG320EDF1',
              netsuiteSource: 'NETSUITE',
              netsuiteSoInternalId: '1604613',
              netsuiteSoTranId: 'SO68561',
            },
          ],
          rowCount: 1,
        })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({ rows: [], rowCount: 1 })
        .mockResolvedValueOnce({
          rows: [{ quantity: 2, picked_quantity: 0, skip_reason: 'Out of stock' }],
          rowCount: 1,
        });
      pickTaskRepository.skipPickTask.mockResolvedValue(skippedTask);
      orderRepository.getOrderWithItems.mockResolvedValue({ ...mockOrder, orderId: 'SO68561' });

      await orderService.skipPickTask('pt-001', 'Out of stock', 'picker-123');

      expect(updateSalesOrderStatus).toHaveBeenCalledWith('1604613', { custbody8: false });
    });
  });

  describe('getPickingProgress', () => {
    it('should get order picking progress', async () => {
      const mockProgress = {
        total: 10,
        completed: 5,
        skipped: 1,
        inProgress: 2,
        pending: 2,
        percentage: 50,
      };
      pickTaskRepository.getOrderPickingProgress.mockResolvedValue(mockProgress);

      const result = await orderService.getOrderPickingProgress('ORD-TEST-001');

      expect(result).toEqual(mockProgress);
    });
  });

  describe('getPickerActiveOrders', () => {
    it('should get picker active orders', async () => {
      orderRepository.getPickerActiveOrders.mockResolvedValue([mockOrder]);

      const result = await orderService.getPickerActiveOrders('picker-123');

      expect(result).toEqual([mockOrder]);
    });
  });

  describe('getPackingQueue', () => {
    it('should get packing queue', async () => {
      const mockResponse = { orders: [mockOrder], total: 1 };
      orderRepository.getOrderQueue.mockResolvedValue(mockResponse);

      const result = await orderService.getPackingQueue();

      expect(result).toEqual([mockOrder]);
      expect(orderRepository.getOrderQueue).toHaveBeenCalledWith({
        status: OrderStatus.PICKED,
      });
    });
  });
});
