/**
 * Integration tests for inventory routes
 * @covers src/routes/inventory.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { inventoryService } from '../../services/InventoryService';
import { authenticate } from '../../middleware/auth';
import { User, UserRole, ValidationError } from '@opsui/shared';
import * as sharedModule from '@opsui/shared';

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req, res, next) => {
    req.user = {
      userId: 'user-123',
      email: 'supervisor@example.com',
      role: UserRole.SUPERVISOR,
      baseRole: UserRole.SUPERVISOR,
      effectiveRole: UserRole.SUPERVISOR,
    };
    next();
  }),
}));

// Mock the inventoryService
jest.mock('../../services/InventoryService');
jest.mock('../../config/logger');
jest.mock('../../db/client');

// Mock validators to throw errors like the real implementation
jest.spyOn(sharedModule, 'validateSKU').mockImplementation((sku: string) => {
  if (!sku || typeof sku !== 'string') {
    throw new ValidationError('SKU is required');
  }
});
jest.spyOn(sharedModule, 'validateBinLocation').mockImplementation((location: string) => {
  if (!location || typeof location !== 'string') {
    throw new ValidationError('Bin location is required');
  }
});

const mockedAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;

describe('Inventory Routes', () => {
  let app: any;

  const mockUser: User = {
    userId: 'user-123',
    email: 'supervisor@example.com',
    name: 'Test Supervisor',
    role: UserRole.SUPERVISOR,
    activeRole: null,
    active: true,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  const mockInventory = [
    {
      sku: 'SKU-001',
      binLocation: 'A-01-01',
      quantity: 100,
      available: 80,
      reserved: 20,
      status: 'available',
    },
    {
      sku: 'SKU-001',
      binLocation: 'A-01-02',
      quantity: 50,
      available: 50,
      reserved: 0,
      status: 'available',
    },
  ];

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  afterEach(() => {});

  // ==========================================================================
  // GET /api/sku/:sku
  // ==========================================================================

  describe('GET /api/v1/inventory/sku/:sku', () => {
    it('should return inventory by SKU', async () => {
      inventoryService.getInventoryBySKU = jest.fn().mockResolvedValue(mockInventory as any);

      const response = await request(app)
        .get('/api/v1/inventory/sku/SKU-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(inventoryService.getInventoryBySKU).toHaveBeenCalledWith('SKU-001');
    });

    it('should return empty array for non-existent SKU', async () => {
      inventoryService.getInventoryBySKU = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/inventory/sku/SKU-NONEXISTENT')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  // ==========================================================================
  // GET /api/bin/:binLocation
  // ==========================================================================

  describe('GET /api/v1/inventory/bin/:binLocation', () => {
    it('should return inventory by bin location', async () => {
      inventoryService.getInventoryByBinLocation = jest
        .fn()
        .mockResolvedValue([mockInventory[0]] as any);

      const response = await request(app)
        .get('/api/v1/inventory/bin/A-01-01')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveLength(1);
      expect(response.body[0].sku).toBe('SKU-001');
      expect(inventoryService.getInventoryByBinLocation).toHaveBeenCalledWith('A-01-01');
    });

    it('should return empty array for empty bin location', async () => {
      inventoryService.getInventoryByBinLocation = jest.fn().mockResolvedValue([]);

      const response = await request(app)
        .get('/api/v1/inventory/bin/B-99-99')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveLength(0);
    });
  });

  // ==========================================================================
  // GET /api/v1/inventory/sku/:sku/available
  // ==========================================================================

  describe('GET /api/v1/inventory/sku/:sku/available', () => {
    it('should return available inventory locations for SKU', async () => {
      const availableLocations = [
        { binLocation: 'A-01-01', available: 80 },
        { binLocation: 'A-01-02', available: 50 },
      ];
      inventoryService.getAvailableInventory = jest
        .fn()
        .mockResolvedValue(availableLocations as any);

      const response = await request(app)
        .get('/api/v1/inventory/sku/SKU-001/available')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(inventoryService.getAvailableInventory).toHaveBeenCalledWith('SKU-001');
    });
  });

  // ==========================================================================
  // GET /api/v1/inventory/sku/:sku/total
  // ==========================================================================

  describe('GET /api/v1/inventory/sku/:sku/total', () => {
    it('should return total available quantity for SKU', async () => {
      inventoryService.getTotalAvailable = jest.fn().mockResolvedValue(130);

      const response = await request(app)
        .get('/api/v1/inventory/sku/SKU-001/total')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({ sku: 'SKU-001', totalAvailable: 130 });
      expect(inventoryService.getTotalAvailable).toHaveBeenCalledWith('SKU-001');
    });
  });

  // ==========================================================================
  // POST /api/v1/inventory/adjust
  // ==========================================================================

  describe('POST /api/v1/inventory/adjust', () => {
    it('should adjust inventory quantity', async () => {
      const adjustedInventory = {
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        quantity: 90,
        available: 70,
        reserved: 20,
      };
      inventoryService.adjustInventory = jest.fn().mockResolvedValue(adjustedInventory as any);

      const response = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', 'Bearer valid-token')
        .send({
          sku: 'SKU-001',
          binLocation: 'A-01-01',
          quantity: -10,
          reason: 'Damaged goods',
        })
        .expect(200);

      expect(response.body.quantity).toBe(90);
      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(
        'SKU-001',
        'A-01-01',
        -10,
        'user-123',
        'Damaged goods'
      );
    });

    it('should return 400 when SKU is missing', async () => {
      const response = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', 'Bearer valid-token')
        .send({
          binLocation: 'A-01-01',
          quantity: 10,
          reason: 'Test',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when quantity is not a number', async () => {
      const response = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', 'Bearer valid-token')
        .send({
          sku: 'SKU-001',
          binLocation: 'A-01-01',
          quantity: 'not a number',
          reason: 'Test',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when reason is missing', async () => {
      const response = await request(app)
        .post('/api/v1/inventory/adjust')
        .set('Authorization', 'Bearer valid-token')
        .send({
          sku: 'SKU-001',
          binLocation: 'A-01-01',
          quantity: 10,
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  // ==========================================================================
  // GET /api/v1/inventory/transactions
  // ==========================================================================

  describe('GET /api/v1/inventory/transactions', () => {
    it('should return inventory transactions', async () => {
      const mockTransactions = {
        transactions: [
          {
            transactionId: 'TRANS-001',
            sku: 'SKU-001',
            type: 'ADJUSTMENT',
            quantity: -10,
            timestamp: '2024-01-01T00:00:00Z',
          },
          {
            transactionId: 'TRANS-002',
            sku: 'SKU-001',
            type: 'RESERVATION',
            quantity: 5,
            timestamp: '2024-01-02T00:00:00Z',
          },
        ],
        total: 2,
      };

      inventoryService.getTransactionHistory = jest.fn().mockResolvedValue(mockTransactions as any);

      const response = await request(app)
        .get('/api/v1/inventory/transactions')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.transactions).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter transactions by SKU', async () => {
      const mockTransactions = {
        transactions: [
          {
            transactionId: 'TRANS-001',
            sku: 'SKU-001',
            type: 'ADJUSTMENT',
            quantity: -10,
          },
        ],
        total: 1,
      };

      inventoryService.getTransactionHistory = jest.fn().mockResolvedValue(mockTransactions as any);

      const response = await request(app)
        .get('/api/v1/inventory/transactions?sku=SKU-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(inventoryService.getTransactionHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: 'SKU-001',
        })
      );
    });

    it('should support pagination', async () => {
      const mockTransactions = {
        transactions: [],
        total: 100,
      };

      inventoryService.getTransactionHistory = jest.fn().mockResolvedValue(mockTransactions as any);

      await request(app)
        .get('/api/v1/inventory/transactions?limit=20&offset=20')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(inventoryService.getTransactionHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 20,
        })
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/inventory/alerts/low-stock
  // ==========================================================================

  describe('GET /api/v1/inventory/alerts/low-stock', () => {
    it('should return low stock alerts', async () => {
      const mockAlerts = [
        { sku: 'SKU-001', binLocation: 'A-01-01', available: 5, quantity: 5 },
        { sku: 'SKU-002', binLocation: 'B-05-10', available: 8, quantity: 8 },
      ];

      inventoryService.getLowStockAlerts = jest.fn().mockResolvedValue(mockAlerts as any);

      const response = await request(app)
        .get('/api/v1/inventory/alerts/low-stock')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveLength(2);
      expect(inventoryService.getLowStockAlerts).toHaveBeenCalledWith(10);
    });

    it('should support custom threshold', async () => {
      inventoryService.getLowStockAlerts = jest.fn().mockResolvedValue([] as any);

      await request(app)
        .get('/api/v1/inventory/alerts/low-stock?threshold=20')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(inventoryService.getLowStockAlerts).toHaveBeenCalledWith(20);
    });
  });

  // ==========================================================================
  // GET /api/v1/inventory/reconcile/:sku
  // ==========================================================================

  describe('GET /api/v1/inventory/reconcile/:sku', () => {
    it('should reconcile inventory for SKU', async () => {
      const mockReconciliation = {
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

      inventoryService.reconcileInventory = jest.fn().mockResolvedValue(mockReconciliation as any);

      const response = await request(app)
        .get('/api/v1/inventory/reconcile/SKU-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.expected).toBe(100);
      expect(response.body.actual).toBe(95);
      expect(response.body.discrepancies).toHaveLength(1);
      expect(inventoryService.reconcileInventory).toHaveBeenCalledWith('SKU-001');
    });
  });

  // ==========================================================================
  // GET /api/v1/inventory/metrics
  // ==========================================================================

  describe('GET /api/v1/inventory/metrics', () => {
    it('should return inventory metrics', async () => {
      const mockMetrics = {
        totalSKUs: 150,
        totalInventoryUnits: 5000,
        lowStockCount: 12,
        outOfStockCount: 3,
      };

      inventoryService.getInventoryMetrics = jest.fn().mockResolvedValue(mockMetrics as any);

      const response = await request(app)
        .get('/api/v1/inventory/metrics')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.totalSKUs).toBe(150);
      expect(response.body.lowStockCount).toBe(12);
      expect(inventoryService.getInventoryMetrics).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // Authentication
  // ==========================================================================

  describe('Authentication', () => {
    it('should allow access with valid authentication', async () => {
      inventoryService.getInventoryBySKU = jest.fn().mockResolvedValue([]);

      await request(app)
        .get('/api/v1/inventory/sku/SKU-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      inventoryService.getInventoryBySKU = jest
        .fn()
        .mockRejectedValue(new Error('Database connection failed'));

      const response = await request(app)
        .get('/api/v1/inventory/sku/SKU-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });
});
