/**
 * Integration tests for barcode scanning routes
 * @covers src/routes/barcode.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { authenticate, requirePicker } from '../../middleware/auth';
import { getAuditService } from '../../services/AuditService';
import { orderService } from '../../services/OrderService';
import { inventoryService } from '../../services/InventoryService';
import { BinLocationService } from '../../services/BinLocationService';
import { query } from '../../db/client';
import { logger } from '../../config/logger';

// Mock all dependencies
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'user-123',
      email: 'picker@example.com',
      role: 'PICKER',
    };
    next();
  }),
  requirePicker: jest.fn((req: any, res: any, next: any) => next()),
}));

jest.mock('../../services/AuditService', () => ({
  getAuditService: jest.fn(() => ({
    logSecurityEvent: jest.fn().mockResolvedValue(undefined),
    logDataModification: jest.fn().mockResolvedValue(undefined),
    log: jest.fn().mockResolvedValue(undefined),
  })),
  AuditEventType: {
    UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
    ORDER_VIEWED: 'ORDER_VIEWED',
    PICK_CONFIRMED: 'PICK_CONFIRMED',
    REPORT_GENERATED: 'REPORT_GENERATED',
    INVENTORY_ADJUSTED: 'INVENTORY_ADJUSTED',
  },
  AuditCategory: {
    DATA_ACCESS: 'DATA_ACCESS',
  },
}));

jest.mock('../../services/OrderService', () => ({
  orderService: {
    getOrder: jest.fn(),
  },
}));

jest.mock('../../services/InventoryService', () => ({
  inventoryService: {
    getInventoryBySKU: jest.fn(),
    getInventoryByBinLocation: jest.fn(),
    reserveInventory: jest.fn(),
  },
}));

jest.mock('../../services/BinLocationService', () => ({
  BinLocationService: jest.fn().mockImplementation(() => ({
    getBinLocation: jest.fn().mockResolvedValue({ binId: 'A-01-01', zone: 'A', type: 'SHELF' }),
  })),
}));

jest.mock('../../db/client', () => ({
  query: jest.fn(),
  getPool: jest.fn(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  })),
  transaction: jest.fn(),
  getClient: jest.fn(),
}));

jest.mock('../../config/logger');

describe('Barcode Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /api/v1/barcode/lookup/:barcode
  // ==========================================================================

  describe('GET /api/v1/barcode/lookup/:barcode', () => {
    it('should look up SKU by barcode', async () => {
      const mockSKU = {
        sku: 'SKU-001',
        name: 'Product A',
        barcode: '1234567890123',
      };

      (query as jest.MockedFunction<any>).mockResolvedValueOnce({
        rows: [mockSKU],
      });

      (inventoryService.getInventoryBySKU as jest.MockedFunction<any>).mockResolvedValue([
        {
          binLocation: 'A-01-01',
          quantity: 100,
          reserved: 10,
          available: 90,
        },
      ]);

      const response = await request(app)
        .get('/api/v1/barcode/lookup/1234567890123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        sku: 'SKU-001',
        productName: 'Product A',
        barcode: '1234567890123',
        totalQuantity: 100,
      });
    });

    it('should return 404 for non-existent barcode', async () => {
      (query as jest.MockedFunction<any>).mockResolvedValueOnce({
        rows: [],
      });

      const response = await request(app)
        .get('/api/v1/barcode/lookup/9999999999999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'SKU not found');
    });
  });

  // ==========================================================================
  // GET /api/v1/barcode/bin/:location
  // ==========================================================================

  describe('GET /api/v1/barcode/bin/:location', () => {
    it('should get inventory at bin location', async () => {
      const mockInventory = [
        {
          sku: 'SKU-001',
          quantity: 100,
          reserved: 10,
          available: 90,
        },
      ];

      (query as jest.MockedFunction<any>).mockResolvedValueOnce({
        rows: [{ name: 'Product A', barcode: '1234567890123' }],
      });

      (inventoryService.getInventoryByBinLocation as jest.MockedFunction<any>).mockResolvedValue(
        mockInventory
      );

      const response = await request(app)
        .get('/api/v1/barcode/bin/A-01-01')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        location: 'A-01-01',
        zone: 'A',
        itemCount: 1,
      });
    });

    it('should return 400 for invalid location format', async () => {
      const response = await request(app)
        .get('/api/v1/barcode/bin/invalid-format')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid location format');
    });
  });

  // ==========================================================================
  // POST /api/v1/barcode/pick/confirm
  // ==========================================================================

  describe('POST /api/v1/barcode/pick/confirm', () => {
    it('should confirm a pick action', async () => {
      const pickData = {
        orderId: 'order-001',
        sku: 'SKU-001',
        barcode: '1234567890123',
        quantity: 10,
        binLocation: 'A-01-01',
      };

      const mockSKU = {
        sku: 'SKU-001',
        name: 'Product A',
        barcode: '1234567890123',
      };

      const mockInventory = {
        sku: 'SKU-001',
        quantity: 100,
        reserved: 10,
        available: 90,
      };

      const mockOrder = {
        orderId: 'order-001',
        status: 'PICKING',
      };

      (query as jest.MockedFunction<any>).mockResolvedValueOnce({
        rows: [mockSKU],
      });

      (inventoryService.getInventoryByBinLocation as jest.MockedFunction<any>).mockResolvedValue([
        mockInventory,
      ]);

      (inventoryService.reserveInventory as jest.MockedFunction<any>).mockResolvedValue(undefined);

      (orderService.getOrder as jest.MockedFunction<any>).mockResolvedValue(mockOrder);

      const response = await request(app)
        .post('/api/v1/barcode/pick/confirm')
        .set('Authorization', 'Bearer valid-token')
        .send(pickData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Pick confirmed',
        data: {
          orderId: 'order-001',
          sku: 'SKU-001',
          quantity: 10,
        },
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        orderId: 'order-001',
        // missing sku, barcode, quantity, binLocation
      };

      const response = await request(app)
        .post('/api/v1/barcode/pick/confirm')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });

    it('should return 400 for barcode mismatch', async () => {
      const pickData = {
        orderId: 'order-001',
        sku: 'SKU-001',
        barcode: '9999999999999',
        quantity: 10,
        binLocation: 'A-01-01',
      };

      (query as jest.MockedFunction<any>).mockResolvedValueOnce({
        rows: [],
      });

      const response = await request(app)
        .post('/api/v1/barcode/pick/confirm')
        .set('Authorization', 'Bearer valid-token')
        .send(pickData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Barcode mismatch');
    });

    it('should return 400 for insufficient inventory', async () => {
      const pickData = {
        orderId: 'order-001',
        sku: 'SKU-001',
        barcode: '1234567890123',
        quantity: 100,
        binLocation: 'A-01-01',
      };

      const mockSKU = {
        sku: 'SKU-001',
        barcode: '1234567890123',
      };

      const mockInventory = {
        sku: 'SKU-001',
        available: 50, // Less than requested
      };

      (query as jest.MockedFunction<any>).mockResolvedValueOnce({
        rows: [mockSKU],
      });

      (inventoryService.getInventoryByBinLocation as jest.MockedFunction<any>).mockResolvedValue([
        mockInventory,
      ]);

      const response = await request(app)
        .post('/api/v1/barcode/pick/confirm')
        .set('Authorization', 'Bearer valid-token')
        .send(pickData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Insufficient inventory');
    });
  });

  // ==========================================================================
  // POST /api/v1/barcode/inventory/verify
  // ==========================================================================

  describe('POST /api/v1/barcode/inventory/verify', () => {
    it('should verify inventory by scanning barcodes', async () => {
      const verifyData = {
        binLocation: 'A-01-01',
        scans: [
          {
            barcode: '1234567890123',
            quantity: 95,
          },
          {
            barcode: '9876543210987',
            quantity: 50,
          },
        ],
      };

      const mockSKU1 = {
        sku: 'SKU-001',
        name: 'Product A',
        barcode: '1234567890123',
      };

      const mockSKU2 = {
        sku: 'SKU-002',
        name: 'Product B',
        barcode: '9876543210987',
      };

      const mockInventory = [
        {
          sku: 'SKU-001',
          quantity: 100,
        },
        {
          sku: 'SKU-002',
          quantity: 50,
        },
      ];

      (query as jest.MockedFunction<any>)
        .mockResolvedValueOnce({ rows: [mockSKU1] })
        .mockResolvedValueOnce({ rows: [mockSKU2] });

      (inventoryService.getInventoryByBinLocation as jest.MockedFunction<any>).mockResolvedValue(
        mockInventory
      );

      const response = await request(app)
        .post('/api/v1/barcode/inventory/verify')
        .set('Authorization', 'Bearer valid-token')
        .send(verifyData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        binLocation: 'A-01-01',
        hasDiscrepancies: true,
      });
      expect(response.body.results).toHaveLength(2);
    });

    it('should handle SKU not found', async () => {
      const verifyData = {
        binLocation: 'A-01-01',
        scans: [
          {
            barcode: '9999999999999',
            quantity: 10,
          },
        ],
      };

      (query as jest.MockedFunction<any>).mockResolvedValueOnce({
        rows: [],
      });

      const response = await request(app)
        .post('/api/v1/barcode/inventory/verify')
        .set('Authorization', 'Bearer valid-token')
        .send(verifyData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body.discrepancies).toHaveLength(1);
    });

    it('should return 400 for invalid request', async () => {
      const invalidData = {
        binLocation: 'A-01-01',
        // missing scans array
      };

      const response = await request(app)
        .post('/api/v1/barcode/inventory/verify')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid request');
    });
  });

  // ==========================================================================
  // POST /api/v1/barcode/putaway
  // ==========================================================================

  describe('POST /api/v1/barcode/putaway', () => {
    it('should record putaway', async () => {
      const putawayData = {
        barcode: '1234567890123',
        binLocation: 'A-01-01',
        quantity: 50,
      };

      const mockSKU = {
        sku: 'SKU-001',
        name: 'Product A',
        barcode: '1234567890123',
      };

      (query as jest.MockedFunction<any>).mockResolvedValueOnce({
        rows: [mockSKU],
      });

      const response = await request(app)
        .post('/api/v1/barcode/putaway')
        .set('Authorization', 'Bearer valid-token')
        .send(putawayData)
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        message: 'Putaway recorded',
        data: {
          sku: 'SKU-001',
          binLocation: 'A-01-01',
          quantity: 50,
        },
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        barcode: '1234567890123',
        // missing binLocation and quantity
      };

      const response = await request(app)
        .post('/api/v1/barcode/putaway')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });

    it('should return 404 for non-existent SKU', async () => {
      const putawayData = {
        barcode: '9999999999999',
        binLocation: 'A-01-01',
        quantity: 50,
      };

      (query as jest.MockedFunction<any>).mockResolvedValueOnce({
        rows: [],
      });

      const response = await request(app)
        .post('/api/v1/barcode/putaway')
        .set('Authorization', 'Bearer valid-token')
        .send(putawayData)
        .expect(404);

      expect(response.body).toHaveProperty('error', 'SKU not found');
    });
  });

  // ==========================================================================
  // GET /api/v1/barcode/mobile/pick-list/:pickerId
  // ==========================================================================

  describe('GET /api/v1/barcode/mobile/pick-list/:pickerId', () => {
    it('should get mobile pick list', async () => {
      const response = await request(app)
        .get('/api/v1/barcode/mobile/pick-list/user-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        pickerId: 'user-123',
        tasks: [],
        optimizedRoute: {
          totalDistance: 0,
          estimatedTime: 0,
          stops: [],
        },
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/barcode/mobile/stats
  // ==========================================================================

  describe('GET /api/v1/barcode/mobile/stats', () => {
    it('should get mobile scanning stats', async () => {
      const response = await request(app)
        .get('/api/v1/barcode/mobile/stats')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        userId: 'user-123',
        stats: {
          picksCompleted: 0,
          itemsPicked: 0,
          accuracyRate: 100,
          averageTimePerPick: 0,
        },
      });
    });
  });
});
