/**
 * SKU Routes Tests
 *
 * Tests for SKU catalog API endpoints
 */

import request from 'supertest';
import express from 'express';
import { UserRole, validateSKU } from '@opsui/shared';

// Mock validateSKU function first
jest.mock('@opsui/shared', () => ({
  ...jest.requireActual('@opsui/shared'),
  validateSKU: jest.fn(),
  UserRole: { ADMIN: 'ADMIN', SUPERVISOR: 'SUPERVISOR', PICKER: 'PICKER' },
}));

// Mock services and middleware BEFORE importing the router
jest.mock('../../services/InventoryService', () => ({
  inventoryService: {
    getAllSKUs: jest.fn(),
    searchSKUs: jest.fn(),
    getCategories: jest.fn(),
    getSKUWithInventory: jest.fn(),
    reserveInventory: jest.fn(),
    releaseReservation: jest.fn(),
  },
}));

jest.mock('../../middleware', () => {
  const actual = jest.requireActual('../../middleware');
  return {
    ...actual,
    authenticate: jest.fn((req, _res, next) => {
      (req as any).user = {
        userId: 'user-001',
        email: 'user@example.com',
        role: 'ADMIN',
        baseRole: 'ADMIN',
        effectiveRole: 'ADMIN',
      };
      next();
    }),
    authorize: jest.fn((...roles: string[]) => (req: any, res: any, next: any) => {
      if (roles.includes((req as any).user?.role)) {
        next();
      } else {
        res.status(403).json({ error: 'Forbidden' });
      }
    }),
    asyncHandler: (fn: any) => (req: any, res: any, next: any) => {
      return Promise.resolve(fn(req, res, next)).catch((err: any) => {
        const status = err.status || 500;
        res.status(status).json(err.message ? { error: err.message, code: err.code } : {});
      });
    },
  };
});

// Import router after mocks are set up
import skusRouter from '../skus';
import { inventoryService } from '../../services/InventoryService';

const mockUser = {
  userId: 'user-001',
  email: 'user@example.com',
  role: UserRole.ADMIN,
  baseRole: UserRole.ADMIN,
  effectiveRole: UserRole.ADMIN,
};

// Setup validateSKU mock to not throw
beforeEach(() => {
  (validateSKU as jest.Mock).mockReturnValue(undefined);
});

