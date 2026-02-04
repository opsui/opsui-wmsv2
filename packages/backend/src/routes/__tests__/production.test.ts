/**
 * Integration tests for production routes
 * @covers src/routes/production.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { productionService } from '../../services/ProductionService';
import { authenticate, authorize } from '../../middleware';
import { UserRole } from '@opsui/shared';

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'user-123',
      email: 'production@example.com',
      role: UserRole.PRODUCTION,
      baseRole: UserRole.PRODUCTION,
      activeRole: null,
      effectiveRole: UserRole.PRODUCTION,
    };
    next();
  }),
  authorize: jest.fn((...allowedRoles: string[]) => (req: any, res: any, next: any) => {
    const user = req.user || { role: UserRole.PRODUCTION };
    if (allowedRoles.includes(user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  }),
}));

// Mock the ProductionService
jest.mock('../../services/ProductionService', () => {
  const mockModule = jest.requireActual('../../services/ProductionService');
  return {
    ...mockModule,
    productionService: {
      createBOM: jest.fn(),
      getAllBOMs: jest.fn(),
      getBOMById: jest.fn(),
      createProductionOrder: jest.fn(),
      getAllProductionOrders: jest.fn(),
      getProductionOrderById: jest.fn(),
      updateProductionOrder: jest.fn(),
      releaseProductionOrder: jest.fn(),
      startProductionOrder: jest.fn(),
      recordProductionOutput: jest.fn(),
      getProductionJournal: jest.fn(),
    },
  };
});

jest.mock('../../config/logger');
jest.mock('../../db/client');

// Local status constants
const ProductionOrderStatus = {
  PLANNED: 'PLANNED',
  RELEASED: 'RELEASED',
  IN_PROGRESS: 'IN_PROGRESS',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;

describe('Production Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
  });

  // ==========================================================================
  // POST /api/v1/production/bom
  // ==========================================================================

  describe('POST /api/v1/production/bom', () => {
    it('should create a BOM', async () => {
      const bomData = {
        productId: 'PROD-001',
        productName: 'Product A',
        version: '1.0',
        components: [
          {
            componentId: 'COMP-001',
            componentName: 'Component X',
            quantity: 2,
            unit: 'PCS',
          },
        ],
      };

      const mockBOM = {
        bomId: 'bom-001',
        productId: 'PROD-001',
        productName: 'Product A',
        version: '1.0',
        status: 'ACTIVE',
      };

      (productionService.createBOM as jest.MockedFunction<any>).mockResolvedValue(mockBOM);

      const response = await request(app)
        .post('/api/v1/production/bom')
        .set('Authorization', 'Bearer valid-token')
        .send(bomData)
        .expect(201);

      expect(response.body).toMatchObject({
        bomId: 'bom-001',
        productId: 'PROD-001',
        status: 'ACTIVE',
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/production/bom
  // ==========================================================================

  describe('GET /api/v1/production/bom', () => {
    it('should get all BOMs', async () => {
      const mockBOMs = [
        {
          bomId: 'bom-001',
          productId: 'PROD-001',
          productName: 'Product A',
        },
        {
          bomId: 'bom-002',
          productId: 'PROD-002',
          productName: 'Product B',
        },
      ];

      (productionService.getAllBOMs as jest.MockedFunction<any>).mockResolvedValue(mockBOMs);

      const response = await request(app)
        .get('/api/v1/production/bom')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        boms: mockBOMs,
        count: 2,
      });
    });

    it('should filter by product ID', async () => {
      (productionService.getAllBOMs as jest.MockedFunction<any>).mockResolvedValue([]);

      await request(app)
        .get('/api/v1/production/bom?productId=PROD-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(productionService.getAllBOMs).toHaveBeenCalledWith(
        expect.objectContaining({ productId: 'PROD-001' })
      );
    });

    it('should filter by status', async () => {
      (productionService.getAllBOMs as jest.MockedFunction<any>).mockResolvedValue([]);

      await request(app)
        .get('/api/v1/production/bom?status=ACTIVE')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(productionService.getAllBOMs).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'ACTIVE' })
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/production/bom/:bomId
  // ==========================================================================

  describe('GET /api/v1/production/bom/:bomId', () => {
    it('should get a BOM by ID', async () => {
      const mockBOM = {
        bomId: 'bom-001',
        productId: 'PROD-001',
        productName: 'Product A',
        version: '1.0',
        status: 'ACTIVE',
        components: [
          {
            componentId: 'COMP-001',
            componentName: 'Component X',
            quantity: 2,
          },
        ],
      };

      (productionService.getBOMById as jest.MockedFunction<any>).mockResolvedValue(mockBOM);

      const response = await request(app)
        .get('/api/v1/production/bom/bom-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockBOM);
    });
  });

  // ==========================================================================
  // POST /api/v1/production/orders
  // ==========================================================================

  describe('POST /api/v1/production/orders', () => {
    it('should create a production order', async () => {
      const orderData = {
        bomId: 'bom-001',
        productId: 'PROD-001',
        quantity: 100,
        priority: 'NORMAL',
        requestedBy: 'user-123',
        notes: 'Standard production run',
      };

      const mockOrder = {
        orderId: 'order-001',
        bomId: 'bom-001',
        productId: 'PROD-001',
        quantity: 100,
        status: ProductionOrderStatus.PLANNED,
      };

      (productionService.createProductionOrder as jest.MockedFunction<any>).mockResolvedValue(
        mockOrder
      );

      const response = await request(app)
        .post('/api/v1/production/orders')
        .set('Authorization', 'Bearer valid-token')
        .send(orderData)
        .expect(201);

      expect(response.body).toMatchObject({
        orderId: 'order-001',
        status: ProductionOrderStatus.PLANNED,
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/production/orders
  // ==========================================================================

  describe('GET /api/v1/production/orders', () => {
    it('should get all production orders', async () => {
      const mockResult = {
        orders: [
          {
            orderId: 'order-001',
            productId: 'PROD-001',
            status: ProductionOrderStatus.PLANNED,
            quantity: 100,
          },
          {
            orderId: 'order-002',
            productId: 'PROD-002',
            status: ProductionOrderStatus.IN_PROGRESS,
            quantity: 50,
          },
        ],
        total: 2,
      };

      (productionService.getAllProductionOrders as jest.MockedFunction<any>).mockResolvedValue(
        mockResult
      );

      const response = await request(app)
        .get('/api/v1/production/orders')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
    });

    it('should filter by status', async () => {
      (productionService.getAllProductionOrders as jest.MockedFunction<any>).mockResolvedValue({
        orders: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/production/orders?status=IN_PROGRESS')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(productionService.getAllProductionOrders).toHaveBeenCalledWith(
        expect.objectContaining({ status: ProductionOrderStatus.IN_PROGRESS })
      );
    });

    it('should support pagination', async () => {
      (productionService.getAllProductionOrders as jest.MockedFunction<any>).mockResolvedValue({
        orders: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/production/orders?limit=25&offset=50')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(productionService.getAllProductionOrders).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25, offset: 50 })
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/production/orders/:orderId
  // ==========================================================================

  describe('GET /api/v1/production/orders/:orderId', () => {
    it('should get a production order by ID', async () => {
      const mockOrder = {
        orderId: 'order-001',
        bomId: 'bom-001',
        productId: 'PROD-001',
        status: ProductionOrderStatus.PLANNED,
        quantity: 100,
      };

      (productionService.getProductionOrderById as jest.MockedFunction<any>).mockResolvedValue(
        mockOrder
      );

      const response = await request(app)
        .get('/api/v1/production/orders/order-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockOrder);
    });
  });

  // ==========================================================================
  // PUT /api/v1/production/orders/:orderId
  // ==========================================================================

  describe('PUT /api/v1/production/orders/:orderId', () => {
    it('should update a production order', async () => {
      const updateData = {
        quantity: 150,
        priority: 'HIGH',
        notes: 'Updated quantity',
      };

      const mockOrder = {
        orderId: 'order-001',
        productId: 'PROD-001',
        quantity: 150,
        priority: 'HIGH',
        status: ProductionOrderStatus.PLANNED,
      };

      (productionService.updateProductionOrder as jest.MockedFunction<any>).mockResolvedValue(
        mockOrder
      );

      const response = await request(app)
        .put('/api/v1/production/orders/order-001')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        orderId: 'order-001',
        quantity: 150,
        priority: 'HIGH',
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/production/orders/:orderId/release
  // ==========================================================================

  describe('POST /api/v1/production/orders/:orderId/release', () => {
    it('should release a production order', async () => {
      const mockOrder = {
        orderId: 'order-001',
        productId: 'PROD-001',
        status: ProductionOrderStatus.RELEASED,
        releasedAt: new Date(),
      };

      (productionService.releaseProductionOrder as jest.MockedFunction<any>).mockResolvedValue(
        mockOrder
      );

      const response = await request(app)
        .post('/api/v1/production/orders/order-001/release')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        orderId: 'order-001',
        status: ProductionOrderStatus.RELEASED,
        releasedAt: expect.any(String),
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/production/orders/:orderId/start
  // ==========================================================================

  describe('POST /api/v1/production/orders/:orderId/start', () => {
    it('should start a production order', async () => {
      const mockOrder = {
        orderId: 'order-001',
        productId: 'PROD-001',
        status: ProductionOrderStatus.IN_PROGRESS,
        startedAt: new Date(),
      };

      (productionService.startProductionOrder as jest.MockedFunction<any>).mockResolvedValue(
        mockOrder
      );

      const response = await request(app)
        .post('/api/v1/production/orders/order-001/start')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        orderId: 'order-001',
        status: ProductionOrderStatus.IN_PROGRESS,
        startedAt: expect.any(String),
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/production/orders/:orderId/output
  // ==========================================================================

  describe('POST /api/v1/production/orders/:orderId/output', () => {
    it('should record production output', async () => {
      const outputData = {
        quantity: 50,
        notes: 'First batch completed',
      };

      const mockOutput = {
        outputId: 'output-001',
        orderId: 'order-001',
        quantity: 50,
        recordedBy: 'user-123',
      };

      (productionService.recordProductionOutput as jest.MockedFunction<any>).mockResolvedValue(
        mockOutput
      );

      const response = await request(app)
        .post('/api/v1/production/orders/order-001/output')
        .set('Authorization', 'Bearer valid-token')
        .send(outputData)
        .expect(201);

      expect(response.body).toMatchObject({
        outputId: 'output-001',
        orderId: 'order-001',
        quantity: 50,
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/production/orders/:orderId/journal
  // ==========================================================================

  describe('GET /api/v1/production/orders/:orderId/journal', () => {
    it('should get production journal entries', async () => {
      const mockJournal = [
        {
          journalId: 'journal-001',
          orderId: 'order-001',
          action: 'CREATED',
          performedBy: 'user-123',
          timestamp: new Date(),
        },
        {
          journalId: 'journal-002',
          orderId: 'order-001',
          action: 'RELEASED',
          performedBy: 'user-123',
          timestamp: new Date(),
        },
      ];

      (productionService.getProductionJournal as jest.MockedFunction<any>).mockResolvedValue(
        mockJournal
      );

      const response = await request(app)
        .get('/api/v1/production/orders/order-001/journal')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        journal: mockJournal.map(j => ({ ...j, timestamp: expect.any(String) })),
        count: 2,
      });
    });
  });
});
