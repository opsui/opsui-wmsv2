/**
 * Integration tests for metrics routes
 * @covers src/routes/metrics.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { metricsService } from '../../services/MetricsService';
import { authenticate, authorize } from '../../middleware';
import { UserRole } from '@opsui/shared';

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req, res, next) => {
    req.user = {
      userId: 'user-123',
      email: 'supervisor@example.com',
      role: UserRole.SUPERVISOR,
      baseRole: UserRole.SUPERVISOR,
      activeRole: null,
      effectiveRole: UserRole.SUPERVISOR,
    };
    next();
  }),
  authorize: jest.fn((...allowedRoles) => (req, res, next) => {
    const user = req.user || { role: UserRole.SUPERVISOR };
    if (allowedRoles.includes(user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  }),
}));

// Mock the metricsService
jest.mock('../../services/MetricsService');
jest.mock('../../config/logger');
jest.mock('../../db/client');

const mockedAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;
const mockedAuthorize = authorize as jest.MockedFunction<typeof authorize>;

describe('Metrics Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /api/v1/metrics/dashboard
  // ==========================================================================

  describe('GET /api/v1/metrics/dashboard', () => {
    it('should get dashboard metrics', async () => {
      const mockMetrics = {
        totalOrders: 150,
        pendingOrders: 20,
        inProgressOrders: 30,
        completedOrders: 100,
        activePickers: 8,
        activePackers: 4,
        averagePickTime: 15.5,
        averagePackTime: 8.2,
      };

      (metricsService.getDashboardMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/v1/metrics/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockMetrics);
      expect(metricsService.getDashboardMetrics).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET /api/v1/metrics/picker/:pickerId
  // ==========================================================================

  describe('GET /api/v1/metrics/picker/:pickerId', () => {
    it('should get picker performance with default date range', async () => {
      const mockPerformance = {
        pickerId: 'picker-001',
        name: 'John Doe',
        totalOrders: 50,
        completedOrders: 45,
        averagePickTime: 12.5,
        totalItems: 500,
        pickedItems: 480,
      };

      (metricsService.getPickerPerformance as jest.Mock).mockResolvedValue(mockPerformance);

      const response = await request(app)
        .get('/api/v1/metrics/picker/picker-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockPerformance);
      expect(metricsService.getPickerPerformance).toHaveBeenCalledWith(
        'picker-001',
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('should accept custom date range', async () => {
      const mockPerformance = {
        pickerId: 'picker-001',
        totalOrders: 50,
      };

      (metricsService.getPickerPerformance as jest.Mock).mockResolvedValue(mockPerformance);

      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      await request(app)
        .get(`/api/v1/metrics/picker/picker-001?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(metricsService.getPickerPerformance).toHaveBeenCalledWith(
        'picker-001',
        expect.any(Date),
        expect.any(Date)
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/metrics/pickers
  // ==========================================================================

  describe('GET /api/v1/metrics/pickers', () => {
    it('should get all pickers performance with default date range', async () => {
      const mockPerformance = [
        {
          pickerId: 'picker-001',
          name: 'John Doe',
          totalOrders: 50,
          completedOrders: 45,
        },
        {
          pickerId: 'picker-002',
          name: 'Jane Smith',
          totalOrders: 40,
          completedOrders: 38,
        },
      ];

      (metricsService.getAllPickersPerformance as jest.Mock).mockResolvedValue(mockPerformance);

      const response = await request(app)
        .get('/api/v1/metrics/pickers')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockPerformance);
      expect(metricsService.getAllPickersPerformance).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('should accept custom date range', async () => {
      const mockPerformance = [{ pickerId: 'picker-001', totalOrders: 50 }];

      (metricsService.getAllPickersPerformance as jest.Mock).mockResolvedValue(mockPerformance);

      const startDate = '2024-01-01';
      const endDate = '2024-01-31';

      await request(app)
        .get(`/api/v1/metrics/pickers?startDate=${startDate}&endDate=${endDate}`)
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(metricsService.getAllPickersPerformance).toHaveBeenCalled();
    });

    it('should handle invalid date gracefully', async () => {
      const mockPerformance = [{ pickerId: 'picker-001', totalOrders: 50 }];

      (metricsService.getAllPickersPerformance as jest.Mock).mockResolvedValue(mockPerformance);

      await request(app)
        .get('/api/v1/metrics/pickers?startDate=invalid-date')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(metricsService.getAllPickersPerformance).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET /api/v1/metrics/packers
  // ==========================================================================

  describe('GET /api/v1/metrics/packers', () => {
    it('should get all packers performance with default date range', async () => {
      const mockPerformance = [
        {
          packerId: 'packer-001',
          name: 'Alice Brown',
          totalOrders: 60,
          completedOrders: 58,
          averagePackTime: 8.5,
        },
        {
          packerId: 'packer-002',
          name: 'Bob Wilson',
          totalOrders: 55,
          completedOrders: 53,
          averagePackTime: 9.2,
        },
      ];

      (metricsService.getAllPackersPerformance as jest.Mock).mockResolvedValue(mockPerformance);

      const response = await request(app)
        .get('/api/v1/metrics/packers')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockPerformance);
      expect(metricsService.getAllPackersPerformance).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('should accept custom date range', async () => {
      const mockPerformance = [{ packerId: 'packer-001', totalOrders: 60 }];

      (metricsService.getAllPackersPerformance as jest.Mock).mockResolvedValue(mockPerformance);

      await request(app)
        .get('/api/v1/metrics/packers?startDate=2024-01-01&endDate=2024-01-31')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(metricsService.getAllPackersPerformance).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET /api/v1/metrics/stock-controllers
  // ==========================================================================

  describe('GET /api/v1/metrics/stock-controllers', () => {
    it('should get all stock controllers performance', async () => {
      const mockPerformance = [
        {
          controllerId: 'sc-001',
          name: 'Charlie Davis',
          totalTransactions: 200,
          adjustments: 15,
          replenishments: 185,
        },
      ];

      (metricsService.getAllStockControllersPerformance as jest.Mock).mockResolvedValue(
        mockPerformance
      );

      const response = await request(app)
        .get('/api/v1/metrics/stock-controllers')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockPerformance);
      expect(metricsService.getAllStockControllersPerformance).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/metrics/orders/status-breakdown
  // ==========================================================================

  describe('GET /api/v1/metrics/orders/status-breakdown', () => {
    it('should get order status breakdown', async () => {
      const mockBreakdown = {
        PENDING: 20,
        PICKING: 15,
        PICKED: 10,
        PACKING: 8,
        PACKED: 25,
        SHIPPED: 100,
        CANCELLED: 5,
      };

      (metricsService.getOrderStatusBreakdown as jest.Mock).mockResolvedValue(mockBreakdown);

      const response = await request(app)
        .get('/api/v1/metrics/orders/status-breakdown')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockBreakdown);
      expect(metricsService.getOrderStatusBreakdown).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET /api/v1/metrics/orders/hourly-throughput
  // ==========================================================================

  describe('GET /api/v1/metrics/orders/hourly-throughput', () => {
    it('should get hourly throughput', async () => {
      const mockThroughput = [
        { hour: '00:00', count: 5 },
        { hour: '01:00', count: 3 },
        { hour: '02:00', count: 2 },
      ];

      (metricsService.getHourlyThroughput as jest.Mock).mockResolvedValue(mockThroughput);

      const response = await request(app)
        .get('/api/v1/metrics/orders/hourly-throughput')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockThroughput);
      expect(metricsService.getHourlyThroughput).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET /api/v1/metrics/orders/throughput
  // ==========================================================================

  describe('GET /api/v1/metrics/orders/throughput', () => {
    it('should get daily throughput by default', async () => {
      const mockThroughput = [
        { date: '2024-01-01', count: 50 },
        { date: '2024-01-02', count: 55 },
      ];

      (metricsService.getThroughputByRange as jest.Mock).mockResolvedValue(mockThroughput);

      const response = await request(app)
        .get('/api/v1/metrics/orders/throughput')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockThroughput);
      expect(metricsService.getThroughputByRange).toHaveBeenCalledWith('daily');
    });

    it('should get weekly throughput', async () => {
      const mockThroughput = [{ week: '2024-W01', count: 300 }];

      (metricsService.getThroughputByRange as jest.Mock).mockResolvedValue(mockThroughput);

      await request(app)
        .get('/api/v1/metrics/orders/throughput?range=weekly')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(metricsService.getThroughputByRange).toHaveBeenCalledWith('weekly');
    });

    it('should get monthly throughput', async () => {
      const mockThroughput = [{ month: '2024-01', count: 1200 }];

      (metricsService.getThroughputByRange as jest.Mock).mockResolvedValue(mockThroughput);

      await request(app)
        .get('/api/v1/metrics/orders/throughput?range=monthly')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(metricsService.getThroughputByRange).toHaveBeenCalledWith('monthly');
    });

    it('should return 400 for invalid range', async () => {
      const response = await request(app)
        .get('/api/v1/metrics/orders/throughput?range=invalid')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid range. Must be one of: daily, weekly, monthly, quarterly, yearly',
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/metrics/skus/top-picked
  // ==========================================================================

  describe('GET /api/v1/metrics/skus/top-picked', () => {
    it('should get top picked SKUs with default parameters', async () => {
      const mockSKUs = [
        { sku: 'SKU-001', count: 150 },
        { sku: 'SKU-002', count: 120 },
      ];

      (metricsService.getTopSKUsByScanType as jest.Mock).mockResolvedValue(mockSKUs);

      const response = await request(app)
        .get('/api/v1/metrics/skus/top-picked')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockSKUs);
      expect(metricsService.getTopSKUsByScanType).toHaveBeenCalledWith('pick', 10, 'monthly');
    });

    it('should accept custom limit', async () => {
      const mockSKUs = [{ sku: 'SKU-001', count: 150 }];

      (metricsService.getTopSKUsByScanType as jest.Mock).mockResolvedValue(mockSKUs);

      await request(app)
        .get('/api/v1/metrics/skus/top-picked?limit=20')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(metricsService.getTopSKUsByScanType).toHaveBeenCalledWith('pick', 20, 'monthly');
    });

    it('should accept custom scan type', async () => {
      const mockSKUs = [{ sku: 'SKU-001', count: 150 }];

      (metricsService.getTopSKUsByScanType as jest.Mock).mockResolvedValue(mockSKUs);

      await request(app)
        .get('/api/v1/metrics/skus/top-picked?scanType=pack')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(metricsService.getTopSKUsByScanType).toHaveBeenCalledWith('pack', 10, 'monthly');
    });

    it('should accept custom time period', async () => {
      const mockSKUs = [{ sku: 'SKU-001', count: 150 }];

      (metricsService.getTopSKUsByScanType as jest.Mock).mockResolvedValue(mockSKUs);

      await request(app)
        .get('/api/v1/metrics/skus/top-picked?timePeriod=weekly')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(metricsService.getTopSKUsByScanType).toHaveBeenCalledWith('pick', 10, 'weekly');
    });

    it('should return 400 for invalid scan type', async () => {
      const response = await request(app)
        .get('/api/v1/metrics/skus/top-picked?scanType=invalid')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid scanType. Must be one of: pick, pack, verify, all',
      });
    });

    it('should return 400 for invalid time period', async () => {
      const response = await request(app)
        .get('/api/v1/metrics/skus/top-picked?timePeriod=invalid')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body).toEqual({
        error: 'Invalid timePeriod. Must be one of: daily, weekly, monthly, yearly',
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/metrics/picker-activity
  // ==========================================================================

  describe('GET /api/v1/metrics/picker-activity', () => {
    it('should get real-time picker activity', async () => {
      const mockActivity = [
        {
          pickerId: 'picker-001',
          name: 'John Doe',
          currentOrder: 'ORD-20240101-001',
          status: 'PICKING',
          itemsCompleted: 5,
          itemsTotal: 10,
        },
      ];

      (metricsService.getPickerActivity as jest.Mock).mockResolvedValue(mockActivity);

      const response = await request(app)
        .get('/api/v1/metrics/picker-activity')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockActivity);
      expect(metricsService.getPickerActivity).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET /api/v1/metrics/picker/:pickerId/orders
  // ==========================================================================

  describe('GET /api/v1/metrics/picker/:pickerId/orders', () => {
    it('should get picker orders', async () => {
      const mockOrders = [
        {
          orderId: 'ORD-20240101-001',
          status: 'PICKING',
          itemsCompleted: 5,
          itemsTotal: 10,
        },
        {
          orderId: 'ORD-20240101-002',
          status: 'PICKED',
          itemsCompleted: 8,
          itemsTotal: 8,
        },
      ];

      (metricsService.getPickerOrders as jest.Mock).mockResolvedValue(mockOrders);

      const response = await request(app)
        .get('/api/v1/metrics/picker/picker-001/orders')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockOrders);
      expect(metricsService.getPickerOrders).toHaveBeenCalledWith('picker-001');
    });
  });

  // ==========================================================================
  // GET /api/v1/metrics/packer-activity
  // ==========================================================================

  describe('GET /api/v1/metrics/packer-activity', () => {
    it('should get real-time packer activity', async () => {
      const mockActivity = [
        {
          packerId: 'packer-001',
          name: 'Alice Brown',
          currentOrder: 'ORD-20240101-003',
          status: 'PACKING',
        },
      ];

      (metricsService.getPackerActivity as jest.Mock).mockResolvedValue(mockActivity);

      const response = await request(app)
        .get('/api/v1/metrics/packer-activity')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockActivity);
      expect(metricsService.getPackerActivity).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET /api/v1/metrics/packer/:packerId/orders
  // ==========================================================================

  describe('GET /api/v1/metrics/packer/:packerId/orders', () => {
    it('should get packer orders', async () => {
      const mockOrders = [
        {
          orderId: 'ORD-20240101-003',
          status: 'PACKING',
          packagesCompleted: 1,
          packagesTotal: 2,
        },
      ];

      (metricsService.getPackerOrders as jest.Mock).mockResolvedValue(mockOrders);

      const response = await request(app)
        .get('/api/v1/metrics/packer/packer-001/orders')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockOrders);
      expect(metricsService.getPackerOrders).toHaveBeenCalledWith('packer-001');
    });
  });

  // ==========================================================================
  // GET /api/v1/metrics/stock-controller-activity
  // ==========================================================================

  describe('GET /api/v1/metrics/stock-controller-activity', () => {
    it('should get real-time stock controller activity', async () => {
      const mockActivity = [
        {
          controllerId: 'sc-001',
          name: 'Charlie Davis',
          activeTask: 'Inventory Adjustment',
          taskStatus: 'IN_PROGRESS',
        },
      ];

      (metricsService.getStockControllerActivity as jest.Mock).mockResolvedValue(mockActivity);

      const response = await request(app)
        .get('/api/v1/metrics/stock-controller-activity')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockActivity);
      expect(metricsService.getStockControllerActivity).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET /api/v1/metrics/stock-controller/:controllerId/transactions
  // ==========================================================================

  describe('GET /api/v1/metrics/stock-controller/:controllerId/transactions', () => {
    it('should get stock controller transactions with default limit', async () => {
      const mockDate = new Date();
      const mockTransactions = [
        {
          transactionId: 'txn-001',
          type: 'ADJUSTMENT',
          sku: 'SKU-001',
          quantity: -5,
          timestamp: mockDate,
        },
        {
          transactionId: 'txn-002',
          type: 'REPLENISHMENT',
          sku: 'SKU-002',
          quantity: 50,
          timestamp: mockDate,
        },
      ];

      (metricsService.getStockControllerTransactions as jest.Mock).mockResolvedValue(
        mockTransactions
      );

      const response = await request(app)
        .get('/api/v1/metrics/stock-controller/sc-001/transactions')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      // Dates are serialized as ISO strings in JSON
      const expectedTransactions = mockTransactions.map(txn => ({
        ...txn,
        timestamp: mockDate.toISOString(),
      }));
      expect(response.body).toEqual(expectedTransactions);
      expect(metricsService.getStockControllerTransactions).toHaveBeenCalledWith('sc-001', 50);
    });

    it('should accept custom limit', async () => {
      const mockTransactions = [{ transactionId: 'txn-001', type: 'ADJUSTMENT' }];

      (metricsService.getStockControllerTransactions as jest.Mock).mockResolvedValue(
        mockTransactions
      );

      await request(app)
        .get('/api/v1/metrics/stock-controller/sc-001/transactions?limit=20')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(metricsService.getStockControllerTransactions).toHaveBeenCalledWith('sc-001', 20);
    });
  });

  // ==========================================================================
  // GET /api/v1/metrics/my-performance
  // ==========================================================================

  describe('GET /api/v1/metrics/my-performance', () => {
    // Override the authenticate mock for these tests to use PICKER role
    beforeAll(() => {
      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = {
          userId: 'picker-001',
          email: 'picker@example.com',
          role: UserRole.PICKER,
          baseRole: UserRole.PICKER,
          activeRole: null,
          effectiveRole: UserRole.PICKER,
        };
        next();
      });
    });

    afterAll(() => {
      // Reset to SUPERVISOR role
      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = {
          userId: 'user-123',
          email: 'supervisor@example.com',
          role: UserRole.SUPERVISOR,
          baseRole: UserRole.SUPERVISOR,
          activeRole: null,
          effectiveRole: UserRole.SUPERVISOR,
        };
        next();
      });
    });

    it('should get current user performance with default date range', async () => {
      const mockPerformance = {
        userId: 'picker-001',
        totalOrders: 50,
        completedOrders: 45,
        averagePickTime: 12.5,
      };

      (metricsService.getPickerPerformance as jest.Mock).mockResolvedValue(mockPerformance);

      const response = await request(app)
        .get('/api/v1/metrics/my-performance')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockPerformance);
      expect(metricsService.getPickerPerformance).toHaveBeenCalledWith(
        'picker-001',
        expect.any(Date),
        expect.any(Date)
      );
    });

    it('should accept custom date range', async () => {
      const mockPerformance = {
        userId: 'picker-001',
        totalOrders: 50,
      };

      (metricsService.getPickerPerformance as jest.Mock).mockResolvedValue(mockPerformance);

      await request(app)
        .get('/api/v1/metrics/my-performance?startDate=2024-01-01&endDate=2024-01-31')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(metricsService.getPickerPerformance).toHaveBeenCalledWith(
        'picker-001',
        expect.any(Date),
        expect.any(Date)
      );
    });
  });
});
