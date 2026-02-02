/**
 * Integration tests for inventory routes
 * @covers src/routes/inventory.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { inventoryService } from '../../services/InventoryService';
import { authenticate } from '../../middleware/auth';
import { User, UserRole } from '@opsui/shared';

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

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  afterEach(() => {
  });

  // ==========================================================================
  // GET /api/inventory
  // ==========================================================================

  describe('GET /api/inventory', () => {
    it('should return inventory with default filters', async () => {
      const mockInventory = [
        {
          sku: 'SKU-001',
          quantity: 100,
          bin_location: 'A-01-01',
          status: 'available',
        },
        {
          sku: 'SKU-002',
          quantity: 50,
          bin_location: 'A-01-02',
          status: 'available',
        },
      ];

      (inventoryService.getAllInventory as jest.Mock).mockResolvedValue({
        items: mockInventory,
        total: 2,
        page: 1,
        totalPages: 1,
      });

      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = { ...mockUser };
        next();
      });

      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.items).toHaveLength(2);
      expect(response.body.total).toBe(2);
      expect(inventoryService.getAllInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 50,
          offset: 0,
        })
      );
    });

    it('should filter inventory by SKU', async () => {
      (inventoryService.getAllInventory as jest.Mock).mockResolvedValue({
        items: [{ sku: 'SKU-001', quantity: 100 }],
        total: 1,
        page: 1,
        totalPages: 1,
      });

      const response = await request(app)
        .get('/api/inventory?sku=SKU-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(inventoryService.getAllInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: 'SKU-001',
        })
      );
    });

    it('should filter inventory by bin location', async () => {
      (inventoryService.getAllInventory as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
      });

      const response = await request(app)
        .get('/api/inventory?binLocation=A-01-01')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(inventoryService.getAllInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          binLocation: 'A-01-01',
        })
      );
    });

    it('should paginate inventory', async () => {
      (inventoryService.getAllInventory as jest.Mock).mockResolvedValue({
        items: [],
        total: 100,
        page: 2,
        totalPages: 5,
      });

      const response = await request(app)
        .get('/api/inventory?page=2&limit=20')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(inventoryService.getAllInventory).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 20,
        })
      );
    });
  });

  // ==========================================================================
  // GET /api/inventory/:sku
  // ==========================================================================

  describe('GET /api/inventory/:sku', () => {
    it('should return inventory by SKU', async () => {
      const mockInventory = {
        sku: 'SKU-001',
        quantity: 100,
        bin_location: 'A-01-01',
        status: 'available',
      };

      (inventoryService.getInventoryBySKU as jest.Mock).mockResolvedValue(mockInventory);

      const response = await request(app)
        .get('/api/inventory/SKU-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockInventory);
      expect(inventoryService.getInventoryBySKU).toHaveBeenCalledWith('SKU-001');
    });

    it('should return 404 when inventory not found', async () => {
      (inventoryService.getInventoryBySKU as jest.Mock).mockRejectedValue(
        new Error('Inventory SKU-NONEXISTENT not found')
      );

      const response = await request(app)
        .get('/api/inventory/SKU-NONEXISTENT')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(inventoryService.getInventoryBySKU).toHaveBeenCalledWith('SKU-NONEXISTENT');
    });
  });

  // ==========================================================================
  // POST /api/inventory/adjust
  // ==========================================================================

  describe('POST /api/inventory/adjust', () => {
    it('should adjust inventory quantity', async () => {
      const adjustment = {
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        quantity: 10,
        reason: 'Damaged goods',
        adjustedBy: 'user-123',
      };

      (inventoryService.adjustInventory as jest.Mock).mockResolvedValue({
        sku: 'SKU-001',
        previousQuantity: 100,
        newQuantity: 90,
        adjustment: -10,
      });

      const response = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', 'Bearer valid-token')
        .send(adjustment)
        .expect(200);

      expect(response.body.newQuantity).toBe(90);
      expect(inventoryService.adjustInventory).toHaveBeenCalledWith(adjustment);
    });

    it('should return 400 when SKU is missing', async () => {
      const response = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', 'Bearer valid-token')
        .send({
          binLocation: 'A-01-01',
          quantity: 10,
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when quantity is missing', async () => {
      const response = await request(app)
        .post('/api/inventory/adjust')
        .set('Authorization', 'Bearer valid-token')
        .send({
          sku: 'SKU-001',
          binLocation: 'A-01-01',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  // ==========================================================================
  // POST /api/inventory/transfer
  // ==========================================================================

  describe('POST /api/inventory/transfer', () => {
    it('should transfer inventory between bins', async () => {
      const transfer = {
        sku: 'SKU-001',
        fromLocation: 'A-01-01',
        toLocation: 'B-01-01',
        quantity: 10,
        transferredBy: 'user-123',
      };

      (inventoryService.transferInventory as jest.Mock).mockResolvedValue({
        sku: 'SKU-001',
        fromLocation: 'A-01-01',
        toLocation: 'B-01-01',
        quantity: 10,
        transferId: 'TRANS-001',
      });

      const response = await request(app)
        .post('/api/inventory/transfer')
        .set('Authorization', 'Bearer valid-token')
        .send(transfer)
        .expect(200);

      expect(response.body.transferId).toBe('TRANS-001');
      expect(inventoryService.transferInventory).toHaveBeenCalledWith(transfer);
    });

    it('should return 400 when from location equals to location', async () => {
      const response = await request(app)
        .post('/api/inventory/transfer')
        .set('Authorization', 'Bearer valid-token')
        .send({
          sku: 'SKU-001',
          fromLocation: 'A-01-01',
          toLocation: 'A-01-01',
          quantity: 10,
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Source and destination locations cannot be the same',
        code: 'SAME_LOCATION',
      });
    });
  });

  // ==========================================================================
  // GET /api/inventory/transactions
  // ==========================================================================

  describe('GET /api/inventory/transactions', () => {
    it('should return inventory transactions', async () => {
      const mockTransactions = [
        {
          transactionId: 'TRANS-001',
          sku: 'SKU-001',
          type: 'adjustment',
          quantity: -10,
          timestamp: '2024-01-01T00:00:00Z',
        },
        {
          transactionId: 'TRANS-002',
          sku: 'SKU-001',
          type: 'transfer',
          quantity: 5,
          timestamp: '2024-01-02T00:00:00Z',
        },
      ];

      (inventoryService.getTransactions as jest.Mock).mockResolvedValue({
        transactions: mockTransactions,
        total: 2,
        page: 1,
        totalPages: 1,
      });

      const response = await request(app)
        .get('/api/inventory/transactions')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.transactions).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter transactions by type', async () => {
      (inventoryService.getTransactions as jest.Mock).mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const response = await request(app)
        .get('/api/inventory/transactions?type=adjustment')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(inventoryService.getTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'adjustment',
        })
      );
    });

    it('should filter transactions by SKU', async () => {
      (inventoryService.getTransactions as jest.Mock).mockResolvedValue({
        transactions: [],
        total: 0,
      });

      const response = await request(app)
        .get('/api/inventory/transactions?sku=SKU-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(inventoryService.getTransactions).toHaveBeenCalledWith(
        expect.objectContaining({
          sku: 'SKU-001',
        })
      );
    });
  });

  // ==========================================================================
  // POST /api/inventory/count
  // ==========================================================================

  describe('POST /api/inventory/count', () => {
    it('should create inventory count', async () => {
      const count = {
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        countedQuantity: 95,
        countedBy: 'user-123',
        reason: 'Cycle count',
      };

      (inventoryService.recordCount as jest.Mock).mockResolvedValue({
        countId: 'COUNT-001',
        variance: -5,
        previousQuantity: 100,
      });

      const response = await request(app)
        .post('/api/inventory/count')
        .set('Authorization', 'Bearer valid-token')
        .send(count)
        .expect(200);

      expect(response.body.countId).toBe('COUNT-001');
      expect(response.body.variance).toBe(-5);
    });

    it('should return 400 when counted quantity is negative', async () => {
      const response = await request(app)
        .post('/api/inventory/count')
        .set('Authorization', 'Bearer valid-token')
        .send({
          sku: 'SKU-001',
          binLocation: 'A-01-01',
          countedQuantity: -5,
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  // ==========================================================================
  // Authentication
  // ==========================================================================

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = null;
        next();
      });

      await request(app)
        .get('/api/inventory')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should allow access with valid authentication', async () => {
      (inventoryService.getAllInventory as jest.Mock).mockResolvedValue({
        items: [],
        total: 0,
      });

      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = { ...mockUser };
        next();
      });

      await request(app)
        .get('/api/inventory')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      (inventoryService.getAllInventory as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = { ...mockUser };
        next();
      });

      const response = await request(app)
        .get('/api/inventory')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });
});
