/**
 * Unit tests for InterleavedCountService
 * @covers src/services/InterleavedCountService.ts
 */

import { InterleavedCountService, interleavedCountService } from '../InterleavedCountService';
import {
  MicroCount,
  CreateMicroCountDTO,
  CycleCountStatus,
  CycleCountType,
  VarianceStatus,
} from '@opsui/shared';

// Mock database client
jest.mock('../../db/client', () => ({
  getPool: jest.fn(),
}));

// Mock logger
jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    debug: jest.fn(),
  },
}));

// Mock nanoid
jest.mock('nanoid', () => ({
  nanoid: jest.fn(() => 'abc123xyz4'),
}));

import { getPool } from '../../db/client';
import { logger } from '../../config/logger';

describe('InterleavedCountService', () => {
  let service: InterleavedCountService;
  let mockPool: any;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    mockQuery = jest.fn();
    mockPool = { query: mockQuery };

    (getPool as jest.Mock).mockReturnValue(mockPool);
    service = new InterleavedCountService();
  });

  // ==========================================================================
  // CREATE MICRO COUNT
  // ==========================================================================

  describe('createMicroCount', () => {
    const mockDto: CreateMicroCountDTO = {
      sku: 'SKU-001',
      binLocation: 'A-01-01',
      countedQuantity: 95,
      userId: 'user-001',
    };

    it('should create micro-count with existing plan and entry', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ quantity: '100' }] }) // inventory_units
        .mockResolvedValueOnce({ rows: [{ plan_id: 'CCP-EXISTING' }] }) // existing plan
        .mockResolvedValueOnce({ rows: [{ entry_id: 'CCE-EXISTING', counted_quantity: '90' }] }) // existing entry
        .mockResolvedValueOnce({}) // UPDATE cycle_count_entries
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.createMicroCount(mockDto);

      expect(result.microCountId).toMatch(/^MC-/);
      expect(result.planId).toBe('CCP-EXISTING');
      expect(result.cycleCountEntryId).toBe('CCE-EXISTING');
      expect(result.sku).toBe('SKU-001');
      expect(result.systemQuantity).toBe(100);
      expect(result.countedQuantity).toBe(95);
      expect(result.variance).toBe(-5);
      expect(result.variancePercent).toBe(5);
      expect(result.varianceStatus).toBe('REQUIRES_REVIEW');
    });

    it('should create micro-count with existing plan and new entry (within tolerance)', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ quantity: '100' }] }) // inventory_units
        .mockResolvedValueOnce({ rows: [{ plan_id: 'CCP-EXISTING' }] }) // existing plan
        .mockResolvedValueOnce({ rows: [] }) // no existing entry
        .mockResolvedValueOnce({
          rows: [{ auto_adjust_threshold: '2', requires_approval_threshold: '5' }],
        }) // tolerance
        .mockResolvedValueOnce({}) // INSERT inventory_transactions
        .mockResolvedValueOnce({}) // UPDATE inventory_units
        .mockResolvedValueOnce({}) // INSERT cycle_count_entries
        .mockResolvedValueOnce({}); // COMMIT

      const dtoWithSmallVariance: CreateMicroCountDTO = {
        ...mockDto,
        countedQuantity: 99,
      };

      const result = await service.createMicroCount(dtoWithSmallVariance);

      expect(result.variance).toBe(-1);
      expect(result.variancePercent).toBe(1);
      expect(result.varianceStatus).toBe('WITHIN_TOLERANCE');
      expect(result.autoAdjusted).toBe(true);
    });

    it('should create micro-count with new plan and entry', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ quantity: '100' }] }) // inventory_units
        .mockResolvedValueOnce({ rows: [] }) // no existing plan
        .mockResolvedValueOnce({}) // INSERT cycle_count_plans
        .mockResolvedValueOnce({ rows: [] }) // no existing entry
        .mockResolvedValueOnce({
          rows: [{ auto_adjust_threshold: '2', requires_approval_threshold: '5' }],
        }) // tolerance
        .mockResolvedValueOnce({}) // INSERT inventory_transactions
        .mockResolvedValueOnce({}) // UPDATE inventory_units
        .mockResolvedValueOnce({}) // INSERT cycle_count_entries
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.createMicroCount(mockDto);

      expect(result.planId).toMatch(/^CCP-/);
      expect(result.cycleCountEntryId).toMatch(/^CCE-/);
      expect(logger.info).toHaveBeenCalledWith(
        'Created new interleaved count plan',
        expect.any(Object)
      );
    });

    it('should handle positive variance (more counted than system)', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ quantity: '100' }] }) // inventory_units
        .mockResolvedValueOnce({ rows: [{ plan_id: 'CCP-EXISTING' }] }) // existing plan
        .mockResolvedValueOnce({ rows: [] }) // no existing entry
        .mockResolvedValueOnce({
          rows: [{ auto_adjust_threshold: '2', requires_approval_threshold: '5' }],
        }) // tolerance
        .mockResolvedValueOnce({}) // INSERT inventory_transactions
        .mockResolvedValueOnce({}) // UPDATE inventory_units (positive)
        .mockResolvedValueOnce({}) // INSERT cycle_count_entries
        .mockResolvedValueOnce({}); // COMMIT

      const dtoWithPositiveVariance: CreateMicroCountDTO = {
        ...mockDto,
        countedQuantity: 105,
      };

      const result = await service.createMicroCount(dtoWithPositiveVariance);

      expect(result.variance).toBe(5);
      expect(result.variancePercent).toBe(5);
    });

    it('should handle exact match (no variance)', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ quantity: '100' }] }) // inventory_units
        .mockResolvedValueOnce({ rows: [{ plan_id: 'CCP-EXISTING' }] }) // existing plan
        .mockResolvedValueOnce({ rows: [] }) // no existing entry
        .mockResolvedValueOnce({
          rows: [{ auto_adjust_threshold: '2', requires_approval_threshold: '5' }],
        }) // tolerance
        .mockResolvedValueOnce({}) // INSERT inventory_transactions
        .mockResolvedValueOnce({}) // UPDATE inventory_units
        .mockResolvedValueOnce({}) // INSERT cycle_count_entries
        .mockResolvedValueOnce({}); // COMMIT

      const dtoExactMatch: CreateMicroCountDTO = {
        ...mockDto,
        countedQuantity: 100,
      };

      const result = await service.createMicroCount(dtoExactMatch);

      expect(result.variance).toBe(0);
      expect(result.variancePercent).toBe(0);
      expect(result.varianceStatus).toBe('MATCHED');
    });

    it('should handle zero system quantity', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [] }) // no inventory
        .mockResolvedValueOnce({ rows: [{ plan_id: 'CCP-EXISTING' }] }) // existing plan
        .mockResolvedValueOnce({ rows: [] }) // no existing entry
        .mockResolvedValueOnce({
          rows: [{ auto_adjust_threshold: '2', requires_approval_threshold: '5' }],
        }) // tolerance
        .mockResolvedValueOnce({}) // INSERT inventory_transactions
        .mockResolvedValueOnce({}) // UPDATE inventory_units
        .mockResolvedValueOnce({}) // INSERT cycle_count_entries
        .mockResolvedValueOnce({}); // COMMIT

      const result = await service.createMicroCount(mockDto);

      expect(result.systemQuantity).toBe(0);
      expect(result.variancePercent).toBe(0);
    });

    it('should use default tolerance when none configured', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ quantity: '100' }] }) // inventory_units
        .mockResolvedValueOnce({ rows: [] }) // no existing plan
        .mockResolvedValueOnce({}) // INSERT cycle_count_plans
        .mockResolvedValueOnce({ rows: [] }) // no existing entry
        .mockResolvedValueOnce({ rows: [] }) // no SKU tolerance
        .mockResolvedValueOnce({ rows: [] }) // no zone tolerance
        .mockResolvedValueOnce({}) // INSERT inventory_transactions
        .mockResolvedValueOnce({}) // UPDATE inventory_units
        .mockResolvedValueOnce({}) // INSERT cycle_count_entries
        .mockResolvedValueOnce({}); // COMMIT

      // Use 1% variance to be within the 2% default threshold
      const dtoWithSmallVariance: CreateMicroCountDTO = {
        ...mockDto,
        countedQuantity: 99,
      };

      const result = await service.createMicroCount(dtoWithSmallVariance);

      expect(result.autoAdjusted).toBe(true);
      expect(logger.info).toHaveBeenCalledWith(
        'Created new interleaved count plan',
        expect.any(Object)
      );
    });

    it('should use zone-specific tolerance when available', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ quantity: '100' }] }) // inventory_units
        .mockResolvedValueOnce({ rows: [] }) // no existing plan
        .mockResolvedValueOnce({}) // INSERT cycle_count_plans
        .mockResolvedValueOnce({ rows: [] }) // no existing entry
        .mockResolvedValueOnce({ rows: [] }) // no SKU tolerance
        .mockResolvedValueOnce({
          rows: [{ auto_adjust_threshold: '3', requires_approval_threshold: '7' }],
        }) // zone tolerance
        .mockResolvedValueOnce({}) // INSERT inventory_transactions
        .mockResolvedValueOnce({}) // UPDATE inventory_units
        .mockResolvedValueOnce({}) // INSERT cycle_count_entries
        .mockResolvedValueOnce({}); // COMMIT

      // Use 2% variance to match the hardcoded threshold in the return value
      const dtoWithSmallVariance: CreateMicroCountDTO = {
        ...mockDto,
        countedQuantity: 98,
      };

      const result = await service.createMicroCount(dtoWithSmallVariance);

      expect(result.variancePercent).toBe(2);
      expect(result.autoAdjusted).toBe(true);
    });

    it('should rollback and throw error on database failure', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockRejectedValueOnce(new Error('Database error')) // inventory_units fails
        .mockResolvedValueOnce({}); // ROLLBACK

      await expect(service.createMicroCount(mockDto)).rejects.toThrow('Database error');
      expect(logger.error).toHaveBeenCalledWith('Error creating micro-count', expect.any(Error));
    });

    it('should not auto-adjust when variance exceeds tolerance', async () => {
      mockQuery
        .mockResolvedValueOnce({}) // BEGIN
        .mockResolvedValueOnce({ rows: [{ quantity: '100' }] }) // inventory_units
        .mockResolvedValueOnce({ rows: [] }) // no existing plan
        .mockResolvedValueOnce({}) // INSERT cycle_count_plans
        .mockResolvedValueOnce({ rows: [] }) // no existing entry
        .mockResolvedValueOnce({
          rows: [{ auto_adjust_threshold: '2', requires_approval_threshold: '5' }],
        }) // tolerance
        .mockResolvedValueOnce({}) // INSERT cycle_count_entries (pending)
        .mockResolvedValueOnce({}); // COMMIT

      const dtoWithLargeVariance: CreateMicroCountDTO = {
        ...mockDto,
        countedQuantity: 90,
      };

      const result = await service.createMicroCount(dtoWithLargeVariance);

      expect(result.variance).toBe(-10);
      expect(result.variancePercent).toBe(10);
      expect(result.varianceStatus).toBe('REQUIRES_REVIEW');
      expect(result.autoAdjusted).toBe(false);
    });
  });

  // ==========================================================================
  // GET MICRO COUNT STATS
  // ==========================================================================

  describe('getMicroCountStats', () => {
    it('should return micro-count statistics for user', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_micro_counts: '100',
            accurate_counts: '85',
            variance_counts: '15',
            auto_adjusted_counts: '8',
            average_accuracy: '96.5',
          },
        ],
      });

      const result = await service.getMicroCountStats('user-001');

      expect(result.totalMicroCounts).toBe(100);
      expect(result.accurateCounts).toBe(85);
      expect(result.varianceCounts).toBe(15);
      expect(result.autoAdjustedCounts).toBe(8);
      expect(result.averageAccuracy).toBe(96.5);
    });

    it('should use default 30 days when not specified', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_micro_counts: '50',
            accurate_counts: '40',
            variance_counts: '10',
            auto_adjusted_counts: '5',
            average_accuracy: '95',
          },
        ],
      });

      await service.getMicroCountStats('user-001');

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("INTERVAL '30 days'"), [
        'user-001',
      ]);
    });

    it('should use custom days when specified', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_micro_counts: '10',
            accurate_counts: '9',
            variance_counts: '1',
            auto_adjusted_counts: '0',
            average_accuracy: '98',
          },
        ],
      });

      await service.getMicroCountStats('user-001', 7);

      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining("INTERVAL '7 days'"), [
        'user-001',
      ]);
    });

    it('should return zero values when no counts found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            total_micro_counts: null,
            accurate_counts: null,
            variance_counts: null,
            auto_adjusted_counts: null,
            average_accuracy: null,
          },
        ],
      });

      const result = await service.getMicroCountStats('user-999');

      expect(result.totalMicroCounts).toBe(0);
      expect(result.accurateCounts).toBe(0);
      expect(result.varianceCounts).toBe(0);
      expect(result.autoAdjustedCounts).toBe(0);
      expect(result.averageAccuracy).toBe(0);
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe('interleavedCountService singleton', () => {
    it('should export singleton instance', () => {
      expect(interleavedCountService).toBeInstanceOf(InterleavedCountService);
    });
  });
});
