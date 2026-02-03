/**
 * Cycle Count Service Tests
 *
 * Tests for cycle counting including plans, entries, tolerances,
 * variance handling, and reconciliation
 */

import { CycleCountService, cycleCountService } from '../CycleCountService';
import { logger } from '../../config/logger';
import { notifyAll } from '../NotificationHelper';
import {
  CycleCountStatus,
  CycleCountType,
  VarianceStatus,
  TransactionType,
  OrderStatus,
} from '@opsui/shared';

// Mock dependencies
jest.mock('../../config/logger');
jest.mock('../NotificationHelper');

describe('CycleCountService', () => {
  let service: CycleCountService;

  beforeEach(() => {
    service = new CycleCountService();

    // Reset global mockPool.query
    global.mockPool.query = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // BULK OPERATIONS
  // ==========================================================================

  describe('bulkUpdateVarianceStatus', () => {
    it('should bulk update variance status to approved', async () => {
      const dto = {
        planId: 'CCP-001',
        status: VarianceStatus.APPROVED,
        reviewedBy: 'user-123',
        notes: 'Bulk approved',
        autoApproveZeroVariance: true,
      };

      const mockEntries = [
        { entry_id: 'CCE-001', variance: 5 },
        { entry_id: 'CCE-002', variance: -3 },
        { entry_id: 'CCE-003', variance: 0 },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: mockEntries }) // get entries
        .mockResolvedValueOnce({ rows: [{ transaction_id: 'TXN-001' }] }) // processVarianceAdjustment
        .mockResolvedValueOnce({ rows: [] }); // UPDATE entry

      const result = await service.bulkUpdateVarianceStatus(dto);

      expect(result.updated).toBe(3);
      expect(result.skipped).toBe(0);
      expect(result.adjustments).toHaveLength(2); // Non-zero variances
    });

    it('should skip zero variance entries when autoApproveZeroVariance is false', async () => {
      const dto = {
        planId: 'CCP-001',
        status: VarianceStatus.APPROVED,
        reviewedBy: 'user-123',
        autoApproveZeroVariance: false,
      };

      const mockEntries = [
        { entry_id: 'CCE-001', variance: 5 },
        { entry_id: 'CCE-002', variance: 0 },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: mockEntries })
        .mockResolvedValueOnce({ rows: [] });

      await mockClient.query('COMMIT');

      const result = await service.bulkUpdateVarianceStatus(dto);

      expect(result.updated).toBe(1);
      expect(result.skipped).toBe(1);
    });

    it('should handle rejected variances', async () => {
      const dto = {
        planId: 'CCP-001',
        status: VarianceStatus.REJECTED,
        reviewedBy: 'user-123',
        notes: 'Rejected variances',
      };

      const mockEntries = [
        { entry_id: 'CCE-001', variance: 5 },
        { entry_id: 'CCE-002', variance: -2 },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: mockEntries })
        .mockResolvedValue({ rows: [] });

      await mockClient.query('COMMIT');

      const result = await service.bulkUpdateVarianceStatus(dto);

      expect(result.updated).toBe(2);
      expect(result.adjustments).toHaveLength(0); // No adjustments for rejected
    });
  });

  describe('getReconcileSummary', () => {
    it('should return reconcile summary for a plan', async () => {
      const mockEntries = [
        {
          sku: 'SKU-001',
          bin_location: 'A-01-01',
          system_quantity: '10',
          counted_quantity: '8',
          variance: '-2',
          variance_percent: '20',
        },
        {
          sku: 'SKU-002',
          bin_location: 'A-01-02',
          system_quantity: '5',
          counted_quantity: '7',
          variance: '2',
          variance_percent: '40',
        },
        {
          sku: 'SKU-003',
          bin_location: 'A-01-03',
          system_quantity: '15',
          counted_quantity: '15',
          variance: '0',
          variance_percent: '0',
        },
      ];

      global.mockPool.query.mockResolvedValueOnce({ rows: mockEntries });

      const result = await service.getReconcileSummary('CCP-001');

      expect(result.pendingVarianceCount).toBe(2);
      expect(result.totalAdjustmentValue).toBe(4); // 2 + 2
      expect(result.skusToAdjust).toHaveLength(2);
      expect(result.zeroVarianceEntries).toBe(1);
    });

    it('should return empty summary when no entries', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getReconcileSummary('CCP-001');

      expect(result.pendingVarianceCount).toBe(0);
      expect(result.totalAdjustmentValue).toBe(0);
      expect(result.skusToAdjust).toHaveLength(0);
    });
  });

  describe('cancelCycleCountPlan', () => {
    it('should cancel a scheduled cycle count plan', async () => {
      const dto = {
        planId: 'CCP-001',
        cancelledBy: 'user-123',
        reason: 'No longer needed',
      };

      const mockPlan = {
        plan_id: 'CCP-001',
        status: CycleCountStatus.SCHEDULED,
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockPlan] }) // get plan
        .mockResolvedValueOnce({ rows: [] }); // UPDATE

      await mockClient.query('COMMIT');

      // Mock getCycleCountPlan call
      global.mockPool.query.mockResolvedValueOnce({
        rows: [{ plan_id: 'CCP-001', status: CycleCountStatus.CANCELLED }],
      });

      const result = await service.cancelCycleCountPlan(dto);

      expect(result.status).toBe(CycleCountStatus.CANCELLED);
    });

    it('should throw error when cancelling completed plan', async () => {
      const dto = {
        planId: 'CCP-001',
        cancelledBy: 'user-123',
      };

      const mockPlan = {
        plan_id: 'CCP-001',
        status: CycleCountStatus.COMPLETED,
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockPlan] });

      await expect(service.cancelCycleCountPlan(dto)).rejects.toThrow(
        'Cannot cancel a COMPLETED cycle count'
      );
    });
  });

  describe('checkForCollisions', () => {
    it('should return no collisions when no location specified', async () => {
      const mockPlan = {
        plan_id: 'CCP-001',
        location: null,
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockPlan] });

      const result = await service.checkForCollisions('CCP-001');

      expect(result.hasCollisions).toBe(false);
      expect(result.collidingCounts).toHaveLength(0);
    });

    it('should detect colliding counts in same location', async () => {
      const mockPlan = {
        plan_id: 'CCP-001',
        location: 'A',
      };

      const mockCollisions = [
        {
          plan_id: 'CCP-002',
          plan_name: 'Other Count',
          location: 'A',
          status: CycleCountStatus.IN_PROGRESS,
          count_by: 'user-456',
        },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [mockPlan] })
        .mockResolvedValueOnce({ rows: mockCollisions });

      const result = await service.checkForCollisions('CCP-001');

      expect(result.hasCollisions).toBe(true);
      expect(result.collidingCounts).toHaveLength(1);
      expect(result.collidingCounts[0].planId).toBe('CCP-002');
    });
  });

  describe('exportCycleCountData', () => {
    it('should export cycle count data as CSV', async () => {
      const mockPlan = { plan_id: 'CCP-001' };
      const mockEntries = [
        {
          sku: 'SKU-001',
          bin_location: 'A-01-01',
          system_quantity: '10',
          counted_quantity: '8',
          variance: '-2',
          variance_percent: '20',
          variance_status: 'PENDING',
          counted_at: '2024-01-01T00:00:00Z',
          counted_by: 'user-123',
          reviewed_at: null,
          reviewed_by: null,
          notes: null,
        },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [mockPlan] })
        .mockResolvedValueOnce({ rows: mockEntries });

      const result = await service.exportCycleCountData('CCP-001');

      expect(result).toContain('SKU');
      expect(result).toContain('Bin Location');
      expect(result).toContain('SKU-001');
      expect(result).toContain('-2');
    });

    it('should throw error when plan not found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.exportCycleCountData('NONEXISTENT')).rejects.toThrow(
        'Cycle count plan NONEXISTENT not found'
      );
    });
  });

  // ==========================================================================
  // CYCLE COUNT PLAN METHODS
  // ==========================================================================

  describe('createCycleCountPlan', () => {
    it('should create a new cycle count plan', async () => {
      const dto = {
        planName: 'Monthly Zone A Count',
        countType: CycleCountType.BLANKET,
        scheduledDate: new Date('2024-01-15'),
        location: 'A',
        countBy: 'user-123',
        createdBy: 'admin-456',
        notes: 'Monthly inventory count',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ plan_id: 'CCP-001', plan_name: dto.planName, status: 'SCHEDULED' }],
        });

      await mockClient.query('COMMIT');

      // Mock getCycleCountPlan
      global.mockPool.query.mockResolvedValueOnce({
        rows: [{ plan_id: 'CCP-001', plan_name: dto.planName }],
      });
      global.mockPool.query.mockResolvedValueOnce({ rows: [] }); // entries

      const result = await service.createCycleCountPlan(dto);

      expect(result.planName).toBe(dto.planName);
      expect(result.countType).toBe(CycleCountType.BLANKET);
    });
  });

  describe('getCycleCountPlan', () => {
    it('should return cycle count plan with entries', async () => {
      const mockPlan = {
        plan_id: 'CCP-001',
        plan_name: 'Test Count',
        count_type: CycleCountType.BLANKET,
        status: CycleCountStatus.IN_PROGRESS,
        scheduled_date: '2024-01-15',
        started_at: '2024-01-15T10:00:00Z',
        completed_at: null,
        reconciled_at: null,
        location: 'A',
        sku: null,
        count_by: 'user-123',
        created_by: 'admin-456',
        notes: null,
        created_at: '2024-01-01T00:00:00Z',
        updated_at: '2024-01-01T00:00:00Z',
      };

      const mockEntries = [
        {
          entry_id: 'CCE-001',
          plan_id: 'CCP-001',
          sku: 'SKU-001',
          bin_location: 'A-01-01',
          system_quantity: '10',
          counted_quantity: '8',
          variance: '-2',
          variance_percent: '20',
          variance_status: 'PENDING',
          counted_at: '2024-01-15T11:00:00Z',
          counted_by: 'user-123',
          reviewed_by: null,
          reviewed_at: null,
          adjustment_transaction_id: null,
          notes: null,
        },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [mockPlan] })
        .mockResolvedValueOnce({ rows: mockEntries });

      const result = await service.getCycleCountPlan('CCP-001');

      expect(result.planId).toBe('CCP-001');
      expect(result.countEntries).toHaveLength(1);
      expect(result.countEntries[0].entryId).toBe('CCE-001');
    });

    it('should throw error when plan not found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.getCycleCountPlan('NONEXISTENT')).rejects.toThrow(
        'Cycle count plan NONEXISTENT not found'
      );
    });
  });

  describe('getAllCycleCountPlans', () => {
    it('should apply role-based access control for PICKER role', async () => {
      const mockPlans = [{ plan_id: 'CCP-001', count_by: 'user-123', status: 'IN_PROGRESS' }];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] }) // count
        .mockResolvedValueOnce({ rows: mockPlans }); // data

      global.mockPool.query.mockResolvedValueOnce({ rows: [] }); // entries

      const result = await service.getAllCycleCountPlans({
        requestingUserRole: 'PICKER',
        requestingUserId: 'user-123',
      });

      expect(result.total).toBe(1);
    });

    it('should return all plans for ADMIN role', async () => {
      const mockPlans = [
        { plan_id: 'CCP-001', count_by: 'user-123', status: 'SCHEDULED' },
        { plan_id: 'CCP-002', count_by: 'user-456', status: 'IN_PROGRESS' },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] })
        .mockResolvedValueOnce({ rows: mockPlans });

      global.mockPool.query.mockResolvedValueOnce({ rows: [] }); // entries

      const result = await service.getAllCycleCountPlans({
        requestingUserRole: 'ADMIN',
      });

      expect(result.total).toBe(2);
    });
  });

  describe('startCycleCountPlan', () => {
    it('should start a BLANKET cycle count and generate entries', async () => {
      const mockPlan = {
        plan_id: 'CCP-001',
        count_type: CycleCountType.BLANKET,
        location: 'A',
      };

      const mockInventory = [
        { sku: 'SKU-001', bin_location: 'A-01-01', quantity: '10' },
        { sku: 'SKU-002', bin_location: 'A-01-02', quantity: '5' },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockPlan] }) // get plan
        .mockResolvedValueOnce({ rows: [] }) // UPDATE status
        .mockResolvedValueOnce({ rows: mockInventory }); // inventory for BLANKET

      global.mockPool.query.mockResolvedValue({ rows: [] }); // INSERT entries

      await mockClient.query('COMMIT');

      // Mock getCycleCountPlan
      global.mockPool.query
        .mockResolvedValueOnce({ rows: [{ ...mockPlan, status: 'IN_PROGRESS' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.startCycleCountPlan('CCP-001', 'user-123');

      expect(result.status).toBe(CycleCountStatus.IN_PROGRESS);
    });
  });

  describe('completeCycleCountPlan', () => {
    it('should complete a cycle count plan', async () => {
      const mockPlan = {
        plan_id: 'CCP-001',
        status: CycleCountStatus.IN_PROGRESS,
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockPlan] });

      // Mock getCycleCountPlan
      global.mockPool.query
        .mockResolvedValueOnce({
          rows: [{ ...mockPlan, status: 'COMPLETED', completed_at: expect.any(String) }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.completeCycleCountPlan('CCP-001');

      expect(result.status).toBe(CycleCountStatus.COMPLETED);
    });
  });

  describe('reconcileCycleCountPlan', () => {
    it('should reconcile plan and process pending variances', async () => {
      const dto = {
        planId: 'CCP-001',
        reconciledBy: 'admin-456',
        notes: 'Reconciled',
      };

      const mockEntries = [
        { entry_id: 'CCE-001', variance: 5 },
        { entry_id: 'CCE-002', variance: -3 },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [] }); // UPDATE status

      global.mockPool.query.mockResolvedValueOnce({ rows: mockEntries }); // get pending

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // processVarianceAdjustment
        .mockResolvedValueOnce({ rows: [] }); // UPDATE entry

      await mockClient.query('COMMIT');

      // Mock getCycleCountPlan
      global.mockPool.query
        .mockResolvedValueOnce({ rows: [{ status: 'RECONCILED' }] })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.reconcileCycleCountPlan(dto);

      expect(result.status).toBe('RECONCILED');
    });
  });

  // ==========================================================================
  // CYCLE COUNT ENTRY METHODS
  // ==========================================================================

  describe('createCycleCountEntry', () => {
    it('should create entry with auto-adjustment within tolerance', async () => {
      const dto = {
        planId: 'CCP-001',
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        countedQuantity: 12,
        countedBy: 'user-123',
      };

      const mockInventory = [{ quantity: '10' }];
      const mockTolerance = {
        tolerance_id: 'TOL-001',
        allowable_variance_percent: 10,
        auto_adjust_threshold: 5,
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: mockInventory }) // get system quantity
        .mockResolvedValueOnce({ rows: [mockTolerance] }); // get tolerance

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [{ transaction_id: 'TXN-001' }] }) // createAdjustmentTransaction
        .mockResolvedValueOnce({ rows: [] }); // adjustInventoryUp

      const mockEntry = {
        entry_id: 'CCE-001',
        variance_status: 'AUTO_ADJUSTED',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockEntry] });

      await mockClient.query('COMMIT');

      const result = await service.createCycleCountEntry(dto);

      expect(result.varianceStatus).toBe(VarianceStatus.AUTO_ADJUSTED);
    });

    it('should create pending entry when variance exceeds tolerance', async () => {
      const dto = {
        planId: 'CCP-001',
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        countedQuantity: 15,
        countedBy: 'user-123',
      };

      const mockInventory = [{ quantity: '10' }];
      const mockTolerance = {
        tolerance_id: 'TOL-001',
        allowable_variance_percent: 10,
        auto_adjust_threshold: 5,
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: mockInventory })
        .mockResolvedValueOnce({ rows: [mockTolerance] });

      const mockEntry = {
        entry_id: 'CCE-001',
        variance_status: 'PENDING',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockEntry] });

      await mockClient.query('COMMIT');

      const result = await service.createCycleCountEntry(dto);

      expect(result.varianceStatus).toBe(VarianceStatus.PENDING);
      expect(notifyAll).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'EXCEPTION_REPORTED',
        })
      );
    });
  });

  describe('updateVarianceStatus', () => {
    it('should approve variance and create adjustment', async () => {
      const dto = {
        entryId: 'CCE-001',
        status: VarianceStatus.APPROVED,
        reviewedBy: 'admin-456',
        notes: 'Approved',
      };

      const mockEntry = {
        entry_id: 'CCE-001',
        variance: 5,
        adjustment_transaction_id: null,
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockEntry] }); // get entry

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // processVarianceAdjustment
        .mockResolvedValueOnce({ rows: [mockEntry] }); // UPDATE entry

      await mockClient.query('COMMIT');

      const result = await service.updateVarianceStatus(dto);

      expect(result.varianceStatus).toBe(VarianceStatus.APPROVED);
    });

    it('should reject variance without adjustment', async () => {
      const dto = {
        entryId: 'CCE-001',
        status: VarianceStatus.REJECTED,
        reviewedBy: 'admin-456',
      };

      const mockEntry = {
        entry_id: 'CCE-001',
        variance: 5,
        adjustment_transaction_id: null,
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockEntry] })
        .mockResolvedValueOnce({ rows: [mockEntry] }); // UPDATE entry

      await mockClient.query('COMMIT');

      const result = await service.updateVarianceStatus(dto);

      expect(result.varianceStatus).toBe(VarianceStatus.REJECTED);
    });
  });

  // ==========================================================================
  // TOLERANCE METHODS
  // ==========================================================================

  describe('getAllTolerances', () => {
    it('should return all active tolerance rules', async () => {
      const mockTolerances = [
        {
          tolerance_id: 'TOL-001',
          tolerance_name: 'Default',
          sku: null,
          abc_category: null,
          allowable_variance_percent: '10',
          allowable_variance_amount: '5',
          auto_adjust_threshold: '5',
          requires_approval_threshold: '10',
          is_active: true,
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      global.mockPool.query.mockResolvedValueOnce({ rows: mockTolerances });

      const result = await service.getAllTolerances();

      expect(result).toHaveLength(1);
      expect(result[0].allowableVariancePercent).toBe(10);
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle zero variance in entry', async () => {
      const dto = {
        planId: 'CCP-001',
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        countedQuantity: 10,
        countedBy: 'user-123',
      };

      const mockInventory = [{ quantity: '10' }];
      const mockTolerance = {
        tolerance_id: 'TOL-001',
        allowable_variance_percent: 10,
        auto_adjust_threshold: 5,
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({ rows: mockInventory })
        .mockResolvedValueOnce({ rows: [mockTolerance] });

      const mockEntry = { entry_id: 'CCE-001', variance_status: 'PENDING' };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockEntry] });

      await mockClient.query('COMMIT');

      const result = await service.createCycleCountEntry(dto);

      expect(result.variance).toBe(0);
    });

    it('should handle missing inventory for entry', async () => {
      const dto = {
        planId: 'CCP-001',
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        countedQuantity: 5,
        countedBy: 'user-123',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [] }).mockResolvedValueOnce({ rows: [] }); // No inventory found

      const mockTolerance = {
        tolerance_id: 'TOL-001',
        allowable_variance_percent: 10,
        auto_adjust_threshold: 5,
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockTolerance] });

      const mockEntry = { entry_id: 'CCE-001' };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockEntry] });

      await mockClient.query('COMMIT');

      const result = await service.createCycleCountEntry(dto);

      expect(result.systemQuantity).toBe(0);
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(cycleCountService).toBeInstanceOf(CycleCountService);
    });
  });
});
