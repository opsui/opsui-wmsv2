/**
 * Unit tests for SlottingOptimizationService
 * @covers src/services/SlottingOptimizationService.ts
 */

import { SlottingOptimizationService, ABCClass } from '../SlottingOptimizationService';
import { getAuditService, AuditEventType, AuditCategory } from '../AuditService';
import { getPool } from '../../db/client';

// Mock dependencies
jest.mock('../../db/client');
jest.mock('../../config/logger');
jest.mock('../AuditService', () => ({
  getAuditService: jest.fn(() => ({
    log: jest.fn().mockResolvedValue(undefined),
  })),
  AuditEventType: {
    INVENTORY_ADJUSTED: 'INVENTORY_ADJUSTED',
    SLOTTING_IMPLEMENTED: 'SLOTTING_IMPLEMENTED',
    DATA_MODIFICATION: 'DATA_MODIFICATION',
  },
  AuditCategory: {
    DATA_MODIFICATION: 'DATA_MODIFICATION',
    AUTHENTICATION: 'AUTHENTICATION',
    AUTHORIZATION: 'AUTHORIZATION',
  },
}));

describe('SlottingOptimizationService', () => {
  let slottingService: SlottingOptimizationService;
  let mockConnectedClient: any;
  let mockPool: any;
  let mockAuditService: any;

  // Helper to create mock velocity data
  const createMockVelocityData = (overrides: any = {}) => ({
    sku: 'SKU-001',
    productName: 'Test Product',
    barcode: '123456789',
    totalPicks: 100,
    picksPerDay: 1.5,
    avgQuantity: 10,
    lastPickDate: new Date('2024-01-01'),
    daysSinceLastPick: 5,
    trend: 'STABLE' as const,
    ...overrides,
  });

  beforeEach(() => {
    // Create the connected client mock
    mockConnectedClient = {
      query: jest.fn(),
      release: jest.fn().mockResolvedValue(undefined),
    };

    // Create the pool mock
    mockPool = {
      connect: jest.fn().mockResolvedValue(mockConnectedClient),
      query: jest.fn(),
    };

    // Mock getPool to return the pool
    (getPool as jest.Mock).mockReturnValue(mockPool);

    mockAuditService = {
      log: jest.fn().mockResolvedValue(undefined),
    };

    (getAuditService as jest.Mock).mockReturnValue(mockAuditService);

    jest.clearAllMocks();

    // Create service after mocks are set up
    slottingService = new SlottingOptimizationService();
  });

  // ==========================================================================
  // ABC ANALYSIS
  // ==========================================================================

  describe('runABCAnalysis', () => {
    it('should run ABC analysis for all SKUs', async () => {
      const mockRows = [
        {
          sku: 'SKU-001',
          product_name: 'Product A',
          barcode: '001',
          total_picks: 500,
          picks_per_day: 5.5,
          avg_qty_per_pick: 10,
          last_pick_date: new Date('2024-01-01'),
          days_since_last_pick: 5,
          velocity_percentile: 0.1,
        },
        {
          sku: 'SKU-002',
          product_name: 'Product B',
          barcode: '002',
          total_picks: 100,
          picks_per_day: 1.1,
          avg_qty_per_pick: 10,
          last_pick_date: new Date('2024-01-01'),
          days_since_last_pick: 15,
          velocity_percentile: 0.5,
        },
        {
          sku: 'SKU-003',
          product_name: 'Product C',
          barcode: '003',
          total_picks: 25,
          picks_per_day: 0.3,
          avg_qty_per_pick: 10,
          last_pick_date: new Date('2024-01-01'),
          days_since_last_pick: 30,
          velocity_percentile: 0.9,
        },
      ];

      // Mock velocity query
      mockConnectedClient.query
        .mockResolvedValueOnce({ rows: mockRows }) // Velocity data
        .mockResolvedValueOnce({ rows: [{ bin_location: 'D-05' }] }) // Current location
        .mockResolvedValueOnce({ rows: [{ bin_location: 'B-03' }] }) // Current location
        .mockResolvedValueOnce({ rows: [{ bin_location: 'A-01' }] }); // Current location

      const result = await slottingService.runABCAnalysis(90);

      expect(result).toHaveLength(3);
      expect(result[0].abcClass).toBe(ABCClass.A); // High velocity
      expect(result[0].priority).toBe('HIGH');
      expect(result[1].abcClass).toBe(ABCClass.B); // Medium velocity
      expect(result[2].abcClass).toBe(ABCClass.C); // Low velocity
    });

    it('should handle empty results gracefully', async () => {
      mockConnectedClient.query.mockResolvedValueOnce({ rows: [] });

      const result = await slottingService.runABCAnalysis(90);

      expect(result).toEqual([]);
    });

    it('should calculate picks per day correctly', async () => {
      const mockRows = [
        {
          sku: 'SKU-001',
          total_picks: 450,
          picks_per_day: 5.0,
          avg_qty_per_pick: 10,
          last_pick_date: new Date('2024-01-01'),
          days_since_last_pick: 5,
          velocity_percentile: 0.2,
        },
      ];

      mockConnectedClient.query
        .mockResolvedValueOnce({ rows: mockRows })
        .mockResolvedValueOnce({ rows: [{ bin_location: 'A-01' }] });

      const result = await slottingService.runABCAnalysis(90);

      expect(result[0].velocity).toBe(5.0);
    });

    it('should handle database errors gracefully', async () => {
      mockConnectedClient.query.mockRejectedValueOnce(new Error('Database error'));

      const result = await slottingService.runABCAnalysis(90);

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // SLOTTING RECOMMENDATIONS
  // ==========================================================================

  describe('getSlottingRecommendations', () => {
    it('should generate recommendations for relocations', async () => {
      const mockAnalysis = [
        {
          sku: 'SKU-001',
          productName: 'Product A',
          currentLocation: 'D-05',
          abcClass: ABCClass.A,
          velocity: 5.5,
          recommendedLocation: 'A-01',
          reason: 'High velocity item in poor location',
          priority: 'HIGH' as const,
        },
      ];

      // Mock runABCAnalysis
      mockConnectedClient.query.mockResolvedValue({ rows: [] });
      jest.spyOn(slottingService, 'runABCAnalysis' as any).mockResolvedValue(mockAnalysis);

      const result = await slottingService.getSlottingRecommendations();

      expect(result).toHaveLength(1);
      expect(result[0].sku).toBe('SKU-001');
      expect(result[0].fromLocation).toBe('D-05');
      expect(result[0].toLocation).toBe('A-01');
    });

    it('should filter by minimum priority', async () => {
      const mockAnalysis = [
        {
          sku: 'SKU-001',
          productName: 'Product A',
          currentLocation: 'D-05',
          abcClass: ABCClass.A,
          velocity: 5.5,
          recommendedLocation: 'A-01',
          reason: 'High velocity item in poor location',
          priority: 'HIGH' as const,
        },
        {
          sku: 'SKU-002',
          productName: 'Product B',
          currentLocation: 'B-03',
          abcClass: ABCClass.C,
          velocity: 0.3,
          recommendedLocation: 'C-04',
          reason: 'Low velocity in acceptable location',
          priority: 'LOW' as const,
        },
      ];

      mockConnectedClient.query.mockResolvedValue({ rows: [] });
      jest.spyOn(slottingService, 'runABCAnalysis' as any).mockResolvedValue(mockAnalysis);

      const result = await slottingService.getSlottingRecommendations({
        minPriority: 'HIGH',
      });

      expect(result).toHaveLength(1);
      expect(result[0].sku).toBe('SKU-001');
    });

    it('should limit number of recommendations', async () => {
      const mockAnalysis = [
        {
          sku: 'SKU-001',
          productName: 'Product A',
          currentLocation: 'D-05',
          abcClass: ABCClass.A,
          velocity: 5.5,
          recommendedLocation: 'A-01',
          reason: 'High velocity item in poor location',
          priority: 'HIGH' as const,
        },
        {
          sku: 'SKU-002',
          productName: 'Product B',
          currentLocation: 'C-04',
          abcClass: ABCClass.B,
          velocity: 1.2,
          recommendedLocation: 'B-02',
          reason: 'Medium velocity item in far location',
          priority: 'HIGH' as const,
        },
        {
          sku: 'SKU-003',
          productName: 'Product C',
          currentLocation: 'E-02',
          abcClass: ABCClass.A,
          velocity: 3.8,
          recommendedLocation: 'A-02',
          reason: 'High velocity item in bulk storage',
          priority: 'HIGH' as const,
        },
      ];

      mockConnectedClient.query.mockResolvedValue({ rows: [] });
      jest.spyOn(slottingService, 'runABCAnalysis' as any).mockResolvedValue(mockAnalysis);

      const result = await slottingService.getSlottingRecommendations({
        maxRecommendations: 2,
      });

      expect(result.length).toBeLessThanOrEqual(2);
    });

    it('should skip items already in optimal locations', async () => {
      const mockAnalysis = [
        {
          sku: 'SKU-001',
          productName: 'Product A',
          currentLocation: 'A-01',
          abcClass: ABCClass.A,
          velocity: 5.5,
          recommendedLocation: 'A-01',
          reason: 'Already in optimal location',
          priority: 'LOW' as const,
        },
      ];

      mockConnectedClient.query.mockResolvedValue({ rows: [] });
      jest.spyOn(slottingService, 'runABCAnalysis' as any).mockResolvedValue(mockAnalysis);

      const result = await slottingService.getSlottingRecommendations();

      expect(result).toHaveLength(0);
    });
  });

  // ==========================================================================
  // IMPLEMENT RECOMMENDATION
  // ==========================================================================

  describe('implementRecommendation', () => {
    it('should implement recommendation and log audit', async () => {
      const recommendation = {
        sku: 'SKU-001',
        fromLocation: 'D-05',
        toLocation: 'A-01',
        estimatedBenefit: {
          travelTimeReduction: 30,
          annualSavings: 5000,
        },
        effort: 'LOW' as const,
        priority: 1,
      };

      const context = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0',
      };

      mockConnectedClient.query.mockResolvedValueOnce(undefined); // BEGIN
      mockConnectedClient.query.mockResolvedValueOnce({ rowCount: 1 }); // UPDATE
      mockConnectedClient.query.mockResolvedValueOnce(undefined); // COMMIT

      await expect(
        slottingService.implementRecommendation(recommendation, context)
      ).resolves.not.toThrow();

      expect(mockConnectedClient.query).toHaveBeenCalledWith('BEGIN');
      expect(mockConnectedClient.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE inventory_units'),
        ['A-01', 'SKU-001', 'D-05']
      );
      expect(mockAuditService.log).toHaveBeenCalledWith(
        expect.objectContaining({
          actionType: 'INVENTORY_ADJUSTED',
          resourceId: 'SKU-001',
        })
      );
      expect(mockConnectedClient.query).toHaveBeenCalledWith('COMMIT');
    });

    it('should rollback on error', async () => {
      const recommendation = {
        sku: 'SKU-001',
        fromLocation: 'D-05',
        toLocation: 'A-01',
        estimatedBenefit: {
          travelTimeReduction: 30,
          annualSavings: 5000,
        },
        effort: 'LOW' as const,
        priority: 1,
      };

      const context = {
        userId: 'user-123',
      };

      mockConnectedClient.query.mockRejectedValueOnce(new Error('Database error'));

      await expect(
        slottingService.implementRecommendation(recommendation, context)
      ).rejects.toThrow('Database error');

      expect(mockConnectedClient.query).toHaveBeenCalledWith('ROLLBACK');
    });
  });

  // ==========================================================================
  // GET VELOCITY DATA
  // ==========================================================================

  describe('getVelocityData', () => {
    it('should return velocity data for SKU', async () => {
      const mockRows = [
        {
          total_picks: 100,
          total_quantity: 1000,
          avg_quantity: 10,
          last_pick_date: new Date('2024-01-01'),
        },
      ];

      // Mock both queries: velocity data and last pick date
      mockConnectedClient.query
        .mockResolvedValueOnce({ rows: mockRows }) // Velocity data
        .mockResolvedValueOnce({ rows: [{ started_at: new Date('2024-01-01') }] }); // Last pick date

      const result = await slottingService.getVelocityData('SKU-001', 90);

      expect(result).not.toBeNull();
      expect(result?.sku).toBe('SKU-001');
      expect(result?.totalPicks).toBe(100);
      expect(result?.picksPerDay).toBeDefined();
    });

    it('should return null for SKU with no data', async () => {
      mockConnectedClient.query
        .mockResolvedValueOnce({ rows: [] }) // Empty rows array
        .mockResolvedValueOnce({ rows: [] }); // No last pick date

      const result = await slottingService.getVelocityData('NONEXISTENT', 90);

      expect(result).toBeNull();
    });

    it('should calculate trend correctly', async () => {
      const mockRows = [
        { total_picks: 100, total_quantity: 1000, avg_quantity: '10' },
        { total_picks: 120, total_quantity: 1200, avg_quantity: '10' },
        { total_picks: 110, total_quantity: 1100, avg_quantity: '10' },
      ];

      mockConnectedClient.query
        .mockResolvedValueOnce({ rows: mockRows })
        .mockResolvedValueOnce({ rows: [{ started_at: new Date('2024-01-01') }] });

      const result = await slottingService.getVelocityData('SKU-001', 90);

      expect(result?.trend).toBeDefined();
    });
  });

  // ==========================================================================
  // ERROR HANDLING
  // ==========================================================================

  describe('error handling', () => {
    it('should handle connection errors gracefully', async () => {
      mockPool.connect.mockRejectedValue(new Error('Connection failed'));

      // The service throws on connection error before try-catch
      await expect(slottingService.runABCAnalysis(90)).rejects.toThrow('Connection failed');
    });

    it('should handle query errors in ABC analysis', async () => {
      mockConnectedClient.query.mockRejectedValueOnce(new Error('Query failed'));

      const result = await slottingService.runABCAnalysis(90);

      expect(result).toEqual([]);
    });

    it('should handle missing current location data', async () => {
      const mockRows = [
        {
          sku: 'SKU-001',
          product_name: 'Product A',
          total_picks: 100,
          picks_per_day: 1.1,
          avg_qty_per_pick: 10,
          last_pick_date: new Date('2024-01-01'),
          days_since_last_pick: 5,
          velocity_percentile: 0.3,
        },
      ];

      mockConnectedClient.query
        .mockResolvedValueOnce({ rows: mockRows })
        .mockResolvedValueOnce({ rows: [] }); // No current location

      const result = await slottingService.runABCAnalysis(90);

      expect(result[0].currentLocation).toBe('UNLOCATED');
    });
  });

  // ==========================================================================
  // PRIVATE METHODS (via public interface)
  // ==========================================================================

  describe('calculatePriority', () => {
    it('should prioritize HIGH velocity items in poor locations', async () => {
      const mockAnalysis = [
        {
          sku: 'SKU-001',
          productName: 'Product A',
          currentLocation: 'E-05', // Far away
          abcClass: ABCClass.A,
          velocity: 10,
          recommendedLocation: 'A-01',
          reason: 'High velocity in far location',
          priority: 'HIGH' as const,
        },
      ];

      mockConnectedClient.query.mockResolvedValue({ rows: [] });
      jest.spyOn(slottingService, 'runABCAnalysis' as any).mockResolvedValue(mockAnalysis);

      const result = await slottingService.getSlottingRecommendations();

      expect(result[0].priority).toBe(5); // Priority score calculated from benefit/effort
    });
  });
});