describe('SKU Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/skus', skusRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/skus', () => {
    it('should return all SKUs with default limit', async () => {
      const mockSKUs = [
        { sku: 'SKU-001', name: 'Product A', category: 'Electronics' },
        { sku: 'SKU-002', name: 'Product B', category: 'Clothing' },
      ];

      (inventoryService.getAllSKUs as jest.Mock).mockResolvedValue(mockSKUs);

      const response = await request(app).get('/api/skus').expect(200);

      expect(response.body).toEqual(mockSKUs);
      expect(inventoryService.getAllSKUs).toHaveBeenCalledWith(100);
    });

    it('should respect custom limit parameter', async () => {
      const mockSKUs = [{ sku: 'SKU-001', name: 'Product A' }];
      (inventoryService.getAllSKUs as jest.Mock).mockResolvedValue(mockSKUs);

      await request(app).get('/api/skus?limit=50').expect(200);

      expect(inventoryService.getAllSKUs).toHaveBeenCalledWith(50);
    });

    it('should cap limit at 500', async () => {
      const mockSKUs = [{ sku: 'SKU-001', name: 'Product A' }];
      (inventoryService.getAllSKUs as jest.Mock).mockResolvedValue(mockSKUs);

      await request(app).get('/api/skus?limit=1000').expect(200);

      expect(inventoryService.getAllSKUs).toHaveBeenCalledWith(500);
    });

    it('should search SKUs when query parameter is provided', async () => {
      const mockSKUs = [{ sku: 'SKU-001', name: 'Product A', description: 'Great product' }];

      (inventoryService.searchSKUs as jest.Mock).mockResolvedValue(mockSKUs);

      const response = await request(app).get('/api/skus?q=product').expect(200);

      expect(response.body).toEqual(mockSKUs);
      expect(inventoryService.searchSKUs).toHaveBeenCalledWith('product');
    });
  });

  describe('GET /api/skus/categories', () => {
    it('should return all SKU categories', async () => {
      const mockCategories = [
        { categoryId: 'cat-001', name: 'Electronics' },
        { categoryId: 'cat-002', name: 'Clothing' },
        { categoryId: 'cat-003', name: 'Food' },
      ];

      (inventoryService.getCategories as jest.Mock).mockResolvedValue(mockCategories);

      const response = await request(app).get('/api/skus/categories').expect(200);

      expect(response.body).toEqual(mockCategories);
      expect(inventoryService.getCategories).toHaveBeenCalled();
    });

    it('should return empty array when no categories exist', async () => {
      (inventoryService.getCategories as jest.Mock).mockResolvedValue([]);

      const response = await request(app).get('/api/skus/categories').expect(200);

      expect(response.body).toEqual([]);
    });
  });

  describe('GET /api/skus/:sku', () => {
    it('should return SKU details with inventory', async () => {
      const mockSKU = {
        sku: 'SKU-001',
        name: 'Product A',
        category: 'Electronics',
        inventory: [
          { binLocation: 'A-01-01', quantity: 100, available: 80 },
          { binLocation: 'B-02-03', quantity: 50, available: 50 },
        ],
      };

      (inventoryService.getSKUWithInventory as jest.Mock).mockResolvedValue(mockSKU);

      const response = await request(app).get('/api/skus/SKU-001').expect(200);

      expect(response.body).toEqual(mockSKU);
      expect(inventoryService.getSKUWithInventory).toHaveBeenCalledWith('SKU-001');
      expect(validateSKU).toHaveBeenCalledWith('SKU-001');
    });

    it('should throw error for invalid SKU format', async () => {
      (validateSKU as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid SKU format');
      });

      const response = await request(app).get('/api/skus/invalid-sku!').expect(500);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });

  describe('POST /api/skus/:sku/reserve', () => {
    it('should reserve inventory for an order', async () => {
      const mockInventory = {
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        quantity: 50,
        available: 30,
        reserved: 20,
      };

      (inventoryService.reserveInventory as jest.Mock).mockResolvedValue(mockInventory);

      const response = await request(app)
        .post('/api/skus/SKU-001/reserve')
        .send({
          binLocation: 'A-01-01',
          quantity: 10,
          orderId: 'ORD-20240101-001',
        })
        .expect(200);

      expect(response.body).toEqual(mockInventory);
      expect(inventoryService.reserveInventory).toHaveBeenCalledWith(
        'SKU-001',
        'A-01-01',
        10,
        'ORD-20240101-001'
      );
    });

    it('should return 400 when binLocation is missing', async () => {
      const response = await request(app)
        .post('/api/skus/SKU-001/reserve')
        .send({
          quantity: 10,
          orderId: 'ORD-20240101-001',
        })
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'binLocation, quantity, and orderId are required'
      );
      expect(response.body.code).toBe('MISSING_FIELDS');
    });

    it('should return 400 when quantity is missing', async () => {
      const response = await request(app)
        .post('/api/skus/SKU-001/reserve')
        .send({
          binLocation: 'A-01-01',
          orderId: 'ORD-20240101-001',
        })
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'binLocation, quantity, and orderId are required'
      );
    });

    it('should return 400 when orderId is missing', async () => {
      const response = await request(app)
        .post('/api/skus/SKU-001/reserve')
        .send({
          binLocation: 'A-01-01',
          quantity: 10,
        })
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'binLocation, quantity, and orderId are required'
      );
    });
  });

  describe('POST /api/skus/:sku/release', () => {
    it('should release inventory reservation', async () => {
      const mockInventory = {
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        quantity: 50,
        available: 50,
        reserved: 0,
      };

      (inventoryService.releaseReservation as jest.Mock).mockResolvedValue(mockInventory);

      const response = await request(app)
        .post('/api/skus/SKU-001/release')
        .send({
          binLocation: 'A-01-01',
          quantity: 10,
          orderId: 'ORD-20240101-001',
        })
        .expect(200);

      expect(response.body).toEqual(mockInventory);
      expect(inventoryService.releaseReservation).toHaveBeenCalledWith(
        'SKU-001',
        'A-01-01',
        10,
        'ORD-20240101-001'
      );
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/skus/SKU-001/release')
        .send({
          binLocation: 'A-01-01',
        })
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'binLocation, quantity, and orderId are required'
      );
      expect(response.body.code).toBe('MISSING_FIELDS');
    });

    it('should validate SKU format before processing', async () => {
      (validateSKU as jest.Mock).mockImplementation(() => {
        throw new Error('Invalid SKU format');
      });

      const response = await request(app)
        .post('/api/skus/invalid!/release')
        .send({
          binLocation: 'A-01-01',
          quantity: 10,
          orderId: 'ORD-20240101-001',
        })
        .expect(500);

      expect(response.status).toBeGreaterThanOrEqual(400);
    });
  });
});
