/**
 * Integration tests for stock control routes
 * @covers src/routes/stockControl.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { stockControlService } from '../../services/StockControlService';
import { authenticate, authorize } from '../../middleware';
import { UserRole } from '@opsui/shared';

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'user-123',
      email: 'stockcontroller@example.com',
      role: UserRole.STOCK_CONTROLLER,
      baseRole: UserRole.STOCK_CONTROLLER,
      activeRole: null,
      effectiveRole: UserRole.STOCK_CONTROLLER,
    };
    next();
  }),
  authorize: jest.fn((...allowedRoles: string[]) => (req: any, res: any, next: any) => {
    const user = req.user || { role: UserRole.STOCK_CONTROLLER };
    if (allowedRoles.includes(user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  }),
}));

// Mock the StockControlService
jest.mock('../../services/StockControlService', () => {
  const mockModule = jest.requireActual('../../services/StockControlService');
  return {
    ...mockModule,
    stockControlService: {
      getDashboard: jest.fn(),
      getInventoryList: jest.fn(),
      getSKUInventoryDetail: jest.fn(),
      createStockCount: jest.fn(),
      submitStockCount: jest.fn(),
      getStockCounts: jest.fn(),
      adjustInventory: jest.fn(),
      transferStock: jest.fn(),
      getTransactionHistory: jest.fn(),
      getLowStockReport: jest.fn(),
      getMovementReport: jest.fn(),
      reconcileDiscrepancies: jest.fn(),
      getBinLocations: jest.fn(),
    },
  };
});

jest.mock('../../config/logger');
jest.mock('../../db/client');

describe('Stock Control Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
  });

  // ==========================================================================
  // GET /api/v1/stock-control/dashboard
  // ==========================================================================

  describe('GET /api/v1/stock-control/dashboard', () => {
    it('should get dashboard data', async () => {
      const mockDashboard = {
        totalSKUs: 1000,
        totalBins: 500,
        lowStockItems: 45,
        outOfStockItems: 12,
        pendingStockCounts: 5,
        recentTransactions: [],
      };

      (stockControlService.getDashboard as jest.MockedFunction<any>).mockResolvedValue(
        mockDashboard
      );

      const response = await request(app)
        .get('/api/v1/stock-control/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockDashboard);
    });
  });

  // ==========================================================================
  // GET /api/v1/stock-control/inventory
  // ==========================================================================

  describe('GET /api/v1/stock-control/inventory', () => {
    it('should get inventory list', async () => {
      const mockInventory = {
        items: [
          { sku: 'SKU-001', name: 'Item 1', quantity: 100, binLocation: 'A-01-01' },
          { sku: 'SKU-002', name: 'Item 2', quantity: 50, binLocation: 'B-02-03' },
        ],
        total: 2,
        page: 1,
        pageSize: 50,
      };

      (stockControlService.getInventoryList as jest.MockedFunction<any>).mockResolvedValue(
        mockInventory
      );

      const response = await request(app)
        .get('/api/v1/stock-control/inventory')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockInventory);
    });

    it('should filter by low stock', async () => {
      (stockControlService.getInventoryList as jest.MockedFunction<any>).mockResolvedValue({
        items: [],
        total: 0,
        page: 1,
        pageSize: 50,
      });

      await request(app)
        .get('/api/v1/stock-control/inventory?lowStock=true')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(stockControlService.getInventoryList).toHaveBeenCalledWith(
        expect.objectContaining({ lowStock: true })
      );
    });

    it('should support pagination', async () => {
      (stockControlService.getInventoryList as jest.MockedFunction<any>).mockResolvedValue({
        items: [],
        total: 0,
        page: 2,
        pageSize: 25,
      });

      await request(app)
        .get('/api/v1/stock-control/inventory?page=2&limit=25')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(stockControlService.getInventoryList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 2, limit: 25 })
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/stock-control/inventory/:sku
  // ==========================================================================

  describe('GET /api/v1/stock-control/inventory/:sku', () => {
    it('should get SKU inventory detail', async () => {
      const mockDetail = {
        sku: 'SKU-001',
        name: 'Test Item',
        description: 'Test description',
        category: 'Electronics',
        totalQuantity: 500,
        totalReserved: 50,
        totalAvailable: 450,
        locations: [
          {
            binLocation: 'A-01-01',
            quantity: 300,
            reserved: 30,
            available: 270,
            lastUpdated: new Date(),
          },
          {
            binLocation: 'A-01-02',
            quantity: 200,
            reserved: 20,
            available: 180,
            lastUpdated: new Date(),
          },
        ],
        recentTransactions: [],
      };

      (stockControlService.getSKUInventoryDetail as jest.MockedFunction<any>).mockResolvedValue(
        mockDetail
      );

      const response = await request(app)
        .get('/api/v1/stock-control/inventory/SKU-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        ...mockDetail,
        locations: mockDetail.locations.map(loc => ({
          ...loc,
          lastUpdated: expect.any(String),
        })),
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/stock-control/stock-count
  // ==========================================================================

  describe('POST /api/v1/stock-control/stock-count', () => {
    it('should create a FULL stock count', async () => {
      const stockCountData = {
        binLocation: 'A-01-01',
        type: 'FULL',
      };

      const mockStockCount = {
        countId: 'count-001',
        binLocation: 'A-01-01',
        type: 'FULL',
        status: 'PENDING',
        createdBy: 'user-123',
        createdAt: new Date(),
      };

      (stockControlService.createStockCount as jest.MockedFunction<any>).mockResolvedValue(
        mockStockCount
      );

      const response = await request(app)
        .post('/api/v1/stock-control/stock-count')
        .set('Authorization', 'Bearer valid-token')
        .send(stockCountData)
        .expect(200);

      expect(response.body).toMatchObject({ ...mockStockCount, createdAt: expect.any(String) });
      expect(stockControlService.createStockCount).toHaveBeenCalledWith(
        'A-01-01',
        'FULL',
        'user-123'
      );
    });

    it('should create a CYCLIC stock count', async () => {
      const stockCountData = {
        binLocation: 'B-02-03',
        type: 'CYCLIC',
      };

      const mockStockCount = {
        countId: 'count-002',
        binLocation: 'B-02-03',
        type: 'CYCLIC',
        status: 'PENDING',
        createdBy: 'user-123',
        createdAt: new Date(),
      };

      (stockControlService.createStockCount as jest.MockedFunction<any>).mockResolvedValue(
        mockStockCount
      );

      const response = await request(app)
        .post('/api/v1/stock-control/stock-count')
        .set('Authorization', 'Bearer valid-token')
        .send(stockCountData)
        .expect(200);

      expect(response.body).toMatchObject({ ...mockStockCount, createdAt: expect.any(String) });
    });

    it('should create a SPOT stock count', async () => {
      const stockCountData = {
        binLocation: 'C-03-05',
        type: 'SPOT',
      };

      const mockStockCount = {
        countId: 'count-003',
        binLocation: 'C-03-05',
        type: 'SPOT',
        status: 'PENDING',
        createdBy: 'user-123',
        createdAt: new Date(),
      };

      (stockControlService.createStockCount as jest.MockedFunction<any>).mockResolvedValue(
        mockStockCount
      );

      const response = await request(app)
        .post('/api/v1/stock-control/stock-count')
        .set('Authorization', 'Bearer valid-token')
        .send(stockCountData)
        .expect(200);

      expect(response.body).toMatchObject({ ...mockStockCount, createdAt: expect.any(String) });
    });

    it('should return 400 for invalid count type', async () => {
      const invalidData = {
        binLocation: 'A-01-01',
        type: 'INVALID',
      };

      const response = await request(app)
        .post('/api/v1/stock-control/stock-count')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty(
        'error',
        'Invalid count type. Must be FULL, CYCLIC, or SPOT'
      );
      expect(response.body).toHaveProperty('code', 'INVALID_TYPE');
    });
  });

  // ==========================================================================
  // POST /api/v1/stock-control/stock-count/:countId/submit
  // ==========================================================================

  describe('POST /api/v1/stock-control/stock-count/:countId/submit', () => {
    it('should submit stock count results', async () => {
      const submissionData = {
        items: [
          { sku: 'SKU-001', countedQuantity: 95, notes: 'Minor discrepancy' },
          { sku: 'SKU-002', countedQuantity: 50 },
        ],
      };

      const mockResult = {
        countId: 'count-001',
        status: 'COMPLETED',
        discrepancies: [
          {
            sku: 'SKU-001',
            binLocation: 'A-01-01',
            expectedQuantity: 100,
            countedQuantity: 95,
            variance: -5,
          },
        ],
      };

      (stockControlService.submitStockCount as jest.MockedFunction<any>).mockResolvedValue(
        mockResult
      );

      const response = await request(app)
        .post('/api/v1/stock-control/stock-count/count-001/submit')
        .set('Authorization', 'Bearer valid-token')
        .send(submissionData)
        .expect(200);

      expect(response.body).toEqual(mockResult);
      expect(stockControlService.submitStockCount).toHaveBeenCalledWith(
        'count-001',
        submissionData.items,
        'user-123'
      );
    });

    it('should return 400 if items is not an array', async () => {
      const response = await request(app)
        .post('/api/v1/stock-control/stock-count/count-001/submit')
        .set('Authorization', 'Bearer valid-token')
        .send({ items: 'not-an-array' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Items must be an array');
      expect(response.body).toHaveProperty('code', 'INVALID_ITEMS');
    });
  });

  // ==========================================================================
  // GET /api/v1/stock-control/stock-counts
  // ==========================================================================

  describe('GET /api/v1/stock-control/stock-counts', () => {
    it('should get stock counts', async () => {
      const mockCounts = [
        { countId: 'count-001', binLocation: 'A-01-01', status: 'PENDING' },
        { countId: 'count-002', binLocation: 'B-02-01', status: 'COMPLETED' },
      ];

      (stockControlService.getStockCounts as jest.MockedFunction<any>).mockResolvedValue({
        counts: mockCounts,
        total: 2,
      });

      const response = await request(app)
        .get('/api/v1/stock-control/stock-counts')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual({
        counts: mockCounts,
        total: 2,
      });
    });

    it('should filter by status', async () => {
      (stockControlService.getStockCounts as jest.MockedFunction<any>).mockResolvedValue({
        counts: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/stock-control/stock-counts?status=COMPLETED')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(stockControlService.getStockCounts).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'COMPLETED' })
      );
    });

    it('should support pagination with offset', async () => {
      (stockControlService.getStockCounts as jest.MockedFunction<any>).mockResolvedValue({
        counts: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/stock-control/stock-counts?limit=25&offset=50')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(stockControlService.getStockCounts).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25, offset: 50 })
      );
    });
  });

  // ==========================================================================
  // POST /api/v1/stock-control/transfer
  // ==========================================================================

  describe('POST /api/v1/stock-control/transfer', () => {
    it('should transfer stock', async () => {
      const transferData = {
        sku: 'SKU-001',
        fromBin: 'A-01-01',
        toBin: 'A-02-01',
        quantity: 10,
        reason: 'Relocation',
      };

      const mockTransfer = {
        transferId: 'transfer-001',
        sku: 'SKU-001',
        fromBin: 'A-01-01',
        toBin: 'A-02-01',
        quantity: 10,
        reason: 'Relocation',
        performedBy: 'user-123',
        performedAt: new Date(),
      };

      (stockControlService.transferStock as jest.MockedFunction<any>).mockResolvedValue(
        mockTransfer
      );

      const response = await request(app)
        .post('/api/v1/stock-control/transfer')
        .set('Authorization', 'Bearer valid-token')
        .send(transferData)
        .expect(200);

      expect(response.body).toMatchObject({ ...mockTransfer, performedAt: expect.any(String) });
      expect(stockControlService.transferStock).toHaveBeenCalledWith(
        'SKU-001',
        'A-01-01',
        'A-02-01',
        10,
        'Relocation',
        'user-123'
      );
    });

    it('should return 400 for invalid quantity', async () => {
      const invalidData = {
        sku: 'SKU-001',
        fromBin: 'A-01-01',
        toBin: 'A-02-01',
        quantity: -5,
        reason: 'Test',
      };

      const response = await request(app)
        .post('/api/v1/stock-control/transfer')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Quantity must be a positive number');
      expect(response.body).toHaveProperty('code', 'INVALID_QUANTITY');
    });

    it('should return 400 for missing reason', async () => {
      const invalidData = {
        sku: 'SKU-001',
        fromBin: 'A-01-01',
        toBin: 'A-02-01',
        quantity: 10,
      };

      const response = await request(app)
        .post('/api/v1/stock-control/transfer')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Reason is required');
      expect(response.body).toHaveProperty('code', 'MISSING_REASON');
    });
  });

  // ==========================================================================
  // POST /api/v1/stock-control/adjust
  // ==========================================================================

  describe('POST /api/v1/stock-control/adjust', () => {
    it('should adjust inventory (increase)', async () => {
      const adjustmentData = {
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        quantity: 5,
        reason: 'Restock',
      };

      const mockAdjustment = {
        adjustmentId: 'adj-001',
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        previousQuantity: 100,
        newQuantity: 105,
        variance: 5,
        reason: 'Restock',
        performedBy: 'user-123',
        performedAt: new Date(),
      };

      (stockControlService.adjustInventory as jest.MockedFunction<any>).mockResolvedValue(
        mockAdjustment
      );

      const response = await request(app)
        .post('/api/v1/stock-control/adjust')
        .set('Authorization', 'Bearer valid-token')
        .send(adjustmentData)
        .expect(200);

      expect(response.body).toMatchObject({ ...mockAdjustment, performedAt: expect.any(String) });
      expect(stockControlService.adjustInventory).toHaveBeenCalledWith(
        'SKU-001',
        'A-01-01',
        5,
        'Restock',
        'user-123'
      );
    });

    it('should adjust inventory (decrease)', async () => {
      const adjustmentData = {
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        quantity: -5,
        reason: 'Damaged items removed',
      };

      const mockAdjustment = {
        adjustmentId: 'adj-002',
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        previousQuantity: 100,
        newQuantity: 95,
        variance: -5,
        reason: 'Damaged items removed',
        performedBy: 'user-123',
        performedAt: new Date(),
      };

      (stockControlService.adjustInventory as jest.MockedFunction<any>).mockResolvedValue(
        mockAdjustment
      );

      const response = await request(app)
        .post('/api/v1/stock-control/adjust')
        .set('Authorization', 'Bearer valid-token')
        .send(adjustmentData)
        .expect(200);

      expect(response.body).toMatchObject({ ...mockAdjustment, performedAt: expect.any(String) });
    });

    it('should return 400 for missing reason', async () => {
      const invalidData = {
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        quantity: 5,
      };

      const response = await request(app)
        .post('/api/v1/stock-control/adjust')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Reason is required');
      expect(response.body).toHaveProperty('code', 'MISSING_REASON');
    });
  });

  // ==========================================================================
  // GET /api/v1/stock-control/transactions
  // ==========================================================================

  describe('GET /api/v1/stock-control/transactions', () => {
    it('should get transaction history', async () => {
      const mockTransactions = [
        {
          transactionId: 'txn-001',
          type: 'RECEIPT',
          sku: 'SKU-001',
          quantity: 100,
          timestamp: new Date(),
        },
        {
          transactionId: 'txn-002',
          type: 'DEDUCTION',
          sku: 'SKU-002',
          quantity: -50,
          timestamp: new Date(),
        },
      ];

      (stockControlService.getTransactionHistory as jest.MockedFunction<any>).mockResolvedValue({
        transactions: mockTransactions,
        total: 2,
      });

      const response = await request(app)
        .get('/api/v1/stock-control/transactions')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        transactions: mockTransactions.map(t => ({ ...t, timestamp: expect.any(String) })),
        total: 2,
      });
    });

    it('should filter by SKU', async () => {
      (stockControlService.getTransactionHistory as jest.MockedFunction<any>).mockResolvedValue({
        transactions: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/stock-control/transactions?sku=SKU-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(stockControlService.getTransactionHistory).toHaveBeenCalledWith(
        expect.objectContaining({ sku: 'SKU-001' })
      );
    });

    it('should filter by date range', async () => {
      (stockControlService.getTransactionHistory as jest.MockedFunction<any>).mockResolvedValue({
        transactions: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/stock-control/transactions?startDate=2026-01-01&endDate=2026-01-31')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(stockControlService.getTransactionHistory).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2026-01-01',
          endDate: '2026-01-31',
        })
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/stock-control/reports/low-stock
  // ==========================================================================

  describe('GET /api/v1/stock-control/reports/low-stock', () => {
    it('should get low stock report with default threshold', async () => {
      const mockReport = {
        threshold: 10,
        items: [
          { sku: 'SKU-001', name: 'Item 1', available: 5, quantity: 10 },
          { sku: 'SKU-002', name: 'Item 2', available: 0, quantity: 20 },
        ],
        generatedAt: new Date(),
      };

      (stockControlService.getLowStockReport as jest.MockedFunction<any>).mockResolvedValue(
        mockReport
      );

      const response = await request(app)
        .get('/api/v1/stock-control/reports/low-stock')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        threshold: 10,
        items: mockReport.items,
      });
      expect(stockControlService.getLowStockReport).toHaveBeenCalledWith(10);
    });

    it('should get low stock report with custom threshold', async () => {
      (stockControlService.getLowStockReport as jest.MockedFunction<any>).mockResolvedValue({
        threshold: 25,
        items: [],
        generatedAt: new Date(),
      });

      await request(app)
        .get('/api/v1/stock-control/reports/low-stock?threshold=25')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(stockControlService.getLowStockReport).toHaveBeenCalledWith(25);
    });
  });

  // ==========================================================================
  // GET /api/v1/stock-control/reports/movements
  // ==========================================================================

  describe('GET /api/v1/stock-control/reports/movements', () => {
    it('should get movement report', async () => {
      const mockReport = {
        movements: [
          {
            sku: 'SKU-001',
            name: 'Item 1',
            receipts: 500,
            deductions: 300,
            adjustments: 50,
            netChange: 250,
          },
        ],
        period: { startDate: '2026-01-01', endDate: '2026-01-31' },
        generatedAt: new Date(),
      };

      (stockControlService.getMovementReport as jest.MockedFunction<any>).mockResolvedValue(
        mockReport
      );

      const response = await request(app)
        .get('/api/v1/stock-control/reports/movements?startDate=2026-01-01&endDate=2026-01-31')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        movements: mockReport.movements,
        period: { startDate: '2026-01-01', endDate: '2026-01-31' },
      });
    });

    it('should filter by SKU', async () => {
      (stockControlService.getMovementReport as jest.MockedFunction<any>).mockResolvedValue({
        movements: [],
        period: {},
        generatedAt: new Date(),
      });

      await request(app)
        .get('/api/v1/stock-control/reports/movements?sku=SKU-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(stockControlService.getMovementReport).toHaveBeenCalledWith(
        expect.objectContaining({ sku: 'SKU-001' })
      );
    });
  });

  // ==========================================================================
  // POST /api/v1/stock-control/reconcile
  // ==========================================================================

  describe('POST /api/v1/stock-control/reconcile', () => {
    it('should reconcile discrepancies', async () => {
      const discrepancies = [
        {
          sku: 'SKU-001',
          binLocation: 'A-01-01',
          systemQuantity: 100,
          actualQuantity: 95,
          variance: -5,
          reason: 'Cycle count correction',
        },
      ];

      const mockResult = {
        reconciled: 1,
        details: [
          {
            adjustmentId: 'adj-001',
            sku: 'SKU-001',
            binLocation: 'A-01-01',
            previousQuantity: 100,
            newQuantity: 95,
            variance: -5,
            reason: 'Cycle count correction',
            performedBy: 'user-123',
            performedAt: new Date(),
          },
        ],
      };

      (stockControlService.reconcileDiscrepancies as jest.MockedFunction<any>).mockResolvedValue(
        mockResult
      );

      const response = await request(app)
        .post('/api/v1/stock-control/reconcile')
        .set('Authorization', 'Bearer valid-token')
        .send({ discrepancies })
        .expect(200);

      expect(response.body).toMatchObject({
        reconciled: 1,
        details: mockResult.details.map(d => ({ ...d, performedAt: expect.any(String) })),
      });
      expect(stockControlService.reconcileDiscrepancies).toHaveBeenCalledWith(
        discrepancies,
        'user-123'
      );
    });

    it('should return 400 if discrepancies is not an array', async () => {
      const response = await request(app)
        .post('/api/v1/stock-control/reconcile')
        .set('Authorization', 'Bearer valid-token')
        .send({ discrepancies: 'not-an-array' })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Discrepancies must be an array');
      expect(response.body).toHaveProperty('code', 'INVALID_DISCREPANCIES');
    });
  });

  // ==========================================================================
  // GET /api/v1/stock-control/bins
  // ==========================================================================

  describe('GET /api/v1/stock-control/bins', () => {
    it('should get bin locations', async () => {
      const mockBins = [
        { binId: 'A-01-01', zone: 'A', aisle: '01', shelf: '01', type: 'SHELF', active: true },
        { binId: 'B-02-03', zone: 'B', aisle: '02', shelf: '03', type: 'SHELF', active: true },
      ];

      (stockControlService.getBinLocations as jest.MockedFunction<any>).mockResolvedValue(mockBins);

      const response = await request(app)
        .get('/api/v1/stock-control/bins')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockBins);
    });

    it('should filter by zone', async () => {
      (stockControlService.getBinLocations as jest.MockedFunction<any>).mockResolvedValue([]);

      await request(app)
        .get('/api/v1/stock-control/bins?zone=A')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(stockControlService.getBinLocations).toHaveBeenCalledWith(
        expect.objectContaining({ zone: 'A' })
      );
    });

    it('should filter by active status', async () => {
      (stockControlService.getBinLocations as jest.MockedFunction<any>).mockResolvedValue([]);

      await request(app)
        .get('/api/v1/stock-control/bins?active=true')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(stockControlService.getBinLocations).toHaveBeenCalledWith(
        expect.objectContaining({ active: true })
      );
    });
  });
});
