/**
 * Unit tests for InventoryService
 * @covers src/services/InventoryService.ts
 */

import { InventoryService } from '../InventoryService';
import { InventoryUnit, TransactionType, NotFoundError, ConflictError } from '@opsui/shared';

// Mock dependencies
jest.mock('../../repositories/InventoryRepository');
jest.mock('../../repositories/SKURepository');
jest.mock('../../config/logger');

const { inventoryRepository } = require('../../repositories/InventoryRepository');
const { skuRepository } = require('../../repositories/SKURepository');
const { logger } = require('../../config/logger');

describe('InventoryService', () => {
  let inventoryService: InventoryService;

  const mockInventoryUnit: InventoryUnit = {
    unitId: 'unit-001',
    sku: 'SKU-001',
    binLocation: 'A-01-01',
    quantity: 100,
    reserved: 10,
    available: 90,
    lastUpdated: new Date(),
  };

  const mockSKUWithInventory = {
    sku: 'SKU-001',
    name: 'Test Product',
    description: 'Test Description',
    image: 'test.jpg',
    category: 'Electronics',
    binLocations: ['A-01-01', 'A-01-02'],
    inventory: [
      { binLocation: 'A-01-01', quantity: 100, available: 90 },
      { binLocation: 'A-01-02', quantity: 50, available: 50 },
    ],
  };

  beforeEach(() => {
    inventoryService = new InventoryService();
    jest.clearAllMocks();
  });

  afterEach(() => {
  });

  // ==========================================================================
  // GET INVENTORY BY SKU TESTS
  // ==========================================================================

  describe('getInventoryBySKU', () => {
    it('should return inventory for SKU', async () => {
      inventoryRepository.findBySKU.mockResolvedValue([mockInventoryUnit]);

      const result = await inventoryService.getInventoryBySKU('SKU-001');

      expect(result).toEqual([mockInventoryUnit]);
      expect(inventoryRepository.findBySKU).toHaveBeenCalledWith('SKU-001');
    });

    it('should return empty array for non-existent SKU', async () => {
      inventoryRepository.findBySKU.mockResolvedValue([]);

      const result = await inventoryService.getInventoryBySKU('NON-EXISTENT');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET INVENTORY BY BIN LOCATION TESTS
  // ==========================================================================

  describe('getInventoryByBinLocation', () => {
    it('should return inventory for bin location', async () => {
      inventoryRepository.findByBinLocation.mockResolvedValue([mockInventoryUnit]);

      const result = await inventoryService.getInventoryByBinLocation('A-01-01');

      expect(result).toEqual([mockInventoryUnit]);
      expect(inventoryRepository.findByBinLocation).toHaveBeenCalledWith('A-01-01');
    });
  });

  // ==========================================================================
  // GET AVAILABLE INVENTORY TESTS
  // ==========================================================================

  describe('getAvailableInventory', () => {
    it('should return available inventory by SKU', async () => {
      const available = [
        { binLocation: 'A-01-01', available: 90 },
        { binLocation: 'A-01-02', available: 50 },
      ];
      inventoryRepository.getAvailableInventory.mockResolvedValue(available);

      const result = await inventoryService.getAvailableInventory('SKU-001');

      expect(result).toEqual(available);
      expect(inventoryRepository.getAvailableInventory).toHaveBeenCalledWith('SKU-001');
    });
  });

  // ==========================================================================
  // GET TOTAL AVAILABLE TESTS
  // ==========================================================================

  describe('getTotalAvailable', () => {
    it('should return total available quantity for SKU', async () => {
      inventoryRepository.getTotalAvailable.mockResolvedValue(140);

      const result = await inventoryService.getTotalAvailable('SKU-001');

      expect(result).toBe(140);
      expect(inventoryRepository.getTotalAvailable).toHaveBeenCalledWith('SKU-001');
    });
  });

  // ==========================================================================
  // RESERVE INVENTORY TESTS
  // ==========================================================================

  describe('reserveInventory', () => {
    it('should reserve inventory successfully', async () => {
      const reservedInventory = { ...mockInventoryUnit, reserved: 20, available: 80 };
      inventoryRepository.reserveInventory.mockResolvedValue(reservedInventory);

      const result = await inventoryService.reserveInventory('SKU-001', 'A-01-01', 10, 'ORD-001');

      expect(result).toEqual(reservedInventory);
      expect(inventoryRepository.reserveInventory).toHaveBeenCalledWith(
        'SKU-001',
        'A-01-01',
        10,
        'ORD-001'
      );
      expect(logger.info).toHaveBeenCalledWith('Reserving inventory', {
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        quantity: 10,
        orderId: 'ORD-001',
      });
      expect(logger.info).toHaveBeenCalledWith('Inventory reserved', expect.any(Object));
    });

    it('should throw ConflictError when insufficient inventory', async () => {
      inventoryRepository.reserveInventory.mockRejectedValue(
        new ConflictError('Insufficient inventory available')
      );

      await expect(
        inventoryService.reserveInventory('SKU-001', 'A-01-01', 1000, 'ORD-001')
      ).rejects.toThrow(ConflictError);
    });
  });

  // ==========================================================================
  // RELEASE RESERVATION TESTS
  // ==========================================================================

  describe('releaseReservation', () => {
    it('should release reservation successfully', async () => {
      const releasedInventory = { ...mockInventoryUnit, reserved: 0, available: 100 };
      inventoryRepository.releaseReservation.mockResolvedValue(releasedInventory);

      const result = await inventoryService.releaseReservation('SKU-001', 'A-01-01', 10, 'ORD-001');

      expect(result).toEqual(releasedInventory);
      expect(inventoryRepository.releaseReservation).toHaveBeenCalledWith(
        'SKU-001',
        'A-01-01',
        10,
        'ORD-001'
      );
      expect(logger.info).toHaveBeenCalledWith('Releasing reservation', expect.any(Object));
      expect(logger.info).toHaveBeenCalledWith('Reservation released', expect.any(Object));
    });
  });

  // ==========================================================================
  // DEDUCT INVENTORY TESTS
  // ==========================================================================

  describe('deductInventory', () => {
    it('should deduct inventory successfully', async () => {
      const deductedInventory = { ...mockInventoryUnit, quantity: 90, available: 80 };
      inventoryRepository.deductInventory.mockResolvedValue(deductedInventory);

      const result = await inventoryService.deductInventory('SKU-001', 'A-01-01', 10, 'ORD-001');

      expect(result).toEqual(deductedInventory);
      expect(inventoryRepository.deductInventory).toHaveBeenCalledWith(
        'SKU-001',
        'A-01-01',
        10,
        'ORD-001'
      );
      expect(logger.info).toHaveBeenCalledWith('Deducting inventory', expect.any(Object));
      expect(logger.info).toHaveBeenCalledWith('Inventory deducted', expect.any(Object));
    });
  });

  // ==========================================================================
  // ADJUST INVENTORY TESTS
  // ==========================================================================

  describe('adjustInventory', () => {
    it('should adjust inventory manually', async () => {
      const adjustedInventory = { ...mockInventoryUnit, quantity: 110, available: 100 };
      inventoryRepository.adjustInventory.mockResolvedValue(adjustedInventory);

      const result = await inventoryService.adjustInventory(
        'SKU-001',
        'A-01-01',
        10,
        'user-123',
        'Cycle count correction'
      );

      expect(result).toEqual(adjustedInventory);
      expect(inventoryRepository.adjustInventory).toHaveBeenCalledWith(
        'SKU-001',
        'A-01-01',
        10,
        'user-123',
        'Cycle count correction'
      );
      expect(logger.info).toHaveBeenCalledWith('Adjusting inventory', {
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        quantity: 10,
        userId: 'user-123',
        reason: 'Cycle count correction',
      });
      expect(logger.info).toHaveBeenCalledWith('Inventory adjusted', expect.any(Object));
    });
  });

  // ==========================================================================
  // GET TRANSACTION HISTORY TESTS
  // ==========================================================================

  describe('getTransactionHistory', () => {
    it('should return transaction history with filters', async () => {
      const mockTransactions = [
        {
          transactionId: 'TXN-001',
          type: TransactionType.RESERVATION,
          sku: 'SKU-001',
          quantity: 10,
          orderId: 'ORD-001',
          binLocation: 'A-01-01',
          createdAt: new Date(),
        },
      ];
      inventoryRepository.getTransactionHistory.mockResolvedValue({
        transactions: mockTransactions,
        total: 1,
      });

      const result = await inventoryService.getTransactionHistory({
        sku: 'SKU-001',
        limit: 10,
      });

      expect(result).toEqual({
        transactions: mockTransactions,
        total: 1,
      });
      expect(inventoryRepository.getTransactionHistory).toHaveBeenCalledWith({
        sku: 'SKU-001',
        limit: 10,
      });
    });

    it('should return all transactions when no filters provided', async () => {
      inventoryRepository.getTransactionHistory.mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const result = await inventoryService.getTransactionHistory();

      expect(result.transactions).toEqual([]);
      expect(result.total).toBe(0);
    });
  });

  // ==========================================================================
  // GET LOW STOCK ALERTS TESTS
  // ==========================================================================

  describe('getLowStockAlerts', () => {
    it('should return low stock items with default threshold', async () => {
      const lowStockItems = [
        { sku: 'SKU-001', binLocation: 'A-01-01', available: 5, quantity: 10 },
        { sku: 'SKU-002', binLocation: 'A-02-01', available: 8, quantity: 15 },
      ];
      inventoryRepository.getLowStock.mockResolvedValue(lowStockItems);

      const result = await inventoryService.getLowStockAlerts();

      expect(result).toEqual(lowStockItems);
      expect(inventoryRepository.getLowStock).toHaveBeenCalledWith(10);
    });

    it('should return low stock items with custom threshold', async () => {
      const lowStockItems = [
        { sku: 'SKU-001', binLocation: 'A-01-01', available: 3, quantity: 10 },
      ];
      inventoryRepository.getLowStock.mockResolvedValue(lowStockItems);

      const result = await inventoryService.getLowStockAlerts(5);

      expect(result).toEqual(lowStockItems);
      expect(inventoryRepository.getLowStock).toHaveBeenCalledWith(5);
    });
  });

  // ==========================================================================
  // RECONCILE INVENTORY TESTS
  // ==========================================================================

  describe('reconcileInventory', () => {
    it('should reconcile inventory for SKU', async () => {
      const reconciliationResult = {
        expected: 100,
        actual: 95,
        discrepancies: [
          {
            binLocation: 'A-01-01',
            expected: 100,
            actual: 95,
            difference: -5,
          },
        ],
      };
      inventoryRepository.reconcileInventory.mockResolvedValue(reconciliationResult);

      const result = await inventoryService.reconcileInventory('SKU-001');

      expect(result).toEqual(reconciliationResult);
      expect(inventoryRepository.reconcileInventory).toHaveBeenCalledWith('SKU-001');
      expect(logger.info).toHaveBeenCalledWith('Reconciling inventory', { sku: 'SKU-001' });
      expect(logger.info).toHaveBeenCalledWith('Inventory reconciliation complete', {
        sku: 'SKU-001',
        expected: 100,
        actual: 95,
        discrepancies: 1,
      });
    });

    it('should return no discrepancies when inventory matches', async () => {
      const reconciliationResult = {
        expected: 100,
        actual: 100,
        discrepancies: [],
      };
      inventoryRepository.reconcileInventory.mockResolvedValue(reconciliationResult);

      const result = await inventoryService.reconcileInventory('SKU-001');

      expect(result.discrepancies).toEqual([]);
      expect(result.discrepancies.length).toBe(0);
    });
  });

  // ==========================================================================
  // GET SKU WITH INVENTORY TESTS
  // ==========================================================================

  describe('getSKUWithInventory', () => {
    it('should return SKU with inventory details', async () => {
      skuRepository.getSKUWithInventory.mockResolvedValue(mockSKUWithInventory);

      const result = await inventoryService.getSKUWithInventory('SKU-001');

      expect(result).toEqual({
        sku: 'SKU-001',
        name: 'Test Product',
        description: 'Test Description',
        image: 'test.jpg',
        category: 'Electronics',
        binLocations: ['A-01-01', 'A-01-02'],
        inventory: mockSKUWithInventory.inventory,
      });
      expect(skuRepository.getSKUWithInventory).toHaveBeenCalledWith('SKU-001');
    });

    it('should throw NotFoundError for non-existent SKU', async () => {
      skuRepository.getSKUWithInventory.mockRejectedValue(
        new NotFoundError('SKU', 'SKU-NONEXISTENT')
      );

      await expect(inventoryService.getSKUWithInventory('SKU-NONEXISTENT')).rejects.toThrow(
        NotFoundError
      );
    });
  });

  // ==========================================================================
  // SEARCH SKUS TESTS
  // ==========================================================================

  describe('searchSKUs', () => {
    it('should search SKUs by term', async () => {
      const mockResults = [
        {
          sku: 'SKU-001',
          name: 'Test Product 1',
          category: 'Electronics',
          binLocations: ['A-01-01'],
        },
        {
          sku: 'SKU-002',
          name: 'Test Product 2',
          category: 'Electronics',
          binLocations: ['A-02-01'],
        },
      ];
      skuRepository.search.mockResolvedValue(mockResults);

      const result = await inventoryService.searchSKUs('Test');

      expect(result).toEqual([
        {
          sku: 'SKU-001',
          name: 'Test Product 1',
          category: 'Electronics',
          binLocations: ['A-01-01'],
        },
        {
          sku: 'SKU-002',
          name: 'Test Product 2',
          category: 'Electronics',
          binLocations: ['A-02-01'],
        },
      ]);
      expect(skuRepository.search).toHaveBeenCalledWith('Test');
    });

    it('should return empty array when no results found', async () => {
      skuRepository.search.mockResolvedValue([]);

      const result = await inventoryService.searchSKUs('NonExistent');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET ALL SKUS TESTS
  // ==========================================================================

  describe('getAllSKUs', () => {
    it('should return all SKUs with default limit', async () => {
      const mockSKUs = [
        {
          sku: 'SKU-001',
          name: 'Product 1',
          category: 'Electronics',
          barcode: '1234567890',
          binLocations: ['A-01-01'],
        },
      ];
      skuRepository.getAllSKUs.mockResolvedValue(mockSKUs);

      const result = await inventoryService.getAllSKUs();

      expect(result).toEqual([
        {
          sku: 'SKU-001',
          name: 'Product 1',
          category: 'Electronics',
          barcode: '1234567890',
          binLocations: ['A-01-01'],
        },
      ]);
      expect(skuRepository.getAllSKUs).toHaveBeenCalledWith(true, 100);
    });

    it('should return SKUs with custom limit', async () => {
      const mockSKUs = [
        {
          sku: 'SKU-001',
          name: 'Product 1',
          category: 'Electronics',
          barcode: '1234567890',
          binLocations: ['A-01-01'],
        },
      ];
      skuRepository.getAllSKUs.mockResolvedValue(mockSKUs);

      const result = await inventoryService.getAllSKUs(50);

      expect(result).toEqual([
        {
          sku: 'SKU-001',
          name: 'Product 1',
          category: 'Electronics',
          barcode: '1234567890',
          binLocations: ['A-01-01'],
        },
      ]);
      expect(skuRepository.getAllSKUs).toHaveBeenCalledWith(true, 50);
    });

    it('should handle missing barcode', async () => {
      const mockSKUs = [
        {
          sku: 'SKU-001',
          name: 'Product 1',
          category: 'Electronics',
          barcode: null,
          binLocations: ['A-01-01'],
        },
      ];
      skuRepository.getAllSKUs.mockResolvedValue(mockSKUs);

      const result = await inventoryService.getAllSKUs();

      expect(result[0].barcode).toBe('');
      expect(result[0].binLocations).toEqual(['A-01-01']);
    });

    it('should handle missing binLocations', async () => {
      const mockSKUs = [
        {
          sku: 'SKU-001',
          name: 'Product 1',
          category: 'Electronics',
          barcode: '1234567890',
          binLocations: null,
        },
      ];
      skuRepository.getAllSKUs.mockResolvedValue(mockSKUs);

      const result = await inventoryService.getAllSKUs();

      expect(result[0].binLocations).toEqual([]);
    });
  });

  // ==========================================================================
  // GET CATEGORIES TESTS
  // ==========================================================================

  describe('getCategories', () => {
    it('should return all categories', async () => {
      const categories = ['Electronics', 'Clothing', 'Food'];
      skuRepository.getCategories.mockResolvedValue(categories);

      const result = await inventoryService.getCategories();

      expect(result).toEqual(categories);
      expect(skuRepository.getCategories).toHaveBeenCalled();
    });

    it('should return empty array when no categories', async () => {
      skuRepository.getCategories.mockResolvedValue([]);

      const result = await inventoryService.getCategories();

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET INVENTORY METRICS TESTS
  // ==========================================================================

  describe('getInventoryMetrics', () => {
    it('should return inventory metrics', async () => {
      inventoryRepository.getLowStock
        .mockResolvedValueOnce([{ sku: 'SKU-001', available: 5 }]) // low stock (< 10)
        .mockResolvedValueOnce([{ sku: 'SKU-002', available: 0 }]); // out of stock (< 1)

      const result = await inventoryService.getInventoryMetrics();

      expect(result).toEqual({
        totalSKUs: 0,
        totalInventoryUnits: 0,
        lowStockCount: 1,
        outOfStockCount: 1,
      });
      expect(inventoryRepository.getLowStock).toHaveBeenCalledWith(10);
      expect(inventoryRepository.getLowStock).toHaveBeenCalledWith(1);
    });
  });
});
