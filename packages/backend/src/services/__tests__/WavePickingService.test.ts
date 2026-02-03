/**
 * Wave Picking Service Tests
 *
 * Tests for wave picking optimization including wave creation,
 * release, status tracking, and completion
 */

import {
  WavePickingService,
  wavePickingService,
  WaveStrategy,
  WaveStatus,
} from '../WavePickingService';
import { logger } from '../../config/logger';
import { getAuditService } from '../AuditService';
import { notifyAll } from '../NotificationHelper';
import wsServer from '../../websocket';
import { routeOptimizationService } from '../RouteOptimizationService';

// Mock dependencies
jest.mock('../../config/logger');
jest.mock('../AuditService');
jest.mock('../NotificationHelper');
jest.mock('../RouteOptimizationService');
jest.mock('../../websocket');

describe('WavePickingService', () => {
  let service: WavePickingService;
  let mockAuditService: any;

  beforeEach(() => {
    service = new WavePickingService();

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    (getAuditService as jest.Mock).mockReturnValue(mockAuditService);

    // Reset global mockPool.query and mockPool.connect with default return values
    global.mockPool.query = jest.fn().mockResolvedValue({ rows: [], rowCount: 0 });
    global.mockPool.connect = jest.fn().mockResolvedValue({
      query: jest.fn().mockResolvedValue({ rows: [], rowCount: 0 }),
      release: jest.fn(),
    });

    // Mock route optimization
    (routeOptimizationService.optimizeRoute as jest.Mock).mockReturnValue({
      tasks: [],
      estimatedTime: 3600,
      totalDistance: 500,
    });

    // Mock WebSocket broadcaster
    const mockBroadcaster = {
      broadcastGlobalNotification: jest.fn(),
      broadcastZoneAssignment: jest.fn(),
    };
    (wsServer.getBroadcaster as jest.Mock).mockReturnValue(mockBroadcaster);

    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // WAVE CREATION
  // ==========================================================================

  describe('createWave', () => {
    it('should create a CARRIER strategy wave successfully', async () => {
      const criteria = {
        strategy: WaveStrategy.CARRIER,
        maxOrdersPerWave: 50,
        carrierCutoff: new Date('2024-01-01T14:00:00Z'),
      };

      const mockOrders = [
        { order_id: 'ORD-001', priority: 'HIGH', item_count: 5 },
        { order_id: 'ORD-002', priority: 'NORMAL', item_count: 3 },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockOrders }) // fetchOrdersForWave
        .mockResolvedValueOnce({ rows: [] }); // extractPickTasks

      // Mock for assignPickers and saveWave
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        if (query.includes('INSERT') || query.includes('UPDATE')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123', userEmail: 'admin@example.com' };

      const result = await service.createWave(criteria, context);

      expect(result.waveId).toMatch(/^WAVE-/);
      expect(result.status).toBe(WaveStatus.PLANNED);
      expect(result.criteria.strategy).toBe(WaveStrategy.CARRIER);
      expect(result.orderIds).toEqual(['ORD-001', 'ORD-002']);
    });

    it('should create a PRIORITY strategy wave', async () => {
      const criteria = {
        strategy: WaveStrategy.PRIORITY,
        priority: ['HIGH', 'URGENT'] as ('LOW' | 'NORMAL' | 'HIGH' | 'URGENT')[],
        maxOrdersPerWave: 30,
      };

      const mockOrders = [
        { order_id: 'ORD-001', priority: 'URGENT', item_count: 10 },
        { order_id: 'ORD-002', priority: 'HIGH', item_count: 5 },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockOrders })
        .mockResolvedValueOnce({ rows: [] });

      // Mock for assignPickers and saveWave
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123' };

      const result = await service.createWave(criteria, context);

      expect(result.criteria.strategy).toBe(WaveStrategy.PRIORITY);
      expect(result.orderIds).toHaveLength(2);
    });

    it('should create a ZONE strategy wave', async () => {
      const criteria = {
        strategy: WaveStrategy.ZONE,
        zones: ['A', 'B'],
        maxOrdersPerWave: 40,
      };

      const mockOrders = [{ order_id: 'ORD-001', priority: 'NORMAL', item_count: 5 }];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockOrders })
        .mockResolvedValueOnce({ rows: [] });

      // Mock for assignPickers and saveWave
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123' };

      const result = await service.createWave(criteria, context);

      expect(result.criteria.strategy).toBe(WaveStrategy.ZONE);
      expect(result.criteria.zones).toEqual(['A', 'B']);
    });

    it('should create a DEADLINE strategy wave', async () => {
      const criteria = {
        strategy: WaveStrategy.DEADLINE,
        deadline: new Date('2024-01-05T00:00:00Z'),
        maxOrdersPerWave: 25,
      };

      const mockOrders = [{ order_id: 'ORD-001', priority: 'HIGH', item_count: 5 }];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockOrders })
        .mockResolvedValueOnce({ rows: [] });

      // Mock for assignPickers and saveWave
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123' };

      const result = await service.createWave(criteria, context);

      expect(result.criteria.strategy).toBe(WaveStrategy.DEADLINE);
    });

    it('should create a BALANCED strategy wave', async () => {
      const criteria = {
        strategy: WaveStrategy.BALANCED,
        priority: ['HIGH', 'URGENT'] as ('LOW' | 'NORMAL' | 'HIGH' | 'URGENT')[],
        deadline: new Date('2024-01-05T00:00:00Z'),
        maxOrdersPerWave: 50,
      };

      const mockOrders = [{ order_id: 'ORD-001', priority: 'URGENT', item_count: 5 }];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockOrders })
        .mockResolvedValueOnce({ rows: [] });

      // Mock for assignPickers and saveWave
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123' };

      const result = await service.createWave(criteria, context);

      expect(result.criteria.strategy).toBe(WaveStrategy.BALANCED);
    });

    it('should throw error when no orders match criteria', async () => {
      const criteria = {
        strategy: WaveStrategy.PRIORITY,
        priority: ['URGENT'] as ('LOW' | 'NORMAL' | 'HIGH' | 'URGENT')[],
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const context = { userId: 'user-123' };

      await expect(service.createWave(criteria, context)).rejects.toThrow(
        'No orders found matching the wave criteria'
      );
    });

    it('should limit orders to maxOrdersPerWave', async () => {
      const criteria = {
        strategy: WaveStrategy.CARRIER,
        maxOrdersPerWave: 10,
      };

      // Return 20 orders but only 10 should be selected
      const mockOrders = Array.from({ length: 20 }, (_, i) => ({
        order_id: `ORD-${String(i + 1).padStart(3, '0')}`,
        priority: 'NORMAL',
        item_count: 5,
      }));

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockOrders })
        .mockResolvedValueOnce({ rows: [] });

      // Mock for assignPickers and saveWave
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123' };

      const result = await service.createWave(criteria, context);

      expect(result.orderIds).toHaveLength(10);
    });

    it('should assign pickers based on task count', async () => {
      const criteria = {
        strategy: WaveStrategy.CARRIER,
        maxOrdersPerPicker: 10,
      };

      const mockOrders = [
        { order_id: 'ORD-001', priority: 'NORMAL', item_count: 5 },
        { order_id: 'ORD-002', priority: 'NORMAL', item_count: 5 },
      ];

      const mockPickers = [{ user_id: 'picker-1' }, { user_id: 'picker-2' }];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockOrders })
        .mockResolvedValueOnce({ rows: [] });

      // Mock for assignPickers and saveWave - return pickers for the getAvailablePickers query
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('getAvailablePickers') || query.includes('user_id')) {
          return Promise.resolve({ rows: mockPickers });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123' };

      const result = await service.createWave(criteria, context);

      expect(result.assignedPickers).toContain('picker-1');
      expect(result.assignedPickers).toContain('picker-2');
    });

    it('should broadcast wave creation via WebSocket', async () => {
      const criteria = {
        strategy: WaveStrategy.CARRIER,
      };

      const mockOrders = [{ order_id: 'ORD-001', priority: 'NORMAL', item_count: 5 }];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockOrders })
        .mockResolvedValueOnce({ rows: [] });

      // Mock for assignPickers and saveWave
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123' };

      await service.createWave(criteria, context);

      const broadcaster = wsServer.getBroadcaster();
      expect(broadcaster?.broadcastGlobalNotification).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'New Wave Created',
          type: 'info',
        })
      );
    });

    it('should send notification to all users', async () => {
      const criteria = {
        strategy: WaveStrategy.CARRIER,
      };

      const mockOrders = [{ order_id: 'ORD-001', priority: 'NORMAL', item_count: 5 }];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockOrders })
        .mockResolvedValueOnce({ rows: [] });

      // Mock for assignPickers and saveWave
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123' };

      await service.createWave(criteria, context);

      expect(notifyAll).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'wave_created',
          title: 'New Wave Created',
        })
      );
    });
  });

  // ==========================================================================
  // WAVE RELEASE
  // ==========================================================================

  describe('releaseWave', () => {
    it('should release a planned wave successfully', async () => {
      const waveId = 'WAVE-TEST-001';
      const mockWave = {
        waveId,
        name: 'carrier wave - 10:00 AM',
        status: WaveStatus.PLANNED,
        criteria: { strategy: WaveStrategy.CARRIER },
        orderIds: ['ORD-001'],
        pickTasks: [],
        assignedPickers: ['picker-1'],
        estimatedTime: 3600,
        estimatedDistance: 500,
        createdAt: new Date(),
        createdBy: 'user-123',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockWave] }); // getWave

      // Mock for updateWave and assignTasksToPickers
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('UPDATE') || query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123', userEmail: 'admin@example.com' };

      const result = await service.releaseWave(waveId, context);

      expect(result.status).toBe(WaveStatus.RELEASED);
      expect(result.startedAt).toBeInstanceOf(Date);
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'Wave',
          resourceId: waveId,
          action: 'ORDER_UPDATED',
        })
      );
    });

    it('should throw error when wave not found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const context = { userId: 'user-123' };

      await expect(service.releaseWave('NONEXISTENT', context)).rejects.toThrow(
        'Wave NONEXISTENT not found'
      );
    });

    it('should throw error when wave is not in PLANNED status', async () => {
      const mockWave = {
        waveId: 'WAVE-TEST-001',
        name: 'Test Wave',
        status: WaveStatus.RELEASED,
        criteria: { strategy: WaveStrategy.CARRIER },
        orderIds: [],
        pickTasks: [],
        assignedPickers: [],
        estimatedTime: 0,
        estimatedDistance: 0,
        createdAt: new Date(),
        createdBy: 'user-123',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockWave] });

      const context = { userId: 'user-123' };

      await expect(service.releaseWave('WAVE-TEST-001', context)).rejects.toThrow(
        'Wave WAVE-TEST-001 is not in PLANNED status'
      );
    });

    it('should assign tasks to pickers on release', async () => {
      const waveId = 'WAVE-TEST-001';
      const mockWave = {
        waveId,
        name: 'Test Wave',
        status: WaveStatus.PLANNED,
        criteria: { strategy: WaveStrategy.CARRIER },
        orderIds: ['ORD-001'],
        pickTasks: [
          { taskId: 'task-1', orderId: 'ORD-001', quantity: 1 },
          { taskId: 'task-2', orderId: 'ORD-001', quantity: 1 },
        ],
        assignedPickers: ['picker-1'],
        estimatedTime: 3600,
        estimatedDistance: 500,
        createdAt: new Date(),
        createdBy: 'user-123',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockWave] });

      // Mock for updateWave and assignTasksToPickers
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('UPDATE') || query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123' };

      await service.releaseWave(waveId, context);

      // Should update pick_tasks with picker assignment
      expect(global.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE pick_tasks'),
        expect.arrayContaining(['picker-1', expect.any(String)])
      );
    });
  });

  // ==========================================================================
  // WAVE STATUS
  // ==========================================================================

  describe('getWaveStatus', () => {
    it('should return wave summary with progress', async () => {
      const waveId = 'WAVE-TEST-001';
      const mockWave = {
        waveId,
        name: 'Test Wave',
        status: WaveStatus.IN_PROGRESS,
        criteria: { strategy: WaveStrategy.CARRIER },
        orderIds: ['ORD-001', 'ORD-002'],
        pickTasks: [
          { taskId: 'task-1' },
          { taskId: 'task-2' },
          { taskId: 'task-3' },
          { taskId: 'task-4' },
        ],
        assignedPickers: ['picker-1'],
        estimatedTime: 3600,
        estimatedDistance: 500,
        createdAt: new Date(),
        createdBy: 'user-123',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [mockWave] })
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }); // 2 completed picks

      const result = await service.getWaveStatus(waveId);

      expect(result).not.toBeNull();
      expect(result.waveId).toBe(waveId);
      expect(result.progress).toBe(50); // 2/4 completed
      expect(result.orderCount).toBe(2);
      expect(result.itemCount).toBe(4);
      expect(result.pickerCount).toBe(1);
    });

    it('should return null for non-existent wave', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getWaveStatus('NONEXISTENT');

      expect(result).toBeNull();
    });

    it('should calculate estimated time remaining', async () => {
      const waveId = 'WAVE-TEST-001';
      const mockWave = {
        waveId,
        name: 'Test Wave',
        status: WaveStatus.IN_PROGRESS,
        criteria: { strategy: WaveStrategy.CARRIER },
        orderIds: ['ORD-001'],
        pickTasks: [{ taskId: 'task-1' }, { taskId: 'task-2' }, { taskId: 'task-3' }],
        assignedPickers: ['picker-1'],
        estimatedTime: 3600, // 1 hour for 3 tasks = 1200 seconds per task
        estimatedDistance: 500,
        createdAt: new Date(),
        createdBy: 'user-123',
      };

      // 1 completed, 2 remaining
      global.mockPool.query
        .mockResolvedValueOnce({ rows: [mockWave] })
        .mockResolvedValueOnce({ rows: [{ count: '1' }] });

      const result = await service.getWaveStatus(waveId);

      expect(result.estimatedTimeRemaining).toBe(2400); // 2 * 1200
    });

    it('should handle zero total picks', async () => {
      const waveId = 'WAVE-TEST-001';
      const mockWave = {
        waveId,
        name: 'Test Wave',
        status: WaveStatus.PLANNED,
        criteria: { strategy: WaveStrategy.CARRIER },
        orderIds: [],
        pickTasks: [],
        assignedPickers: [],
        estimatedTime: 0,
        estimatedDistance: 0,
        createdAt: new Date(),
        createdBy: 'user-123',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [mockWave] })
        .mockResolvedValueOnce({ rows: [{ count: '0' }] });

      const result = await service.getWaveStatus(waveId);

      expect(result.progress).toBe(0);
      expect(result.estimatedTimeRemaining).toBe(0);
    });
  });

  // ==========================================================================
  // PICKER WAVES
  // ==========================================================================

  describe('getActiveWavesForPicker', () => {
    it('should return active waves for a picker', async () => {
      const pickerId = 'picker-123';
      const mockWaves = [
        {
          wave_id: 'WAVE-001',
          name: 'Wave 1',
          status: 'RELEASED',
          order_count: 5,
          item_count: 20,
        },
        {
          wave_id: 'WAVE-002',
          name: 'Wave 2',
          status: 'IN_PROGRESS',
          order_count: 3,
          item_count: 15,
        },
      ];

      global.mockPool.query.mockResolvedValueOnce({ rows: mockWaves });

      const result = await service.getActiveWavesForPicker(pickerId);

      expect(result).toHaveLength(2);
      expect(result[0].waveId).toBe('WAVE-001');
      expect(result[0].status).toBe('RELEASED');
      expect(result[1].status).toBe('IN_PROGRESS');
    });

    it('should return empty array when no waves found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getActiveWavesForPicker('picker-123');

      expect(result).toEqual([]);
    });

    it('should only include RELEASED and IN_PROGRESS waves', async () => {
      const mockWaves = [
        { wave_id: 'WAVE-001', name: 'Wave 1', status: 'PLANNED', order_count: 1, item_count: 5 },
        { wave_id: 'WAVE-002', name: 'Wave 2', status: 'RELEASED', order_count: 2, item_count: 10 },
        {
          wave_id: 'WAVE-003',
          name: 'Wave 3',
          status: 'COMPLETED',
          order_count: 3,
          item_count: 15,
        },
      ];

      // The query should filter to only RELEASED and IN_PROGRESS
      global.mockPool.query.mockResolvedValueOnce({ rows: [mockWaves[1]] });

      const result = await service.getActiveWavesForPicker('picker-123');

      expect(result).toHaveLength(1);
      expect(result[0].status).toBe('RELEASED');
    });
  });

  // ==========================================================================
  // WAVE COMPLETION
  // ==========================================================================

  describe('completeWave', () => {
    it('should complete a wave successfully', async () => {
      const waveId = 'WAVE-TEST-001';
      const mockWave = {
        waveId,
        name: 'Test Wave',
        status: WaveStatus.IN_PROGRESS,
        criteria: { strategy: WaveStrategy.CARRIER },
        orderIds: ['ORD-001', 'ORD-002'],
        pickTasks: [],
        assignedPickers: ['picker-1'],
        estimatedTime: 3600,
        estimatedDistance: 500,
        createdAt: new Date(),
        createdBy: 'user-123',
        startedAt: new Date(Date.now() - 3600000), // Started 1 hour ago
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockWave] });

      // Mock for updateWave
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('UPDATE') || query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123', userEmail: 'admin@example.com' };

      await service.completeWave(waveId, context);

      expect(global.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE waves'),
        expect.arrayContaining([WaveStatus.COMPLETED, expect.any(Date), expect.any(Date)])
      );
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should send notification on completion', async () => {
      const waveId = 'WAVE-TEST-001';
      const mockWave = {
        waveId,
        name: 'Test Wave',
        status: WaveStatus.IN_PROGRESS,
        criteria: { strategy: WaveStrategy.CARRIER },
        orderIds: ['ORD-001'],
        pickTasks: [],
        assignedPickers: [],
        estimatedTime: 0,
        estimatedDistance: 0,
        createdAt: new Date(),
        createdBy: 'user-123',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockWave] });

      // Mock for updateWave
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('UPDATE') || query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123' };

      await service.completeWave(waveId, context);

      expect(notifyAll).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'wave_completed',
          title: 'Wave Completed',
        })
      );
    });

    it('should throw error when wave not found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const context = { userId: 'user-123' };

      await expect(service.completeWave('NONEXISTENT', context)).rejects.toThrow(
        'Wave NONEXISTENT not found'
      );
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle empty pick tasks gracefully', async () => {
      const criteria = {
        strategy: WaveStrategy.CARRIER,
      };

      const mockOrders = [{ order_id: 'ORD-001', priority: 'NORMAL', item_count: 0 }];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockOrders })
        .mockResolvedValueOnce({ rows: [] }); // No pick tasks

      // Mock for assignPickers and saveWave
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123' };

      const result = await service.createWave(criteria, context);

      expect(result.pickTasks).toEqual([]);
    });

    it('should handle when no pickers are available', async () => {
      const criteria = {
        strategy: WaveStrategy.CARRIER,
        maxOrdersPerPicker: 10,
      };

      const mockOrders = [{ order_id: 'ORD-001', priority: 'NORMAL', item_count: 5 }];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockOrders })
        .mockResolvedValueOnce({ rows: [] }); // No pick tasks

      // Mock for assignPickers - return no pickers
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123' };

      const result = await service.createWave(criteria, context);

      expect(result.assignedPickers).toEqual([]);
    });

    it('should generate unique wave IDs', async () => {
      const criteria = {
        strategy: WaveStrategy.CARRIER,
      };

      const mockOrders = [{ order_id: 'ORD-001', priority: 'NORMAL', item_count: 5 }];

      // Mock for both waves
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('fetchOrdersForWave') || query.includes('extractPickTasks')) {
          return Promise.resolve({ rows: mockOrders });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123' };

      const wave1 = await service.createWave(criteria, context);
      const wave2 = await service.createWave(criteria, context);

      expect(wave1.waveId).not.toBe(wave2.waveId);
      expect(wave1.waveId).toMatch(/^WAVE-/);
      expect(wave2.waveId).toMatch(/^WAVE-/);
    });

    it('should generate human-readable wave names', async () => {
      const criteria = {
        strategy: WaveStrategy.PRIORITY,
      };

      const mockOrders = [{ order_id: 'ORD-001', priority: 'NORMAL', item_count: 5 }];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockOrders })
        .mockResolvedValueOnce({ rows: [] }); // No pick tasks

      // Mock for assignPickers and saveWave
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'user-123' };

      const result = await service.createWave(criteria, context);

      expect(result.name).toContain('priority');
      expect(result.name).toContain('wave');
      expect(result.name).toMatch(/\d{2}:\d{2}/); // Should contain time
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(wavePickingService).toBeInstanceOf(WavePickingService);
    });
  });
});
