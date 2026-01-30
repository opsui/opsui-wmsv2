/**
 * Unit tests for RouteOptimizationService
 * @covers src/services/RouteOptimizationService.ts
 */

import { routeOptimizationService, type PickTask } from '../RouteOptimizationService';

describe('RouteOptimizationService', () => {
  // The service exports a singleton, so we'll test it directly
  // Store original config to restore after tests
  const originalConfig = routeOptimizationService.getConfig();

  const mockTasks: PickTask[] = [
    {
      taskId: 'task-1',
      orderId: 'ORD-001',
      sku: 'SKU-001',
      quantity: 10,
      binLocation: 'A-05-03',
      priority: 'NORMAL',
    },
    {
      taskId: 'task-2',
      orderId: 'ORD-001',
      sku: 'SKU-002',
      quantity: 5,
      binLocation: 'A-12-08',
      priority: 'HIGH',
    },
    {
      taskId: 'task-3',
      orderId: 'ORD-001',
      sku: 'SKU-003',
      quantity: 20,
      binLocation: 'B-03-05',
      priority: 'NORMAL',
    },
    {
      taskId: 'task-4',
      orderId: 'ORD-001',
      sku: 'SKU-004',
      quantity: 15,
      binLocation: 'B-15-12',
      priority: 'LOW',
    },
    {
      taskId: 'task-5',
      orderId: 'ORD-001',
      sku: 'SKU-005',
      quantity: 8,
      binLocation: 'C-08-06',
      priority: 'NORMAL',
    },
  ];

  beforeEach(() => {
    // Reset config to defaults
    routeOptimizationService.updateConfig(originalConfig);
  });

  // ==========================================================================
  // OPTIMIZE ROUTE TESTS
  // ==========================================================================

  describe('optimizeRoute', () => {
    it('should optimize route with default algorithm', () => {
      const result = routeOptimizationService.optimizeRoute(mockTasks, 'DEPOT');

      expect(result).toBeDefined();
      expect(result.tasks).toHaveLength(mockTasks.length);
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.estimatedTime).toBeGreaterThan(0);
      expect(result.waypoints).toBeDefined();
      expect(result.algorithm).toBeDefined();
    });

    it('should use TSP algorithm for small task sets', () => {
      const smallTasks = mockTasks.slice(0, 3);
      const result = routeOptimizationService.optimizeRoute(smallTasks, 'DEPOT');

      expect(result.algorithm).toBe('tsp');
    });

    it('should use nearest neighbor when specified', () => {
      const result = routeOptimizationService.optimizeRoute(mockTasks, 'DEPOT', {
        algorithm: 'nearest',
      });

      expect(result.algorithm).toBe('nearest');
    });

    it('should use aisle-by-aisle when specified', () => {
      const result = routeOptimizationService.optimizeRoute(mockTasks, 'DEPOT', {
        algorithm: 'aisle',
      });

      expect(result.algorithm).toBe('aisle');
    });

    it('should use zone-based when specified', () => {
      const result = routeOptimizationService.optimizeRoute(mockTasks, 'DEPOT', {
        algorithm: 'zone',
      });

      expect(result.algorithm).toBe('zone');
    });

    it('should handle single task', () => {
      const singleTask = [mockTasks[0]];
      const result = routeOptimizationService.optimizeRoute(singleTask, 'A-01-01');

      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].taskId).toBe('task-1');
      expect(result.totalDistance).toBeGreaterThan(0);
    });

    it('should include waypoints for navigation', () => {
      const result = routeOptimizationService.optimizeRoute(mockTasks, 'DEPOT');

      expect(result.waypoints).toBeDefined();
      expect(result.waypoints.length).toBeGreaterThan(0);
      expect(result.waypoints[0].type).toBe('start');
    });
  });

  // ==========================================================================
  // OPTIMIZED PICK TASK PROPERTIES TESTS
  // ==========================================================================

  describe('OptimizedPickTask properties', () => {
    it('should include sequence numbers', () => {
      const result = routeOptimizationService.optimizeRoute(mockTasks, 'DEPOT');

      result.tasks.forEach((task, index) => {
        expect(task.sequence).toBe(index + 1);
      });
    });

    it('should include from and to locations', () => {
      const result = routeOptimizationService.optimizeRoute(mockTasks, 'DEPOT');

      result.tasks.forEach(task => {
        expect(task.fromLocation).toBeDefined();
        expect(task.toLocation).toBe(task.binLocation);
      });
    });

    it('should include distance for each task', () => {
      const result = routeOptimizationService.optimizeRoute(mockTasks, 'DEPOT');

      result.tasks.forEach(task => {
        expect(task.distance).toBeGreaterThanOrEqual(0);
      });
    });

    it('should include estimated time for each task', () => {
      const result = routeOptimizationService.optimizeRoute(mockTasks, 'DEPOT');

      result.tasks.forEach(task => {
        expect(task.estimatedTime).toBeGreaterThan(0);
      });
    });

    it('should preserve original task properties', () => {
      const result = routeOptimizationService.optimizeRoute(mockTasks, 'DEPOT');

      result.tasks.forEach((task, index) => {
        expect(task.taskId).toBe(mockTasks[index].taskId);
        expect(task.orderId).toBe(mockTasks[index].orderId);
        expect(task.sku).toBe(mockTasks[index].sku);
        expect(task.quantity).toBe(mockTasks[index].quantity);
        expect(task.priority).toBe(mockTasks[index].priority);
      });
    });
  });

  // ==========================================================================
  // ALGORITHM SELECTION TESTS
  // ==========================================================================

  describe('Algorithm selection', () => {
    it('should select TSP for <= 10 tasks', () => {
      const tenTasks = Array.from({ length: 10 }, (_, i) => ({
        taskId: `task-${i}`,
        orderId: 'ORD-001',
        sku: `SKU-${i}`,
        quantity: 10,
        binLocation: `A-${i + 1}-0${(i % 9) + 1}`,
        priority: 'NORMAL' as const,
      }));

      const result = routeOptimizationService.optimizeRoute(tenTasks, 'DEPOT');
      expect(result.algorithm).toBe('tsp');
    });

    it('should select zone-based for multi-zone tasks', () => {
      const multiZoneTasks = Array.from({ length: 15 }, (_, i) => ({
        taskId: `task-${i}`,
        orderId: 'ORD-001',
        sku: `SKU-${i}`,
        quantity: 10,
        binLocation: `${String.fromCharCode(65 + (i % 5))}-${i + 1}-0${(i % 9) + 1}`,
        priority: 'NORMAL' as const,
      }));

      const result = routeOptimizationService.optimizeRoute(multiZoneTasks, 'DEPOT');
      expect(result.algorithm).toBe('zone');
    });

    it('should select aisle-by-aisle for multi-aisle tasks', () => {
      const multiAisleTasks = Array.from({ length: 12 }, (_, i) => ({
        taskId: `task-${i}`,
        orderId: 'ORD-001',
        sku: `SKU-${i}`,
        quantity: 10,
        binLocation: `A-${i + 1}-0${(i % 9) + 1}`,
        priority: 'NORMAL' as const,
      }));

      const result = routeOptimizationService.optimizeRoute(multiAisleTasks, 'A-01-01');
      expect(result.algorithm).toBe('aisle');
    });
  });

  // ==========================================================================
  // DISTANCE CALCULATION TESTS
  // ==========================================================================

  describe('Distance calculation', () => {
    it('should calculate distance between adjacent locations', () => {
      const tasks: PickTask[] = [
        {
          taskId: 'task-1',
          orderId: 'ORD-001',
          sku: 'SKU-001',
          quantity: 10,
          binLocation: 'A-01-01',
          priority: 'NORMAL',
        },
        {
          taskId: 'task-2',
          orderId: 'ORD-001',
          sku: 'SKU-002',
          quantity: 5,
          binLocation: 'A-01-02',
          priority: 'NORMAL',
        },
      ];

      const result = routeOptimizationService.optimizeRoute(tasks, 'A-01-01');
      expect(result.totalDistance).toBeGreaterThan(0);
      expect(result.totalDistance).toBeLessThan(100); // Should be small for adjacent locations
    });

    it('should calculate greater distance for locations in different zones', () => {
      const sameZoneTasks: PickTask[] = [
        {
          taskId: 'task-1',
          orderId: 'ORD-001',
          sku: 'SKU-001',
          quantity: 10,
          binLocation: 'A-01-01',
          priority: 'NORMAL',
        },
        {
          taskId: 'task-2',
          orderId: 'ORD-001',
          sku: 'SKU-002',
          quantity: 5,
          binLocation: 'A-10-10',
          priority: 'NORMAL',
        },
      ];

      const differentZoneTasks: PickTask[] = [
        {
          taskId: 'task-1',
          orderId: 'ORD-001',
          sku: 'SKU-001',
          quantity: 10,
          binLocation: 'A-01-01',
          priority: 'NORMAL',
        },
        {
          taskId: 'task-2',
          orderId: 'ORD-001',
          sku: 'SKU-002',
          quantity: 5,
          binLocation: 'D-10-10',
          priority: 'NORMAL',
        },
      ];

      const sameZoneResult = routeOptimizationService.optimizeRoute(sameZoneTasks, 'A-01-01');
      const differentZoneResult = routeOptimizationService.optimizeRoute(
        differentZoneTasks,
        'A-01-01'
      );

      expect(differentZoneResult.totalDistance).toBeGreaterThan(sameZoneResult.totalDistance);
    });
  });

  // ==========================================================================
  // TIME ESTIMATION TESTS
  // ==========================================================================

  describe('Time estimation', () => {
    it('should estimate time based on distance and picks', () => {
      const result = routeOptimizationService.optimizeRoute(mockTasks, 'DEPOT');

      expect(result.estimatedTime).toBeGreaterThan(0);

      // Time should be approximately: (distance / speed) + (picks * pickTime)
      const travelTime = (result.totalDistance / 1.4) * 1000; // ms
      const pickTime = mockTasks.length * 15000; // 15s per pick in ms

      expect(result.estimatedTime).toBeGreaterThanOrEqual(travelTime + pickTime - 1000);
      expect(result.estimatedTime).toBeLessThanOrEqual(travelTime + pickTime + 1000);
    });

    it('should estimate more time for more tasks', () => {
      const fewTasks = mockTasks.slice(0, 2);
      const manyTasks = [...mockTasks, ...mockTasks];

      const fewResult = routeOptimizationService.optimizeRoute(fewTasks, 'DEPOT');
      const manyResult = routeOptimizationService.optimizeRoute(manyTasks, 'DEPOT');

      expect(manyResult.estimatedTime).toBeGreaterThan(fewResult.estimatedTime);
    });
  });

  // ==========================================================================
  // CONFIGURATION TESTS
  // ==========================================================================

  describe('Configuration', () => {
    it('should return current configuration', () => {
      const config = routeOptimizationService.getConfig();

      expect(config).toBeDefined();
      expect(config.aisleWidth).toBeDefined();
      expect(config.shelfDepth).toBeDefined();
      expect(config.walkingSpeed).toBeDefined();
      expect(config.pickTime).toBeDefined();
      expect(config.zoneLayout).toBeDefined();
    });

    it('should update configuration', () => {
      const newConfig = {
        walkingSpeed: 2.0,
        pickTime: 20,
      };

      routeOptimizationService.updateConfig(newConfig);
      const config = routeOptimizationService.getConfig();

      expect(config.walkingSpeed).toBe(2.0);
      expect(config.pickTime).toBe(20);
    });

    it('should have default zone layout', () => {
      const config = routeOptimizationService.getConfig();

      expect(config.zoneLayout).toBeDefined();
      expect(config.zoneLayout['A']).toBeDefined();
      expect(config.zoneLayout['B']).toBeDefined();
      expect(config.zoneLayout['C']).toBeDefined();
      expect(config.zoneLayout['D']).toBeDefined();
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe('Error handling', () => {
    it('should throw error for invalid location format', () => {
      const invalidTasks: PickTask[] = [
        {
          taskId: 'task-1',
          orderId: 'ORD-001',
          sku: 'SKU-001',
          quantity: 10,
          binLocation: 'INVALID-FORMAT',
          priority: 'NORMAL',
        },
      ];

      expect(() => routeOptimizationService.optimizeRoute(invalidTasks, 'DEPOT')).toThrow();
    });

    it('should handle empty task array', () => {
      const result = routeOptimizationService.optimizeRoute([], 'DEPOT');

      expect(result.tasks).toHaveLength(0);
      expect(result.waypoints).toHaveLength(2); // start and end
    });

    it('should handle DEPOT as start location', () => {
      const result = routeOptimizationService.optimizeRoute(mockTasks, 'DEPOT');

      expect(result.waypoints[0].location).toBe('DEPOT');
      expect(result.waypoints[result.waypoints.length - 1].location).toBe('DEPOT');
    });

    it('should handle custom start location', () => {
      const result = routeOptimizationService.optimizeRoute(mockTasks, 'A-05-05');

      expect(result.waypoints[0].location).toBe('A-05-05');
      expect(result.waypoints[result.waypoints.length - 1].location).toBe('A-05-05');
    });
  });

  // ==========================================================================
  // PRIORITY HANDLING TESTS
  // ==========================================================================

  describe('Priority handling', () => {
    it('should preserve task priorities', () => {
      const priorityTasks: PickTask[] = [
        {
          taskId: 'task-1',
          orderId: 'ORD-001',
          sku: 'SKU-001',
          quantity: 10,
          binLocation: 'A-01-01',
          priority: 'URGENT',
        },
        {
          taskId: 'task-2',
          orderId: 'ORD-001',
          sku: 'SKU-002',
          quantity: 5,
          binLocation: 'A-05-03',
          priority: 'HIGH',
        },
        {
          taskId: 'task-3',
          orderId: 'ORD-001',
          sku: 'SKU-003',
          quantity: 20,
          binLocation: 'A-10-08',
          priority: 'LOW',
        },
      ];

      const result = routeOptimizationService.optimizeRoute(priorityTasks, 'A-01-01');

      result.tasks.forEach(task => {
        expect(['LOW', 'NORMAL', 'HIGH', 'URGENT']).toContain(task.priority);
      });
    });
  });

  // ==========================================================================
  // ALGORITHM COMPARISON TESTS
  // ==========================================================================

  describe('Algorithm comparison', () => {
    it('should produce different routes with different algorithms', () => {
      const tspRoute = routeOptimizationService.optimizeRoute(mockTasks, 'DEPOT', {
        algorithm: 'tsp',
      });
      const nearestRoute = routeOptimizationService.optimizeRoute(mockTasks, 'DEPOT', {
        algorithm: 'nearest',
      });
      const aisleRoute = routeOptimizationService.optimizeRoute(mockTasks, 'DEPOT', {
        algorithm: 'aisle',
      });
      const zoneRoute = routeOptimizationService.optimizeRoute(mockTasks, 'DEPOT', {
        algorithm: 'zone',
      });

      // Routes should have different distances (though not guaranteed)
      const distances = [tspRoute, nearestRoute, aisleRoute, zoneRoute].map(r => r.totalDistance);
      const uniqueDistances = new Set(distances);

      // At least some algorithms should produce different results
      expect(uniqueDistances.size).toBeGreaterThan(1);
    });
  });
});
