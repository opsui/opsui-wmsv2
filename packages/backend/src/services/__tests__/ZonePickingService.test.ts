/**
 * Zone Picking Service Tests
 *
 * Tests for zone-based picking including zone management,
 * picker assignment, task tracking, and rebalancing
 */

import { ZonePickingService, zonePickingService } from '../ZonePickingService';
import { logger } from '../../config/logger';
import { getAuditService } from '../AuditService';
import { notifyUser } from '../NotificationHelper';
import wsServer from '../../websocket';

// Mock dependencies
jest.mock('../../config/logger');
jest.mock('../AuditService');
jest.mock('../NotificationHelper');
jest.mock('../../websocket');

describe('ZonePickingService', () => {
  let service: ZonePickingService;
  let mockAuditService: any;

  beforeEach(() => {
    service = new ZonePickingService();

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
  // ZONE MANAGEMENT
  // ==========================================================================

  describe('getZones', () => {
    it('should return all zones with statistics', async () => {
      const mockZones = [
        {
          zone: 'A',
          aisle_start: '1',
          aisle_end: '10',
          location_count: '100',
          active_pickers: '3',
        },
        {
          zone: 'B',
          aisle_start: '1',
          aisle_end: '8',
          location_count: '80',
          active_pickers: '2',
        },
      ];

      global.mockPool.query.mockResolvedValueOnce({ rows: mockZones });

      const result = await service.getZones();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        zoneId: 'A',
        name: 'Fast Moving Zone (A)',
        aisleStart: 1,
        aisleEnd: 10,
        zoneType: 'FAST_MOVING',
        locationCount: 100,
        activePickers: 3,
        currentUtilization: 0,
      });
      expect(result[1].zoneType).toBe('FAST_MOVING');
    });

    it('should infer zone type based on zone ID', async () => {
      const mockZones = [
        { zone: 'C', aisle_start: '1', aisle_end: '5', location_count: '50', active_pickers: '0' },
        { zone: 'E', aisle_start: '1', aisle_end: '5', location_count: '50', active_pickers: '0' },
        { zone: 'F', aisle_start: '1', aisle_end: '5', location_count: '50', active_pickers: '0' },
        { zone: 'G', aisle_start: '1', aisle_end: '5', location_count: '50', active_pickers: '0' },
        { zone: 'H', aisle_start: '1', aisle_end: '5', location_count: '50', active_pickers: '0' },
      ];

      global.mockPool.query.mockResolvedValueOnce({ rows: mockZones });

      const result = await service.getZones();

      expect(result[0].zoneType).toBe('SLOW_MOVING'); // C
      expect(result[1].zoneType).toBe('BULK'); // E
      expect(result[2].zoneType).toBe('COLD_STORAGE'); // F
      expect(result[3].zoneType).toBe('HAZARDOUS'); // G
      expect(result[4].zoneType).toBe('REVERSE_LOGISTICS'); // H
    });

    it('should return empty array when no zones found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getZones();

      expect(result).toEqual([]);
    });

    it('should handle zones with null aisle values', async () => {
      const mockZones = [
        {
          zone: 'A',
          aisle_start: null,
          aisle_end: null,
          location_count: '50',
          active_pickers: '0',
        },
      ];

      global.mockPool.query.mockResolvedValueOnce({ rows: mockZones });

      const result = await service.getZones();

      expect(result[0].aisleStart).toBe(0);
      expect(result[0].aisleEnd).toBe(0);
    });
  });

  // ==========================================================================
  // ZONE STATISTICS
  // ==========================================================================

  describe('getZoneStats', () => {
    it('should return zone statistics', async () => {
      const zoneId = 'A';
      const mockStats = {
        pending_tasks: '10',
        in_progress_tasks: '5',
        completed_tasks: '20',
        total_items: '35',
        active_pickers: '3',
      };

      const mockAvgTime = {
        avg_time: '45.5',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [mockStats] })
        .mockResolvedValueOnce({ rows: [mockAvgTime] });

      const result = await service.getZoneStats(zoneId);

      expect(result).toEqual({
        zoneId: 'A',
        pendingTasks: 10,
        inProgressTasks: 5,
        completedTasks: 20,
        totalItems: 35,
        estimatedTimeRemaining: 675, // (10 + 5) * 45
        activePickers: 3,
        averageTimePerTask: 46,
      });
    });

    it('should return default stats when no tasks found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getZoneStats('A');

      expect(result).toEqual({
        zoneId: 'A',
        pendingTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
        totalItems: 0,
        estimatedTimeRemaining: 0,
        activePickers: 0,
        averageTimePerTask: 60,
      });
    });

    it('should handle missing average time with default', async () => {
      const mockStats = {
        pending_tasks: '5',
        in_progress_tasks: '0',
        completed_tasks: '0',
        total_items: '5',
        active_pickers: '0',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [mockStats] })
        .mockResolvedValueOnce({ rows: [] }); // No avg time

      const result = await service.getZoneStats('A');

      expect(result.averageTimePerTask).toBe(60);
      expect(result.estimatedTimeRemaining).toBe(300); // 5 * 60
    });

    it('should handle database errors gracefully', async () => {
      global.mockPool.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await service.getZoneStats('A');

      expect(result).toEqual({
        zoneId: 'A',
        pendingTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
        totalItems: 0,
        estimatedTimeRemaining: 0,
        activePickers: 0,
        averageTimePerTask: 60,
      });
      expect(logger.error).toHaveBeenCalledWith(
        'Error getting zone stats',
        expect.objectContaining({ zoneId: 'A' })
      );
    });
  });

  describe('getAllZoneStats', () => {
    it('should return statistics for all zones', async () => {
      const mockZones = [
        {
          zone: 'A',
          aisle_start: '1',
          aisle_end: '10',
          location_count: '100',
          active_pickers: '2',
        },
        { zone: 'B', aisle_start: '1', aisle_end: '8', location_count: '80', active_pickers: '1' },
      ];

      const mockStatsA = {
        pending_tasks: '10',
        in_progress_tasks: '5',
        completed_tasks: '20',
        total_items: '35',
        active_pickers: '2',
      };

      const mockStatsB = {
        pending_tasks: '5',
        in_progress_tasks: '2',
        completed_tasks: '10',
        total_items: '17',
        active_pickers: '1',
      };

      const mockAvgTime = { avg_time: '60' };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockZones }) // getZones
        .mockResolvedValueOnce({ rows: [mockStatsA] }) // getZoneStats A
        .mockResolvedValueOnce({ rows: [mockAvgTime] })
        .mockResolvedValueOnce({ rows: [mockStatsB] }) // getZoneStats B
        .mockResolvedValueOnce({ rows: [mockAvgTime] });

      const result = await service.getAllZoneStats();

      expect(result).toHaveLength(2);
      expect(result[0].zoneId).toBe('A');
      expect(result[1].zoneId).toBe('B');
    });

    it('should return empty array when no zones exist', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getAllZoneStats();

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // PICKER ASSIGNMENT
  // ==========================================================================

  describe('assignPickerToZone', () => {
    it('should assign picker to zone successfully', async () => {
      const pickerId = 'picker-123';
      const zoneId = 'A';

      const mockZone = {
        zone: zoneId,
        aisle_start: '1',
        aisle_end: '10',
        location_count: '100',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [mockZone] }) // getZoneById
        .mockResolvedValueOnce({ rows: [] }); // No existing assignment

      // Mock for insert
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('INSERT') || query.includes('UPDATE') || query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'admin-123', userEmail: 'admin@example.com' };

      const result = await service.assignPickerToZone(pickerId, zoneId, context);

      expect(result.pickerId).toBe(pickerId);
      expect(result.zoneId).toBe(zoneId);
      expect(result.status).toBe('ACTIVE');
      expect(global.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO zone_assignments'),
        expect.arrayContaining([pickerId, zoneId])
      );
      expect(mockAuditService.log).toHaveBeenCalled();
    });

    it('should throw error when zone not found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] }); // Zone not found

      const context = { userId: 'admin-123' };

      await expect(
        service.assignPickerToZone('picker-123', 'NONEXISTENT', context)
      ).rejects.toThrow('Zone NONEXISTENT not found');
    });

    it('should throw error when picker already assigned to zone', async () => {
      const pickerId = 'picker-123';
      const zoneId = 'A';

      const mockZone = {
        zone: zoneId,
        aisle_start: '1',
        aisle_end: '10',
        location_count: '100',
      };

      const existingAssignment = {
        picker_id: pickerId,
        zone_id: 'B', // Already assigned to different zone
        status: 'ACTIVE',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [mockZone] })
        .mockResolvedValueOnce({ rows: [existingAssignment] });

      const context = { userId: 'admin-123' };

      await expect(service.assignPickerToZone(pickerId, zoneId, context)).rejects.toThrow(
        `Picker ${pickerId} is already assigned to zone B`
      );
    });

    it('should broadcast zone assignment via WebSocket', async () => {
      const pickerId = 'picker-123';
      const zoneId = 'A';

      const mockZone = {
        zone: zoneId,
        aisle_start: '1',
        aisle_end: '10',
        location_count: '100',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [mockZone] })
        .mockResolvedValueOnce({ rows: [] }); // No existing assignment

      // Mock for insert
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('INSERT') || query.includes('UPDATE') || query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'admin-123' };

      await service.assignPickerToZone(pickerId, zoneId, context);

      const broadcaster = wsServer.getBroadcaster();
      expect(broadcaster?.broadcastZoneAssignment).toHaveBeenCalledWith({
        zoneId,
        pickerId,
        assigned: true,
      });
    });

    it('should send notification to picker', async () => {
      const pickerId = 'picker-123';
      const zoneId = 'A';

      const mockZone = {
        zone: zoneId,
        aisle_start: '1',
        aisle_end: '10',
        location_count: '100',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [mockZone] })
        .mockResolvedValueOnce({ rows: [] }); // No existing assignment

      // Mock for insert
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('INSERT') || query.includes('UPDATE') || query.includes('SELECT')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'admin-123' };

      await service.assignPickerToZone(pickerId, zoneId, context);

      expect(notifyUser).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: pickerId,
          type: 'zone_assigned',
          title: 'Zone Assignment',
        })
      );
    });
  });

  // ==========================================================================
  // ZONE PICK TASKS
  // ==========================================================================

  describe('getZonePickTasks', () => {
    it('should return all pick tasks for a zone', async () => {
      const zoneId = 'A';
      const mockTasks = [
        {
          task_id: 'task-1',
          order_id: 'ORD-001',
          sku: 'SKU-001',
          quantity: '2',
          bin_location: 'A-01-01',
          zone: 'A',
          priority: 'HIGH',
          status: 'PENDING',
          assigned_picker: null,
        },
        {
          task_id: 'task-2',
          order_id: 'ORD-002',
          sku: 'SKU-002',
          quantity: '1',
          bin_location: 'A-01-02',
          zone: 'A',
          priority: 'NORMAL',
          status: 'IN_PROGRESS',
          assigned_picker: 'picker-123',
        },
      ];

      global.mockPool.query.mockResolvedValueOnce({ rows: mockTasks });

      const result = await service.getZonePickTasks(zoneId);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        taskId: 'task-1',
        orderId: 'ORD-001',
        sku: 'SKU-001',
        quantity: 2,
        binLocation: 'A-01-01',
        zone: 'A',
        priority: 'HIGH',
        status: 'PENDING',
        assignedPicker: null,
      });
    });

    it('should filter tasks by status when provided', async () => {
      const zoneId = 'A';
      const mockTasks = [
        {
          task_id: 'task-1',
          order_id: 'ORD-001',
          sku: 'SKU-001',
          quantity: '2',
          bin_location: 'A-01-01',
          zone: 'A',
          priority: 'HIGH',
          status: 'PENDING',
          assigned_picker: null,
        },
      ];

      global.mockPool.query.mockResolvedValueOnce({ rows: mockTasks });

      const result = await service.getZonePickTasks(zoneId, ['PENDING', 'IN_PROGRESS']);

      expect(result).toHaveLength(1);
      expect(global.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('AND pt.status = ANY'),
        [zoneId, ['PENDING', 'IN_PROGRESS']]
      );
    });

    it('should return empty array when no tasks found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getZonePickTasks('A');

      expect(result).toEqual([]);
    });

    it('should order tasks by priority and bin location', async () => {
      const mockTasks = [
        { task_id: 'task-1', bin_location: 'A-05-01', priority: 'NORMAL' },
        { task_id: 'task-2', bin_location: 'A-01-01', priority: 'HIGH' },
        { task_id: 'task-3', bin_location: 'A-03-01', priority: 'HIGH' },
      ];

      global.mockPool.query.mockResolvedValueOnce({ rows: mockTasks });

      await service.getZonePickTasks('A');

      expect(global.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('ORDER BY pt.priority DESC, pt.bin_location'),
        expect.any(Array)
      );
    });
  });

  // ==========================================================================
  // PICKER REBALANCING
  // ==========================================================================

  describe('rebalancePickers', () => {
    it('should rebalance pickers across zones based on workload', async () => {
      const mockZones = [
        {
          zone: 'A',
          aisle_start: '1',
          aisle_end: '10',
          location_count: '100',
          active_pickers: '0',
        },
        {
          zone: 'B',
          aisle_start: '1',
          aisle_end: '10',
          location_count: '100',
          active_pickers: '0',
        },
      ];

      const mockZoneStats = [
        { zoneId: 'A', pendingTasks: 100, inProgressTasks: 0, activePickers: 0 },
        { zoneId: 'B', pendingTasks: 20, inProgressTasks: 0, activePickers: 0 },
      ];

      const mockPickers = [
        { user_id: 'picker-1' },
        { user_id: 'picker-2' },
        { user_id: 'picker-3' },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockZones }) // getZones
        .mockResolvedValueOnce({ rows: [mockZoneStats[0]] }) // getZoneStats A
        .mockResolvedValueOnce({ rows: [{ avg_time: '60' }] }) // avgTime A
        .mockResolvedValueOnce({ rows: [mockZoneStats[1]] }) // getZoneStats B
        .mockResolvedValueOnce({ rows: [{ avg_time: '60' }] }) // avgTime B
        .mockResolvedValueOnce({ rows: mockPickers }); // getAvailablePickers

      // Check existing assignments and assign to zones
      global.mockPool.query.mockImplementation((query: string, params: any[]) => {
        if (query.includes('zone_assignments')) {
          return Promise.resolve({ rows: [] }); // No existing assignments
        }
        if (query.includes('zone =')) {
          return Promise.resolve({
            rows: [{ zone: params[0], aisle_start: '1', aisle_end: '10', location_count: '100' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'admin-123' };

      await service.rebalancePickers(context);

      // Zone A with 100 tasks needs 2 pickers (100/50 = 2)
      // Zone B with 20 tasks needs 1 picker (20/50 = 1, rounded to 1)
      expect(logger.info).toHaveBeenCalledWith(
        'Picker rebalancing completed',
        expect.objectContaining({
          totalPickers: 3,
        })
      );
    });

    it('should skip zones with no pending tasks', async () => {
      const mockZones = [
        {
          zone: 'A',
          aisle_start: '1',
          aisle_end: '10',
          location_count: '100',
          active_pickers: '0',
        },
      ];

      const mockZoneStats = [
        { zoneId: 'A', pendingTasks: 0, inProgressTasks: 0, activePickers: 0 },
      ];

      const mockPickers = [{ user_id: 'picker-1' }];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockZones })
        .mockResolvedValueOnce({ rows: [mockZoneStats] })
        .mockResolvedValueOnce({ rows: [{ avg_time: '60' }] })
        .mockResolvedValueOnce({ rows: mockPickers });

      // Mock for zone_assignments checks
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('zone_assignments')) {
          return Promise.resolve({ rows: [] });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'admin-123' };

      await service.rebalancePickers(context);

      // Should not assign any pickers since zone has no pending tasks
      expect(logger.info).toHaveBeenCalledWith(
        'Picker rebalancing completed',
        expect.objectContaining({
          zonesRebalanced: 0,
        })
      );
    });

    it('should not reassign already assigned pickers', async () => {
      const pickerId = 'picker-1';

      const mockZones = [
        {
          zone: 'A',
          aisle_start: '1',
          aisle_end: '10',
          location_count: '100',
          active_pickers: '0',
        },
      ];

      const mockZoneStats = [
        { zoneId: 'A', pendingTasks: 50, inProgressTasks: 0, activePickers: 0 },
      ];

      const mockPickers = [{ user_id: pickerId }];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockZones })
        .mockResolvedValueOnce({ rows: [mockZoneStats] })
        .mockResolvedValueOnce({ rows: [{ avg_time: '60' }] })
        .mockResolvedValueOnce({ rows: mockPickers });

      // Picker already has active assignment
      global.mockPool.query.mockImplementation((query: string) => {
        if (query.includes('zone_assignments')) {
          return Promise.resolve({
            rows: [{ picker_id: pickerId, zone_id: 'B', status: 'ACTIVE' }],
          });
        }
        return Promise.resolve({ rows: [] });
      });

      const context = { userId: 'admin-123' };

      await service.rebalancePickers(context);

      // Should skip this picker
      expect(logger.info).toHaveBeenCalledWith('Picker rebalancing completed', expect.anything());
    });
  });

  // ==========================================================================
  // RELEASE PICKER
  // ==========================================================================

  describe('releasePickerFromZone', () => {
    it('should release picker from zone successfully', async () => {
      const pickerId = 'picker-123';

      global.mockPool.query.mockResolvedValueOnce({ rows: [] }); // UPDATE

      const context = { userId: 'admin-123', userEmail: 'admin@example.com' };

      await service.releasePickerFromZone(pickerId, context);

      expect(global.mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE zone_assignments'),
        [pickerId]
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          resourceType: 'Zone',
          resourceId: pickerId,
          details: expect.objectContaining({
            description: `Picker ${pickerId} released from zone`,
          }),
        })
      );
    });

    it('should log release operation', async () => {
      const pickerId = 'picker-123';

      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const context = { userId: 'admin-123', userAgent: 'Mozilla/5.0', ipAddress: '192.168.1.1' };

      await service.releasePickerFromZone(pickerId, context);

      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          userId: 'admin-123',
          userAgent: 'Mozilla/5.0',
          ipAddress: '192.168.1.1',
        })
      );
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle zone with no locations', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getZoneStats('NONEXISTENT');

      expect(result).toEqual({
        zoneId: 'NONEXISTENT',
        pendingTasks: 0,
        inProgressTasks: 0,
        completedTasks: 0,
        totalItems: 0,
        estimatedTimeRemaining: 0,
        activePickers: 0,
        averageTimePerTask: 60,
      });
    });

    it('should handle unknown zone type for zone ID', async () => {
      const mockZones = [
        { zone: 'Z', aisle_start: '1', aisle_end: '5', location_count: '50', active_pickers: '0' },
      ];

      global.mockPool.query.mockResolvedValueOnce({ rows: mockZones });

      const result = await service.getZones();

      expect(result[0].zoneType).toBe('SLOW_MOVING'); // Default
    });

    it('should handle zone stats with null values', async () => {
      const mockStats = {
        pending_tasks: null,
        in_progress_tasks: null,
        completed_tasks: null,
        total_items: null,
        active_pickers: null,
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockStats] });

      const result = await service.getZoneStats('A');

      expect(result.pendingTasks).toBe(0);
      expect(result.inProgressTasks).toBe(0);
      expect(result.completedTasks).toBe(0);
      expect(result.totalItems).toBe(0);
      expect(result.activePickers).toBe(0);
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(zonePickingService).toBeInstanceOf(ZonePickingService);
    });
  });
});
