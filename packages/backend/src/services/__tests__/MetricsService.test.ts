/**
 * Unit tests for MetricsService
 * @covers src/services/MetricsService.ts
 */

import { MetricsService } from '../MetricsService';

// Mock all dependencies
jest.mock('../../db/client', () => ({
  query: jest.fn(),
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
}));

describe('MetricsService', () => {
  let metricsService: MetricsService;

  beforeEach(() => {
    jest.clearAllMocks();
    metricsService = new MetricsService();
  });

  // ==========================================================================
  // GET DASHBOARD METRICS
  // ==========================================================================

  describe('getDashboardMetrics', () => {
    it('should return dashboard metrics', async () => {
      const mockQuery = require('../../db/client').query;

      // Mock active staff query
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '5' }],
      });
      // Mock orders per hour query
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '120' }],
      });
      // Mock queue depth query
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '25' }],
      });
      // Mock exceptions query
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '3' }],
      });
      // Mock today throughput query
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '450' }],
      });
      // Mock week throughput query
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '2100' }],
      });
      // Mock month throughput query
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '8500' }],
      });

      const result = await metricsService.getDashboardMetrics();

      expect(result).toHaveProperty('activePickers', 5);
      expect(result).toHaveProperty('ordersPickedPerHour', 120);
      expect(result).toHaveProperty('queueDepth', 25);
      expect(result).toHaveProperty('exceptions', 3);
      expect(result.throughput).toHaveProperty('today', 450);
      expect(result.throughput).toHaveProperty('week', 2100);
      expect(result.throughput).toHaveProperty('month', 8500);
    });
  });

  // ==========================================================================
  // GET PICKER PERFORMANCE
  // ==========================================================================

  describe('getPickerPerformance', () => {
    it('should return picker performance metrics', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            tasks_completed: '45',
            tasks_total: '50',
            avg_time: '180.5',
            total_picked: '230',
            orders_completed: '42',
          },
        ],
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await metricsService.getPickerPerformance('picker-123', startDate, endDate);

      expect(result).toHaveProperty('tasksCompleted', 45);
      expect(result).toHaveProperty('tasksTotal', 50);
      expect(result).toHaveProperty('averageTimePerTask', 180.5);
      expect(result).toHaveProperty('totalItemsPicked', 230);
      expect(result).toHaveProperty('ordersCompleted', 42);
    });
  });

  // ==========================================================================
  // GET ALL PICKERS PERFORMANCE
  // ==========================================================================

  describe('getAllPickersPerformance', () => {
    it('should return all pickers performance', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            pickerId: 'picker-1',
            pickerName: 'John Doe',
            tasksCompleted: '100',
            ordersCompleted: '95',
            totalPicked: '500',
            avgTime: '165.2',
          },
          {
            pickerId: 'picker-2',
            pickerName: 'Jane Smith',
            tasksCompleted: '85',
            ordersCompleted: '80',
            totalPicked: '420',
            avgTime: '175.8',
          },
        ],
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await metricsService.getAllPickersPerformance(startDate, endDate);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('pickerId', 'picker-1');
      expect(result[0]).toHaveProperty('pickerName', 'John Doe');
      expect(result[0]).toHaveProperty('tasksCompleted', 100);
      expect(result[0]).toHaveProperty('ordersCompleted', 95);
      expect(result[0]).toHaveProperty('totalItemsPicked', 500);
      expect(result[0]).toHaveProperty('averageTimePerTask', 165.2);
    });
  });

  // ==========================================================================
  // GET ALL PACKERS PERFORMANCE
  // ==========================================================================

  describe('getAllPackersPerformance', () => {
    it('should return all packers performance', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            packerId: 'packer-1',
            packerName: 'Bob Wilson',
            tasksCompleted: '120',
            ordersCompleted: '115',
            totalPacked: '600',
            avgTime: '95.3',
          },
        ],
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await metricsService.getAllPackersPerformance(startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('packerId', 'packer-1');
      expect(result[0]).toHaveProperty('packerName', 'Bob Wilson');
      expect(result[0]).toHaveProperty('tasksCompleted', 120);
      expect(result[0]).toHaveProperty('ordersCompleted', 115);
      expect(result[0]).toHaveProperty('totalItemsProcessed', 600);
      expect(result[0]).toHaveProperty('averageTimePerTask', 95.3);
    });
  });

  // ==========================================================================
  // GET ALL STOCK CONTROLLERS PERFORMANCE
  // ==========================================================================

  describe('getAllStockControllersPerformance', () => {
    it('should return all stock controllers performance', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            controllerId: 'controller-1',
            controllerName: 'Alice Brown',
            transactionsCompleted: '75',
            totalProcessed: '300',
            avgTime: '120.5',
          },
        ],
      });

      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      const result = await metricsService.getAllStockControllersPerformance(startDate, endDate);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('controllerId', 'controller-1');
      expect(result[0]).toHaveProperty('controllerName', 'Alice Brown');
      expect(result[0]).toHaveProperty('tasksCompleted', 75);
      expect(result[0]).toHaveProperty('transactionsCompleted', 75);
      expect(result[0]).toHaveProperty('totalItemsProcessed', 300);
      expect(result[0]).toHaveProperty('averageTimePerTask', 120.5);
    });
  });

  // ==========================================================================
  // GET PICKER ACTIVITY
  // ==========================================================================

  describe('getPickerActivity', () => {
    it('should return picker activity with ACTIVE status', async () => {
      const mockQuery = require('../../db/client').query;

      // Mock active pickers query
      mockQuery.mockResolvedValueOnce({
        rows: [{ userId: 'picker-1', name: 'John Doe', active: true }],
      });

      // Mock for picker-1: activeOrder, recentOrder, allRecentOrders, recentTask, userData
      mockQuery.mockResolvedValueOnce({ rows: [] }); // activeOrder
      mockQuery.mockResolvedValueOnce({
        // recentOrder
        rows: [
          {
            orderId: 'ORD-20240101-0001',
            status: 'PICKED',
            progress: 100,
            updatedAt: new Date(),
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        // allRecentOrders
        rows: [
          {
            orderId: 'ORD-20240101-0001',
            status: 'PICKED',
            progress: 100,
            updatedAt: new Date(),
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        // recentTask
        rows: [
          {
            pickTaskId: 'task-1',
            startedAt: new Date(),
            completedAt: new Date(),
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        // userData
        rows: [
          {
            lastLoginAt: new Date(),
            currentView: 'Order Queue',
            currentViewUpdatedAt: new Date(),
            active: true,
          },
        ],
      });

      const result = await metricsService.getPickerActivity();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('pickerId', 'picker-1');
      expect(result[0]).toHaveProperty('pickerName', 'John Doe');
      expect(result[0]).toHaveProperty('status', 'ACTIVE');
      expect(result[0]).toHaveProperty('currentView', 'Order Queue');
    });

    it('should return empty array when no pickers found', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await metricsService.getPickerActivity();

      expect(result).toEqual([]);
    });

    it('should return PICKING status when picker is on picking page', async () => {
      const mockQuery = require('../../db/client').query;

      // Mock active pickers query
      mockQuery.mockResolvedValueOnce({
        rows: [{ userId: 'picker-1', name: 'John Doe', active: true }],
      });

      // Mock for picker-1
      mockQuery.mockResolvedValueOnce({ rows: [] }); // activeOrder
      mockQuery.mockResolvedValueOnce({
        // recentOrder
        rows: [
          {
            orderId: 'ORD-20240101-0001',
            status: 'PICKING',
            progress: 50,
            updatedAt: new Date(),
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        // allRecentOrders
        rows: [
          {
            orderId: 'ORD-20240101-0001',
            status: 'PICKING',
            progress: 50,
            updatedAt: new Date(),
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        // recentTask
        rows: [
          {
            pickTaskId: 'task-1',
            startedAt: new Date(),
            completedAt: null,
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        // userData
        rows: [
          {
            lastLoginAt: new Date(),
            currentView: 'Picking Order ORD-20240101-0001',
            currentViewUpdatedAt: new Date(),
            active: true,
          },
        ],
      });

      const result = await metricsService.getPickerActivity();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('status', 'PICKING');
      expect(result[0]).toHaveProperty('currentOrderId', 'ORD-20240101-0001');
      expect(result[0]).toHaveProperty('orderProgress', 50);
    });

    it('should return INACTIVE status when picker is not active', async () => {
      const mockQuery = require('../../db/client').query;

      // Mock active pickers query
      mockQuery.mockResolvedValueOnce({
        rows: [{ userId: 'picker-1', name: 'John Doe', active: true }],
      });

      // Mock for picker-1
      mockQuery.mockResolvedValueOnce({ rows: [] }); // activeOrder
      mockQuery.mockResolvedValueOnce({ rows: [] }); // recentOrder
      mockQuery.mockResolvedValueOnce({ rows: [] }); // allRecentOrders
      mockQuery.mockResolvedValueOnce({ rows: [] }); // recentTask
      mockQuery.mockResolvedValueOnce({
        // userData - active = false
        rows: [
          {
            lastLoginAt: new Date(),
            currentView: null,
            currentViewUpdatedAt: null,
            active: false,
          },
        ],
      });

      const result = await metricsService.getPickerActivity();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('status', 'INACTIVE');
      expect(result[0].currentOrderId).toBeNull();
    });

    it('should return IDLE status when picker has no current view', async () => {
      const mockQuery = require('../../db/client').query;

      // Mock active pickers query
      mockQuery.mockResolvedValueOnce({
        rows: [{ userId: 'picker-1', name: 'John Doe', active: true }],
      });

      // Mock for picker-1
      mockQuery.mockResolvedValueOnce({ rows: [] }); // activeOrder
      mockQuery.mockResolvedValueOnce({ rows: [] }); // recentOrder
      mockQuery.mockResolvedValueOnce({ rows: [] }); // allRecentOrders
      mockQuery.mockResolvedValueOnce({ rows: [] }); // recentTask
      mockQuery.mockResolvedValueOnce({
        // userData - active = true but currentView = null
        rows: [
          {
            lastLoginAt: new Date(),
            currentView: null,
            currentViewUpdatedAt: null,
            active: true,
          },
        ],
      });

      const result = await metricsService.getPickerActivity();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('status', 'IDLE');
    });
  });

  // ==========================================================================
  // GET ORDER STATUS BREAKDOWN
  // ==========================================================================

  describe('getOrderStatusBreakdown', () => {
    it('should return order status breakdown', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          { status: 'PENDING', count: '25' },
          { status: 'PICKING', count: '15' },
          { status: 'PICKED', count: '10' },
          { status: 'PACKING', count: '8' },
          { status: 'PACKED', count: '5' },
          { status: 'SHIPPED', count: '45' },
        ],
      });

      const result = await metricsService.getOrderStatusBreakdown();

      expect(result).toHaveLength(6);
      expect(result[0]).toEqual({ status: 'PENDING', count: 25 });
      expect(result[5]).toEqual({ status: 'SHIPPED', count: 45 });
    });
  });

  // ==========================================================================
  // GET HOURLY THROUGHPUT
  // ==========================================================================

  describe('getHourlyThroughput', () => {
    it('should return hourly throughput data', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          { hour: '2024-01-15 14:00', picked: '45', shipped: '40' },
          { hour: '2024-01-15 13:00', picked: '50', shipped: '48' },
          { hour: '2024-01-15 12:00', picked: '55', shipped: '52' },
        ],
      });

      const result = await metricsService.getHourlyThroughput();

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        hour: '2024-01-15 14:00',
        picked: 45,
        shipped: 40,
      });
    });
  });

  // ==========================================================================
  // GET THROUGHPUT BY RANGE
  // ==========================================================================

  describe('getThroughputByRange', () => {
    it('should return daily throughput', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          { period: '2024-01-15', picked: '450', shipped: '445' },
          { period: '2024-01-14', picked: '460', shipped: '455' },
        ],
      });

      const result = await metricsService.getThroughputByRange('daily');

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        period: '2024-01-15',
        picked: 450,
        shipped: 445,
      });
    });

    it('should return weekly throughput', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [{ period: '2024-W02', picked: '2100', shipped: '2050' }],
      });

      const result = await metricsService.getThroughputByRange('weekly');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        period: '2024-W02',
        picked: 2100,
        shipped: 2050,
      });
    });

    it('should return monthly throughput', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [{ period: '2024-01', picked: '8500', shipped: '8200' }],
      });

      const result = await metricsService.getThroughputByRange('monthly');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        period: '2024-01',
        picked: 8500,
        shipped: 8200,
      });
    });
  });

  // ==========================================================================
  // GET TOP SKUS BY PICK FREQUENCY
  // ==========================================================================

  describe('getTopSKUsByPickFrequency', () => {
    it('should return top SKUs by pick frequency', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          { sku: 'SKU-001', name: 'Product A', picks: '150' },
          { sku: 'SKU-002', name: 'Product B', picks: '125' },
          { sku: 'SKU-003', name: 'Product C', picks: '100' },
        ],
      });

      const result = await metricsService.getTopSKUsByPickFrequency(10);

      expect(result).toHaveLength(3);
      expect(result[0]).toEqual({
        sku: 'SKU-001',
        name: 'Product A',
        picks: 150,
      });
    });

    it('should respect the limit parameter', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          { sku: 'SKU-001', name: 'Product A', picks: '150' },
          { sku: 'SKU-002', name: 'Product B', picks: '125' },
        ],
      });

      const result = await metricsService.getTopSKUsByPickFrequency(2);

      expect(result).toHaveLength(2);
    });
  });

  // ==========================================================================
  // GET TOP SKUS BY SCAN TYPE
  // ==========================================================================

  describe('getTopSKUsByScanType', () => {
    it('should return top SKUs by pick scan type', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          { sku: 'SKU-001', name: 'Product A', picks: '150' },
          { sku: 'SKU-002', name: 'Product B', picks: '125' },
        ],
      });

      const result = await metricsService.getTopSKUsByScanType('pick', 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('sku', 'SKU-001');
      expect(result[0]).toHaveProperty('picks', 150);
    });

    it('should return top SKUs by pack scan type', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          { sku: 'SKU-001', name: 'Product A', packVerifies: '100' },
          { sku: 'SKU-002', name: 'Product B', packVerifies: '85' },
        ],
      });

      const result = await metricsService.getTopSKUsByScanType('pack', 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('sku', 'SKU-001');
      expect(result[0]).toHaveProperty('packVerifies', 100);
    });

    it('should return top SKUs by verify scan type', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          { sku: 'SKU-001', name: 'Product A', scans: '200' },
          { sku: 'SKU-002', name: 'Product B', scans: '175' },
        ],
      });

      const result = await metricsService.getTopSKUsByScanType('verify', 10);

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('sku', 'SKU-001');
      expect(result[0]).toHaveProperty('scans', 200);
    });

    it('should return top SKUs by all scan types', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            sku: 'SKU-001',
            name: 'Product A',
            picks: '150',
            scans: '200',
            packVerifies: '100',
            total: '450',
          },
        ],
      });

      const result = await metricsService.getTopSKUsByScanType('all', 10);

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('sku', 'SKU-001');
      expect(result[0]).toHaveProperty('picks', 150);
      expect(result[0]).toHaveProperty('scans', 200);
      expect(result[0]).toHaveProperty('packVerifies', 100);
    });

    it('should support different time periods', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [{ sku: 'SKU-001', name: 'Product A', picks: '150' }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ sku: 'SKU-001', name: 'Product A', picks: '200' }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ sku: 'SKU-001', name: 'Product A', picks: '300' }],
      });

      await metricsService.getTopSKUsByScanType('pick', 10, 'weekly');
      await metricsService.getTopSKUsByScanType('pick', 10, 'monthly');
      await metricsService.getTopSKUsByScanType('pick', 10, 'yearly');

      expect(mockQuery).toHaveBeenCalledTimes(3);
    });
  });

  // ==========================================================================
  // GET PICKER ORDERS
  // ==========================================================================

  describe('getPickerOrders', () => {
    it('should return orders for a picker with items', async () => {
      const mockQuery = require('../../db/client').query;

      // Mock orders query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            orderId: 'ORD-20240101-0001',
            status: 'PICKING',
            progress: '50',
            customerName: 'John Doe',
            priority: 'HIGH',
            itemCount: '3',
          },
        ],
      });

      // Mock order items query
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            orderId: 'ORD-20240101-0001',
            sku: 'SKU-001',
            name: 'Product A',
            quantity: '10',
            pickedQuantity: '10',
            binLocation: 'A-01-01',
            status: 'PENDING',
          },
          {
            orderId: 'ORD-20240101-0001',
            sku: 'SKU-002',
            name: 'Product B',
            quantity: '5',
            pickedQuantity: '3',
            binLocation: 'A-01-02',
            status: 'PENDING',
          },
          {
            orderId: 'ORD-20240101-0001',
            sku: 'SKU-003',
            name: 'Product C',
            quantity: '2',
            pickedQuantity: '0',
            binLocation: 'A-01-03',
            status: 'PENDING',
          },
        ],
      });

      const result = await metricsService.getPickerOrders('picker-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('orderId', 'ORD-20240101-0001');
      expect(result[0]).toHaveProperty('status', 'PICKING');
      expect(result[0]).toHaveProperty('progress', 50);
      expect(result[0].items).toHaveLength(3);

      // Check item status calculation
      expect(result[0].items[0]).toHaveProperty('status', 'FULLY_PICKED');
      expect(result[0].items[1]).toHaveProperty('status', 'PARTIAL_PICKED');
      expect(result[0].items[2]).toHaveProperty('status', 'PENDING');
    });

    it('should return empty array when picker has no orders', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await metricsService.getPickerOrders('picker-123');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // GET PACKER ACTIVITY
  // ==========================================================================

  describe('getPackerActivity', () => {
    it('should return packer activity with ACTIVE status', async () => {
      const mockQuery = require('../../db/client').query;

      // Mock active packers query
      mockQuery.mockResolvedValueOnce({
        rows: [{ userId: 'packer-1', name: 'Bob Wilson', active: true }],
      });

      // Mock for packer-1: activeOrder, recentOrder, allRecentOrders, userData
      mockQuery.mockResolvedValueOnce({ rows: [] }); // activeOrder
      mockQuery.mockResolvedValueOnce({
        // recentOrder
        rows: [
          {
            orderId: 'ORD-20240101-0002',
            status: 'PICKED',
            progress: 100,
            updatedAt: new Date(),
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        // allRecentOrders
        rows: [
          {
            orderId: 'ORD-20240101-0002',
            status: 'PICKED',
            progress: 100,
            updatedAt: new Date(),
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        // userData
        rows: [
          {
            lastLoginAt: new Date(),
            currentView: 'Packing Queue',
            currentViewUpdatedAt: new Date(),
            active: true,
          },
        ],
      });

      const result = await metricsService.getPackerActivity();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('packerId', 'packer-1');
      expect(result[0]).toHaveProperty('packerName', 'Bob Wilson');
      expect(result[0]).toHaveProperty('status', 'ACTIVE');
    });

    it('should return PACKING status when packer is on packing page', async () => {
      const mockQuery = require('../../db/client').query;

      // Mock active packers query
      mockQuery.mockResolvedValueOnce({
        rows: [{ userId: 'packer-1', name: 'Bob Wilson', active: true }],
      });

      // Mock for packer-1
      mockQuery.mockResolvedValueOnce({ rows: [] }); // activeOrder
      mockQuery.mockResolvedValueOnce({
        // recentOrder
        rows: [
          {
            orderId: 'ORD-20240101-0002',
            status: 'PACKING',
            progress: 75,
            updatedAt: new Date(),
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        // allRecentOrders
        rows: [
          {
            orderId: 'ORD-20240101-0002',
            status: 'PACKING',
            progress: 75,
            updatedAt: new Date(),
          },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        // userData
        rows: [
          {
            lastLoginAt: new Date(),
            currentView: 'Packing Order ORD-20240101-0002',
            currentViewUpdatedAt: new Date(),
            active: true,
          },
        ],
      });

      const result = await metricsService.getPackerActivity();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('status', 'PACKING');
      expect(result[0]).toHaveProperty('currentOrderId', 'ORD-20240101-0002');
    });
  });

  // ==========================================================================
  // GET PACKER ORDERS
  // ==========================================================================

  describe('getPackerOrders', () => {
    it('should return orders for a packer', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            orderId: 'ORD-20240101-0001',
            status: 'PICKED',
            progress: '100',
            customerName: 'John Doe',
            priority: 'NORMAL',
            itemCount: '5',
          },
          {
            orderId: 'ORD-20240101-0002',
            status: 'PACKING',
            progress: '60',
            customerName: 'Jane Smith',
            priority: 'HIGH',
            itemCount: '3',
          },
        ],
      });

      const result = await metricsService.getPackerOrders('packer-123');

      expect(result).toHaveLength(2);
      expect(result[0]).toHaveProperty('orderId', 'ORD-20240101-0001');
      expect(result[0]).toHaveProperty('status', 'PICKED');
      expect(result[1]).toHaveProperty('orderId', 'ORD-20240101-0002');
      expect(result[1]).toHaveProperty('status', 'PACKING');
    });

    it('should include unassigned orders in PICKED status', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            orderId: 'ORD-20240101-0001',
            status: 'PICKED',
            progress: '100',
            customerName: 'John Doe',
            priority: 'NORMAL',
            itemCount: '5',
          },
        ],
      });

      const result = await metricsService.getPackerOrders('packer-123');

      expect(result).toHaveLength(1);
    });
  });

  // ==========================================================================
  // GET STOCK CONTROLLER ACTIVITY
  // ==========================================================================

  describe('getStockControllerActivity', () => {
    it('should return stock controller activity with ACTIVE status', async () => {
      const mockQuery = require('../../db/client').query;

      // Mock active controllers query
      mockQuery.mockResolvedValueOnce({
        rows: [{ userId: 'controller-1', name: 'Alice Brown', active: true }],
      });

      // Mock userData for controller-1
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            lastLoginAt: new Date(),
            currentView: 'Inventory Management',
            currentViewUpdatedAt: new Date(),
            active: true,
          },
        ],
      });

      const result = await metricsService.getStockControllerActivity();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('controllerId', 'controller-1');
      expect(result[0]).toHaveProperty('controllerName', 'Alice Brown');
      expect(result[0]).toHaveProperty('status', 'ACTIVE');
      expect(result[0]).toHaveProperty('currentView', 'Inventory Management');
    });

    it('should return IDLE status when controller has no current view', async () => {
      const mockQuery = require('../../db/client').query;

      // Mock active controllers query
      mockQuery.mockResolvedValueOnce({
        rows: [{ userId: 'controller-1', name: 'Alice Brown', active: true }],
      });

      // Mock userData for controller-1
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            lastLoginAt: new Date(),
            currentView: null,
            currentViewUpdatedAt: null,
            active: true,
          },
        ],
      });

      const result = await metricsService.getStockControllerActivity();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('status', 'IDLE');
    });

    it('should return INACTIVE status when controller is not active', async () => {
      const mockQuery = require('../../db/client').query;

      // Mock active controllers query
      mockQuery.mockResolvedValueOnce({
        rows: [{ userId: 'controller-1', name: 'Alice Brown', active: true }],
      });

      // Mock userData for controller-1
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            lastLoginAt: new Date(),
            currentView: null,
            currentViewUpdatedAt: null,
            active: false,
          },
        ],
      });

      const result = await metricsService.getStockControllerActivity();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('status', 'INACTIVE');
    });
  });

  // ==========================================================================
  // GET STOCK CONTROLLER TRANSACTIONS
  // ==========================================================================

  describe('getStockControllerTransactions', () => {
    it('should return transactions for a stock controller', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            transactionId: 'txn-001',
            sku: 'SKU-001',
            binLocation: 'A-01-01',
            type: 'ADJUSTMENT',
            quantityChange: '-5',
            reason: 'Damaged goods',
            createdAt: new Date('2024-01-15T10:30:00Z'),
          },
          {
            transactionId: 'txn-002',
            sku: 'SKU-002',
            binLocation: 'B-02-03',
            type: 'RECEIPT',
            quantityChange: '100',
            reason: 'New stock',
            createdAt: new Date('2024-01-15T11:00:00Z'),
          },
        ],
      });

      const result = await metricsService.getStockControllerTransactions('controller-123', 50);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        transactionId: 'txn-001',
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        type: 'ADJUSTMENT',
        quantityChange: -5,
        reason: 'Damaged goods',
        createdAt: new Date('2024-01-15T10:30:00Z'),
      });
      expect(result[1]).toEqual({
        transactionId: 'txn-002',
        sku: 'SKU-002',
        binLocation: 'B-02-03',
        type: 'RECEIPT',
        quantityChange: 100,
        reason: 'New stock',
        createdAt: new Date('2024-01-15T11:00:00Z'),
      });
    });

    it('should respect the limit parameter', async () => {
      const mockQuery = require('../../db/client').query;

      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            transactionId: 'txn-001',
            sku: 'SKU-001',
            binLocation: 'A-01-01',
            type: 'ADJUSTMENT',
            quantityChange: '-5',
            reason: 'Damaged goods',
            createdAt: new Date('2024-01-15T10:30:00Z'),
          },
        ],
      });

      const result = await metricsService.getStockControllerTransactions('controller-123', 10);

      expect(result).toHaveLength(1);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('LIMIT $2'), [
        'controller-123',
        10,
      ]);
    });
  });
});
