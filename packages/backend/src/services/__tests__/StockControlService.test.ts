/**
 * Unit tests for StockControlService
 * @covers src/services/StockControlService.ts
 */

import { StockControlService } from '../StockControlService';
import { NotFoundError, ConflictError, TransactionType } from '@opsui/shared';

// Mock dependencies
jest.mock('../../repositories/InventoryRepository');
jest.mock('../../repositories/SKURepository');
jest.mock('../../config/logger');
jest.mock('../../db/client');

const { logger } = require('../../config/logger');
const { getPool } = require('../../db/client');

describe('StockControlService', () => {
  let stockControlService: StockControlService;

  const mockUser = {
    userId: 'user-123',
    name: 'Test User',
  };

  beforeEach(() => {
    stockControlService = new StockControlService();
    jest.clearAllMocks();
  });

  // between tests. jest.clearAllMocks() clears call history instead.

  // ==========================================================================
  // GET DASHBOARD TESTS
  // ==========================================================================

  describe('getDashboard', () => {
    it('should return dashboard metrics', async () => {
      const mockDashboardData = {
        rows: [
          { count: '150' }, // total SKUs
          { count: '200' }, // total bins
          { count: '15' }, // low stock items
          { count: '5' }, // out of stock items
          { count: '3' }, // pending stock counts
        ],
      };

      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '150' }] }) // total SKUs
          .mockResolvedValueOnce({ rows: [{ count: '200' }] }) // total bins
          .mockResolvedValueOnce({ rows: [{ count: '15' }] }) // low stock
          .mockResolvedValueOnce({ rows: [{ count: '5' }] }) // out of stock
          .mockResolvedValueOnce({ rows: [{ count: '3' }] }) // pending counts
          .mockResolvedValueOnce({ rows: [] }), // recent transactions
      });

      const result = await stockControlService.getDashboard();

      expect(result).toHaveProperty('totalSKUs');
      expect(result).toHaveProperty('totalBins');
      expect(result).toHaveProperty('lowStockItems');
      expect(result).toHaveProperty('outOfStockItems');
      expect(result).toHaveProperty('pendingStockCounts');
      expect(result).toHaveProperty('recentTransactions');
      expect(logger.info).not.toHaveBeenCalled();
    });

    it('should handle database errors', async () => {
      getPool.mockImplementation(() => {
        throw new Error('Database connection failed');
      });

      await expect(stockControlService.getDashboard()).rejects.toThrow(
        'Database connection failed'
      );
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting stock control dashboard',
        expect.any(Error)
      );
    });
  });

  // ==========================================================================
  // GET INVENTORY LIST TESTS
  // ==========================================================================

  describe('getInventoryList', () => {
    it('should return paginated inventory list', async () => {
      const mockItems = [
        {
          sku: 'SKU001',
          name: 'Product 1',
          category: 'Electronics',
          binLocation: 'A-01-01',
          quantity: 100,
          reserved: 10,
          available: 90,
        },
        {
          sku: 'SKU002',
          name: 'Product 2',
          category: 'Electronics',
          binLocation: 'A-01-02',
          quantity: 50,
          reserved: 5,
          available: 45,
        },
      ];

      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // total count
          .mockResolvedValueOnce({ rows: mockItems }), // data
      });

      const result = await stockControlService.getInventoryList({
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(10);
    });

    it('should filter by name', async () => {
      const mockItems = [
        {
          sku: 'SKU001',
          name: 'Test Product',
          category: 'Test',
          binLocation: 'A-01-01',
          quantity: 100,
          reserved: 0,
          available: 100,
        },
      ];

      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({ rows: mockItems }),
      });

      const result = await stockControlService.getInventoryList({
        name: 'Test',
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
      expect(result.items[0].name).toBe('Test Product');
    });

    it('should filter low stock items', async () => {
      const mockItems = [
        {
          sku: 'SKU001',
          name: 'Low Stock Item',
          category: 'Test',
          binLocation: 'A-01-01',
          quantity: 5,
          reserved: 0,
          available: 5,
        },
      ];

      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({ rows: mockItems }),
      });

      const result = await stockControlService.getInventoryList({
        lowStock: true,
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(1);
    });

    it('should handle pagination correctly', async () => {
      const mockItems = Array.from({ length: 10 }, (_, i) => ({
        sku: `SKU${String(i + 1).padStart(3, '0')}`,
        name: `Product ${i + 1}`,
        category: 'Test',
        binLocation: `A-01-${String(i + 1).padStart(2, '0')}`,
        quantity: 100,
        reserved: 0,
        available: 100,
      }));

      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '25' }] }) // total 25 items
          .mockResolvedValueOnce({ rows: mockItems }), // page 1 with 10 items
      });

      const result = await stockControlService.getInventoryList({
        page: 1,
        limit: 10,
      });

      expect(result.items).toHaveLength(10);
      expect(result.total).toBe(25);
      expect(result.page).toBe(1);
    });
  });

  // ==========================================================================
  // GET SKU INVENTORY DETAIL TESTS
  // ==========================================================================

  describe('getSKUInventoryDetail', () => {
    it('should return SKU inventory detail', async () => {
      const mockSKU = {
        sku: 'SKU001',
        name: 'Test Product',
        description: 'Test Description',
        category: 'Electronics',
        barcode: '1234567890',
      };

      const mockLocations = [
        {
          bin_location: 'A-01-01',
          quantity: 100,
          reserved: 10,
          available: 90,
          last_updated: new Date(),
        },
        {
          bin_location: 'A-01-02',
          quantity: 50,
          reserved: 5,
          available: 45,
          last_updated: new Date(),
        },
      ];

      const mockTransactions = [
        {
          transaction_id: 'TXN001',
          type: 'RECEIPT',
          sku: 'SKU001',
          quantity: 100,
          order_id: null,
          user_id: 'user-123',
          timestamp: new Date(),
          reason: 'Initial stock',
          bin_location: 'A-01-01',
        },
      ];

      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [mockSKU] }) // SKU details
          .mockResolvedValueOnce({ rows: mockLocations }) // inventory by location
          .mockResolvedValueOnce({ rows: mockTransactions }), // transactions
      });

      const result = await stockControlService.getSKUInventoryDetail('SKU001');

      expect(result.sku).toBe('SKU001');
      expect(result.name).toBe('Test Product');
      expect(result.locations).toHaveLength(2);
      expect(result.totalQuantity).toBe(150);
      expect(result.totalAvailable).toBe(135);
      expect(result.recentTransactions).toHaveLength(1);
    });

    it('should throw NotFoundError for non-existent SKU', async () => {
      getPool.mockResolvedValue({
        query: jest.fn().mockResolvedValueOnce({ rows: [] }),
      });

      await expect(stockControlService.getSKUInventoryDetail('NONEXISTENT')).rejects.toThrow(
        NotFoundError
      );
      await expect(stockControlService.getSKUInventoryDetail('NONEXISTENT')).rejects.toThrow('SKU');
    });
  });

  // ==========================================================================
  // CREATE STOCK COUNT TESTS
  // ==========================================================================

  describe('createStockCount', () => {
    it('should create a stock count', async () => {
      const mockBin = { bin_id: 'A-01-01', zone: 'A', active: true };

      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [mockBin] }) // bin exists
          .mockResolvedValueOnce({ rows: [] }), // insert result
      });

      const result = await stockControlService.createStockCount('A-01-01', 'FULL', mockUser.userId);

      expect(result.binLocation).toBe('A-01-01');
      expect(result.type).toBe('FULL');
      expect(result.status).toBe('PENDING');
      expect(result.createdBy).toBe(mockUser.userId);
      expect(result.countId).toMatch(/^SC-/);
      expect(logger.info).toHaveBeenCalledWith('Stock count created', expect.any(Object));
    });

    it('should throw NotFoundError for non-existent bin', async () => {
      getPool.mockResolvedValue({
        query: jest.fn().mockResolvedValueOnce({ rows: [] }),
      });

      await expect(
        stockControlService.createStockCount('INVALID-BIN', 'FULL', mockUser.userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should create different count types', async () => {
      const mockBin = { bin_id: 'A-01-01', zone: 'A', active: true };

      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [mockBin] })
          .mockResolvedValueOnce({ rows: [] }),
      });

      const types = ['FULL', 'CYCLIC', 'SPOT'] as const;

      for (const type of types) {
        const result = await stockControlService.createStockCount('A-01-01', type, mockUser.userId);
        expect(result.type).toBe(type);
      }
    });
  });

  // ==========================================================================
  // SUBMIT STOCK COUNT TESTS
  // ==========================================================================

  describe('submitStockCount', () => {
    it('should submit stock count with items', async () => {
      const mockCount = {
        count_id: 'SC-001',
        bin_location: 'A-01-01',
        type: 'FULL',
        status: 'PENDING',
      };

      const mockInventory = [
        { sku: 'SKU001', quantity: 100 },
        { sku: 'SKU002', quantity: 50 },
      ];

      const items = [
        { sku: 'SKU001', countedQuantity: 95, notes: 'Damage found' },
        { sku: 'SKU002', countedQuantity: 50, notes: '' },
      ];

      const mockClient = {
        query: jest.fn(),
        release: jest.fn(),
      };

      mockClient.query
        .mockResolvedValueOnce({ rows: [mockCount] }) // get count
        .mockResolvedValueOnce({ rows: [mockInventory[0]] }) // get SKU001 inventory
        .mockResolvedValueOnce({ rows: [] }) // insert count item
        .mockResolvedValueOnce({ rows: [mockInventory[1]] }) // get SKU002 inventory
        .mockResolvedValueOnce({ rows: [] }) // insert count item
        .mockResolvedValueOnce({ rows: [] }); // update count status

      getPool.mockResolvedValue({
        connect: jest.fn().mockResolvedValue(mockClient),
        query: jest.fn(),
      });

      const result = await stockControlService.submitStockCount('SC-001', items, mockUser.userId);

      expect(result.status).toBe('COMPLETED');
      expect(result.discrepancies).toHaveLength(1);
      expect(result.discrepancies[0].sku).toBe('SKU001');
      expect(result.discrepancies[0].variance).toBe(-5);
      expect(mockClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should handle transaction rollback on error', async () => {
      const mockClient = {
        query: jest.fn().mockRejectedValue(new Error('Database error')),
        release: jest.fn(),
      };

      getPool.mockResolvedValue({
        connect: jest.fn().mockResolvedValue(mockClient),
      });

      await expect(
        stockControlService.submitStockCount('SC-001', [], mockUser.userId)
      ).rejects.toThrow('Database error');

      expect(mockClient.query).toHaveBeenCalledWith('ROLLBACK');
      expect(mockClient.release).toHaveBeenCalled();
    });

    it('should throw NotFoundError for non-existent count', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        release: jest.fn(),
      };

      getPool.mockResolvedValue({
        connect: jest.fn().mockResolvedValue(mockClient),
      });

      await expect(
        stockControlService.submitStockCount('NONEXISTENT', [], mockUser.userId)
      ).rejects.toThrow(NotFoundError);
    });
  });

  // ==========================================================================
  // TRANSFER STOCK TESTS
  // ==========================================================================

  describe('transferStock', () => {
    it('should transfer stock between bins', async () => {
      const mockSourceInventory = {
        sku: 'SKU001',
        bin_location: 'A-01-01',
        quantity: 100,
        reserved: 0,
        available: 100,
      };
      const mockDestInventory = {
        sku: 'SKU001',
        bin_location: 'A-01-02',
        quantity: 50,
        reserved: 0,
        available: 50,
      };

      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [mockSourceInventory] }) // source exists
          .mockResolvedValueOnce({ rows: [] }) // deduct from source
          .mockResolvedValueOnce({ rows: [mockDestInventory] }) // dest exists
          .mockResolvedValueOnce({ rows: [] }) // add to dest
          .mockResolvedValueOnce({ rows: [] }) // log transaction 1
          .mockResolvedValueOnce({ rows: [] }), // log transaction 2
        release: jest.fn(),
      };

      getPool.mockResolvedValue({
        connect: jest.fn().mockResolvedValue(mockClient),
        query: jest.fn(),
      });

      const result = await stockControlService.transferStock(
        'SKU001',
        'A-01-01',
        'A-01-02',
        10,
        'Relocation',
        mockUser.userId
      );

      expect(result.sku).toBe('SKU001');
      expect(result.fromBin).toBe('A-01-01');
      expect(result.toBin).toBe('A-01-02');
      expect(result.quantity).toBe(10);
      expect(result.transferId).toMatch(/^ST-/);
      expect(logger.info).toHaveBeenCalledWith('Stock transferred', expect.any(Object));
    });

    it('should throw NotFoundError when source inventory does not exist', async () => {
      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({ rows: [] }),
        release: jest.fn(),
      };

      getPool.mockResolvedValue({
        connect: jest.fn().mockResolvedValue(mockClient),
      });

      await expect(
        stockControlService.transferStock(
          'SKU001',
          'A-01-01',
          'A-01-02',
          10,
          'Test',
          mockUser.userId
        )
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when insufficient available quantity', async () => {
      const mockSourceInventory = {
        sku: 'SKU001',
        bin_location: 'A-01-01',
        quantity: 10,
        reserved: 0,
        available: 5,
      };

      const mockClient = {
        query: jest.fn().mockResolvedValueOnce({ rows: [mockSourceInventory] }),
        release: jest.fn(),
      };

      getPool.mockResolvedValue({
        connect: jest.fn().mockResolvedValue(mockClient),
      });

      await expect(
        stockControlService.transferStock(
          'SKU001',
          'A-01-01',
          'A-01-02',
          10,
          'Test',
          mockUser.userId
        )
      ).rejects.toThrow(ConflictError);
    });

    it('should create new inventory record at destination if not exists', async () => {
      const mockSourceInventory = {
        sku: 'SKU001',
        bin_location: 'A-01-01',
        quantity: 100,
        reserved: 0,
        available: 100,
      };

      const mockClient = {
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [mockSourceInventory] }) // source exists
          .mockResolvedValueOnce({ rows: [] }) // deduct from source
          .mockResolvedValueOnce({ rows: [] }) // dest does not exist
          .mockResolvedValueOnce({ rows: [] }) // insert new dest
          .mockResolvedValueOnce({ rows: [] }) // log transaction 1
          .mockResolvedValueOnce({ rows: [] }), // log transaction 2
        release: jest.fn(),
      };

      getPool.mockResolvedValue({
        connect: jest.fn().mockResolvedValue(mockClient),
      });

      const result = await stockControlService.transferStock(
        'SKU001',
        'A-01-01',
        'A-01-02',
        10,
        'Transfer',
        mockUser.userId
      );

      expect(mockClient.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO inventory_units'),
        expect.any(Array)
      );
    });
  });

  // ==========================================================================
  // ADJUST INVENTORY TESTS
  // ==========================================================================

  describe('adjustInventory', () => {
    it('should adjust inventory positively', async () => {
      const mockCurrentInventory = {
        sku: 'SKU001',
        bin_location: 'A-01-01',
        quantity: 100,
        reserved: 0,
        available: 100,
      };

      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [mockCurrentInventory] }) // current inventory
          .mockResolvedValueOnce({ rows: [] }) // update inventory
          .mockResolvedValueOnce({ rows: [] }), // log transaction
      });

      const result = await stockControlService.adjustInventory(
        'SKU001',
        'A-01-01',
        10,
        'Stock correction',
        mockUser.userId
      );

      expect(result.sku).toBe('SKU001');
      expect(result.binLocation).toBe('A-01-01');
      expect(result.previousQuantity).toBe(100);
      expect(result.newQuantity).toBe(110);
      expect(result.variance).toBe(10);
      expect(result.adjustmentId).toMatch(/^ADJ-/);
    });

    it('should adjust inventory negatively', async () => {
      const mockCurrentInventory = {
        sku: 'SKU001',
        bin_location: 'A-01-01',
        quantity: 100,
        reserved: 0,
        available: 100,
      };

      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [mockCurrentInventory] })
          .mockResolvedValueOnce({ rows: [] })
          .mockResolvedValueOnce({ rows: [] }),
      });

      const result = await stockControlService.adjustInventory(
        'SKU001',
        'A-01-01',
        -10,
        'Damage',
        mockUser.userId
      );

      expect(result.previousQuantity).toBe(100);
      expect(result.newQuantity).toBe(90);
      expect(result.variance).toBe(-10);
    });

    it('should throw NotFoundError when inventory does not exist', async () => {
      getPool.mockResolvedValue({
        query: jest.fn().mockResolvedValueOnce({ rows: [] }),
      });

      await expect(
        stockControlService.adjustInventory('SKU001', 'A-01-01', 10, 'Test', mockUser.userId)
      ).rejects.toThrow(NotFoundError);
    });

    it('should throw ConflictError when adjustment results in negative quantity', async () => {
      const mockCurrentInventory = {
        sku: 'SKU001',
        bin_location: 'A-01-01',
        quantity: 5,
        reserved: 0,
        available: 5,
      };

      getPool.mockResolvedValue({
        query: jest.fn().mockResolvedValueOnce({ rows: [mockCurrentInventory] }),
      });

      await expect(
        stockControlService.adjustInventory('SKU001', 'A-01-01', -10, 'Test', mockUser.userId)
      ).rejects.toThrow(ConflictError);
      await expect(
        stockControlService.adjustInventory('SKU001', 'A-01-01', -10, 'Test', mockUser.userId)
      ).rejects.toThrow('negative quantity');
    });
  });

  // ==========================================================================
  // GET TRANSACTION HISTORY TESTS
  // ==========================================================================

  describe('getTransactionHistory', () => {
    it('should return transaction history with pagination', async () => {
      const mockTransactions = [
        {
          transaction_id: 'TXN001',
          type: 'RECEIPT',
          sku: 'SKU001',
          quantity: 100,
          order_id: null,
          user_id: 'user-123',
          timestamp: new Date(),
          reason: 'Initial',
          bin_location: 'A-01-01',
        },
        {
          transaction_id: 'TXN002',
          type: 'DEDUCTION',
          sku: 'SKU001',
          quantity: -10,
          order_id: 'SO0001',
          user_id: 'user-123',
          timestamp: new Date(),
          reason: 'Order',
          bin_location: 'A-01-01',
        },
      ];

      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // total count
          .mockResolvedValueOnce({ rows: mockTransactions }), // transactions
      });

      const result = await stockControlService.getTransactionHistory({
        limit: 10,
        offset: 0,
      });

      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by SKU', async () => {
      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({ rows: [{ transaction_id: 'TXN001', sku: 'SKU001' }] }),
      });

      const result = await stockControlService.getTransactionHistory({
        sku: 'SKU001',
        limit: 10,
        offset: 0,
      });

      expect(result.transactions).toHaveLength(1);
      expect(result.transactions[0].sku).toBe('SKU001');
    });

    it('should filter by transaction type', async () => {
      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({ rows: [{ transaction_id: 'TXN001', type: 'RECEIPT' }] }),
      });

      const result = await stockControlService.getTransactionHistory({
        type: TransactionType.RECEIPT,
        limit: 10,
        offset: 0,
      });

      expect(result.transactions[0].type).toBe(TransactionType.RECEIPT);
    });

    it('should filter by date range', async () => {
      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({ rows: [{ transaction_id: 'TXN001' }] }),
      });

      const result = await stockControlService.getTransactionHistory({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
        limit: 10,
        offset: 0,
      });

      expect(result.transactions).toHaveLength(1);
    });
  });

  // ==========================================================================
  // GET LOW STOCK REPORT TESTS
  // ==========================================================================

  describe('getLowStockReport', () => {
    it('should return low stock items', async () => {
      const mockItems = [
        {
          sku: 'SKU001',
          name: 'Low Stock Item 1',
          category: 'Test',
          bin_location: 'A-01-01',
          available: 5,
          quantity: 5,
        },
        {
          sku: 'SKU002',
          name: 'Low Stock Item 2',
          category: 'Test',
          bin_location: 'A-01-02',
          available: 8,
          quantity: 8,
        },
      ];

      getPool.mockResolvedValue({
        query: jest.fn().mockResolvedValueOnce({ rows: mockItems }),
      });

      const result = await stockControlService.getLowStockReport(10);

      expect(result.threshold).toBe(10);
      expect(result.items).toHaveLength(2);
      expect(result.items[0].available).toBeLessThanOrEqual(10);
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should return empty array when no low stock items', async () => {
      getPool.mockResolvedValue({
        query: jest.fn().mockResolvedValueOnce({ rows: [] }),
      });

      const result = await stockControlService.getLowStockReport(5);

      expect(result.items).toHaveLength(0);
    });
  });

  // ==========================================================================
  // GET MOVEMENT REPORT TESTS
  // ==========================================================================

  describe('getMovementReport', () => {
    it('should return movement report', async () => {
      const mockMovements = [
        {
          sku: 'SKU001',
          name: 'Product 1',
          receipts: 500,
          deductions: 300,
          adjustments: 50,
          net_change: 250,
        },
        {
          sku: 'SKU002',
          name: 'Product 2',
          receipts: 200,
          deductions: 150,
          adjustments: 0,
          net_change: 50,
        },
      ];

      getPool.mockResolvedValue({
        query: jest.fn().mockResolvedValueOnce({ rows: mockMovements }),
      });

      const result = await stockControlService.getMovementReport({
        startDate: '2024-01-01',
        endDate: '2024-12-31',
      });

      expect(result.movements).toHaveLength(2);
      expect(result.period.startDate).toBe('2024-01-01');
      expect(result.period.endDate).toBe('2024-12-31');
      expect(result.generatedAt).toBeInstanceOf(Date);
    });

    it('should filter by SKU', async () => {
      getPool.mockResolvedValue({
        query: jest.fn().mockResolvedValueOnce({
          rows: [
            {
              sku: 'SKU001',
              name: 'Product 1',
              receipts: 100,
              deductions: 50,
              adjustments: 0,
              net_change: 50,
            },
          ],
        }),
      });

      const result = await stockControlService.getMovementReport({
        sku: 'SKU001',
      });

      expect(result.movements).toHaveLength(1);
      expect(result.movements[0].sku).toBe('SKU001');
    });
  });

  // ==========================================================================
  // RECONCILE DISCREPANCIES TESTS
  // ==========================================================================

  describe('reconcileDiscrepancies', () => {
    it('should reconcile multiple discrepancies', async () => {
      const mockCurrentInventory1 = {
        sku: 'SKU001',
        bin_location: 'A-01-01',
        quantity: 100,
        reserved: 0,
        available: 100,
      };
      const mockCurrentInventory2 = {
        sku: 'SKU002',
        bin_location: 'A-01-02',
        quantity: 50,
        reserved: 0,
        available: 50,
      };

      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [mockCurrentInventory1] }) // get SKU001
          .mockResolvedValueOnce({ rows: [] }) // update SKU001
          .mockResolvedValueOnce({ rows: [] }) // log SKU001
          .mockResolvedValueOnce({ rows: [mockCurrentInventory2] }) // get SKU002
          .mockResolvedValueOnce({ rows: [] }) // update SKU002
          .mockResolvedValueOnce({ rows: [] }), // log SKU002
      });

      const discrepancies = [
        {
          sku: 'SKU001',
          binLocation: 'A-01-01',
          systemQuantity: 100,
          actualQuantity: 95,
          variance: -5,
          reason: 'Cycle count correction',
        },
        {
          sku: 'SKU002',
          binLocation: 'A-01-02',
          systemQuantity: 50,
          actualQuantity: 55,
          variance: 5,
          reason: 'Found stock',
        },
      ];

      // Mock the adjustInventory method
      jest
        .spyOn(stockControlService, 'adjustInventory')
        .mockResolvedValueOnce({ adjustmentId: 'ADJ-001', variance: -5 } as any)
        .mockResolvedValueOnce({ adjustmentId: 'ADJ-002', variance: 5 } as any);

      const result = await stockControlService.reconcileDiscrepancies(
        discrepancies,
        mockUser.userId
      );

      expect(result.reconciled).toBe(2);
      expect(result.details).toHaveLength(2);
      expect(logger.info).toHaveBeenCalledWith('Discrepancies reconciled', expect.any(Object));
    });

    it('should skip items with no variance', async () => {
      const discrepancies = [
        {
          sku: 'SKU001',
          binLocation: 'A-01-01',
          systemQuantity: 100,
          actualQuantity: 100,
          variance: 0,
          reason: 'No variance',
        },
      ];

      jest.spyOn(stockControlService, 'adjustInventory').mockResolvedValue({} as any);

      const result = await stockControlService.reconcileDiscrepancies(
        discrepancies,
        mockUser.userId
      );

      expect(result.reconciled).toBe(0);
      expect(result.details).toHaveLength(0);
      expect(stockControlService.adjustInventory).not.toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET BIN LOCATIONS TESTS
  // ==========================================================================

  describe('getBinLocations', () => {
    it('should return all active bin locations', async () => {
      const mockBins = [
        { bin_id: 'A-01-01', zone: 'A', aisle: '01', shelf: '01', type: 'SHELF', active: true },
        { bin_id: 'A-01-02', zone: 'A', aisle: '01', shelf: '02', type: 'SHELF', active: true },
      ];

      getPool.mockResolvedValue({
        query: jest.fn().mockResolvedValueOnce({ rows: mockBins }),
      });

      const result = await stockControlService.getBinLocations({ active: true });

      expect(result).toHaveLength(2);
      expect(result[0].binId).toBe('A-01-01');
    });

    it('should filter by zone', async () => {
      const mockBins = [
        { bin_id: 'A-01-01', zone: 'A', aisle: '01', shelf: '01', type: 'SHELF', active: true },
      ];

      getPool.mockResolvedValue({
        query: jest.fn().mockResolvedValueOnce({ rows: mockBins }),
      });

      const result = await stockControlService.getBinLocations({ zone: 'A' });

      expect(result).toHaveLength(1);
      expect(result[0].zone).toBe('A');
    });

    it('should return empty array when no bins match', async () => {
      getPool.mockResolvedValue({
        query: jest.fn().mockResolvedValueOnce({ rows: [] }),
      });

      const result = await stockControlService.getBinLocations({ zone: 'NONEXISTENT' });

      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // GET STOCK COUNTS TESTS
  // ==========================================================================

  describe('getStockCounts', () => {
    it('should return paginated stock counts', async () => {
      const mockCounts = [
        {
          count_id: 'SC-001',
          bin_location: 'A-01-01',
          type: 'FULL',
          status: 'COMPLETED',
          created_by: 'user-123',
          created_at: new Date(),
        },
        {
          count_id: 'SC-002',
          bin_location: 'A-01-02',
          type: 'CYCLIC',
          status: 'PENDING',
          created_by: 'user-456',
          created_at: new Date(),
        },
      ];

      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // total count
          .mockResolvedValueOnce({ rows: mockCounts }), // counts
      });

      const result = await stockControlService.getStockCounts({
        limit: 10,
        offset: 0,
      });

      expect(result.counts).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter by status', async () => {
      const mockCounts = [
        {
          count_id: 'SC-001',
          bin_location: 'A-01-01',
          type: 'FULL',
          status: 'COMPLETED',
          created_by: 'user-123',
          created_at: new Date(),
        },
      ];

      getPool.mockResolvedValue({
        query: jest
          .fn()
          .mockResolvedValueOnce({ rows: [{ count: '1' }] })
          .mockResolvedValueOnce({ rows: mockCounts }),
      });

      const result = await stockControlService.getStockCounts({
        status: 'COMPLETED',
        limit: 10,
        offset: 0,
      });

      expect(result.counts).toHaveLength(1);
      expect(result.counts[0].status).toBe('COMPLETED');
    });
  });
});
