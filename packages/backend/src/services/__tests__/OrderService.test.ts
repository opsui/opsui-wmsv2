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
jest.mock('../../db/client');

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
const { query } = require('../../db/client');
const { logger } = require('../../config/logger');
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
    orderService = new OrderService();
    jest.clearAllMocks();

    // Default mock implementations
    query.mockResolvedValue({ rows: [], rowCount: 0 });
    orderRepository.withTransaction = jest.fn(callback =>
      callback({
        query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      })
    );
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

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
      const completedOrder = { ...mockOrder, status: OrderStatus.PICKED };

      orderRepository.updateStatus.mockResolvedValue(completedOrder);

      const result = await orderService.completeOrder('ORD-TEST-001', completeDTO);

      expect(result).toEqual(completedOrder);
      expect(orderRepository.updateStatus).toHaveBeenCalledWith('ORD-TEST-001', OrderStatus.PICKED);
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
      orderRepository.update.mockResolvedValue(undefined);

      const result = await orderService.completePacking('ORD-TEST-001', 'packer-123');

      expect(result.status).toBe(OrderStatus.PACKED);
      expect(orderRepository.update).toHaveBeenCalledWith('ORD-TEST-001', {
        status: OrderStatus.PACKED,
        packedAt: expect.any(Date),
      });
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
  });

  describe('verifyPackingItem', () => {
    it('should verify packing item', async () => {
      const packingOrder = { ...mockOrder, status: OrderStatus.PACKING };
      const updatedOrder = { ...mockOrder, status: OrderStatus.PACKING };

      orderRepository.getOrderWithItems
        .mockResolvedValueOnce(packingOrder)
        .mockResolvedValueOnce(updatedOrder);
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT order_item_id')) {
          return { rows: [{ orderItemId: 'oi-001', quantity: 10, verifiedQuantity: 5 }] };
        }
        return { rows: [], rowCount: 1 };
      });

      const result = await orderService.verifyPackingItem('ORD-TEST-001', 'oi-001', 3);

      expect(result).toBeDefined();
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE order_items SET verified_quantity'),
        expect.arrayContaining([3, 'oi-001'])
      );
    });

    it('should throw ConflictError when verifying more than ordered', async () => {
      orderRepository.getOrderWithItems.mockResolvedValue({
        ...mockOrder,
        status: OrderStatus.PACKING,
      });
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT order_item_id')) {
          return { rows: [{ orderItemId: 'oi-001', quantity: 10, verifiedQuantity: 9 }] };
        }
        return { rows: [], rowCount: 1 };
      });

      await expect(orderService.verifyPackingItem('ORD-TEST-001', 'oi-001', 5)).rejects.toThrow(
        ConflictError
      );
    });
  });

  describe('skipPackingItem', () => {
    it('should skip packing item with reason', async () => {
      const packingOrder = { ...mockOrder, status: OrderStatus.PACKING };
      const updatedOrder = { ...mockOrder, status: OrderStatus.PACKING };

      orderRepository.getOrderWithItems
        .mockResolvedValueOnce(packingOrder)
        .mockResolvedValueOnce(updatedOrder);
      query.mockResolvedValue({ rows: [], rowCount: 1 });

      const result = await orderService.skipPackingItem('ORD-TEST-001', 'oi-001', 'Damaged item');

      expect(result).toBeDefined();
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE order_items SET status = 'SKIPPED'"),
        expect.arrayContaining(['Damaged item', 'oi-001'])
      );
    });
  });

  describe('undoPackingVerification', () => {
    it('should undo packing verification', async () => {
      const packingOrder = { ...mockOrder, status: OrderStatus.PACKING };
      const updatedOrder = { ...mockOrder, status: OrderStatus.PACKING };

      orderRepository.getOrderWithItems
        .mockResolvedValueOnce(packingOrder)
        .mockResolvedValueOnce(updatedOrder);
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT order_item_id')) {
          return { rows: [{ orderItemId: 'oi-001', verifiedQuantity: 5, status: 'PENDING' }] };
        }
        return { rows: [], rowCount: 1 };
      });

      const result = await orderService.undoPackingVerification(
        'ORD-TEST-001',
        'oi-001',
        2,
        'Mistake'
      );

      expect(result).toBeDefined();
      expect(query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE order_items SET verified_quantity = GREATEST'),
        expect.arrayContaining([2, 'oi-001'])
      );
    });

    it('should revert SKIPPED status when undoing', async () => {
      const packingOrder = { ...mockOrder, status: OrderStatus.PACKING };
      const updatedOrder = { ...mockOrder, status: OrderStatus.PACKING };

      orderRepository.getOrderWithItems
        .mockResolvedValueOnce(packingOrder)
        .mockResolvedValueOnce(updatedOrder);
      query.mockImplementation((sql, params) => {
        if (sql.includes('SELECT order_item_id')) {
          return { rows: [{ orderItemId: 'oi-001', verifiedQuantity: 5, status: 'SKIPPED' }] };
        }
        return { rows: [], rowCount: 1 };
      });

      await orderService.undoPackingVerification('ORD-TEST-001', 'oi-001', 2, 'Mistake');

      expect(query).toHaveBeenCalledWith(
        expect.stringContaining("UPDATE order_items SET status = 'PENDING'"),
        expect.arrayContaining(['oi-001'])
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
      pickTaskRepository.skipPickTask.mockResolvedValue(skippedTask);
      orderRepository.getOrderWithItems.mockResolvedValue(mockOrder);

      const result = await orderService.skipPickTask('pt-001', 'Out of stock', 'picker-123');

      expect(result).toEqual(mockOrder);
      expect(pickTaskRepository.skipPickTask).toHaveBeenCalledWith('pt-001', 'Out of stock');
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
