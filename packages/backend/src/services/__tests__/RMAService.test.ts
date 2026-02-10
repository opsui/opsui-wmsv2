/**
 * Unit tests for RMAService
 * @covers src/services/RMAService.ts
 */

import { RMAService } from '../RMAService';
import { rmaRepository } from '../../repositories/RMARepository';
import { NotFoundError, RMAStatus, RMAPriority, RMAReason, CreateRMADTO } from '@opsui/shared';
import type { RMARequest, RMAInspection } from '@opsui/shared';

// Mock dependencies
jest.mock('../../repositories/RMARepository', () => ({
  rmaRepository: {
    createRMARequest: jest.fn(),
    findRMAById: jest.fn(),
    findAllRMAs: jest.fn(),
    updateRMARequest: jest.fn(),
    logActivity: jest.fn(),
    findInspectionsByRMA: jest.fn(),
  },
}));

describe('RMAService', () => {
  let rmaService: RMAService;

  // Helper to create mock RMA request
  const createMockRMA = (overrides: any = {}): RMARequest => ({
    rmaId: 'RMA-001',
    rmaNumber: 'RMA-2024-0001',
    orderId: 'ORD-001',
    orderItemId: 'ITEM-001',
    sku: 'SKU-001',
    productName: 'Test Product',
    quantity: 1,
    reason: RMAReason.DEFECTIVE,
    status: RMAStatus.PENDING,
    priority: RMAPriority.NORMAL,
    requestedDate: new Date('2024-01-01'),
    createdBy: 'user-123',
    createdAt: new Date('2024-01-01'),
    ...overrides,
  });

  // Helper to create mock RMA inspection
  const createMockInspection = (overrides: any = {}): RMAInspection => ({
    inspectionId: 'INSP-001',
    rmaId: 'RMA-001',
    inspectedBy: 'user-123',
    inspectionDate: new Date('2024-01-05'),
    condition: 'GOOD',
    defectType: null,
    resolution: 'REFUND',
    notes: 'Product in good condition',
    images: [],
    createdAt: new Date('2024-01-05'),
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    rmaService = new RMAService();
  });

  // ==========================================================================
  // RMA REQUESTS
  // ==========================================================================

  describe('createRMARequest', () => {
    it('should create a new RMA request', async () => {
      const dto: CreateRMADTO = {
        orderId: 'ORD-001',
        orderItemId: 'ITEM-001',
        sku: 'SKU-001',
        quantity: 1,
        reason: RMAReason.DEFECTIVE,
      };

      const mockRMA = createMockRMA(dto);
      (rmaRepository.createRMARequest as jest.Mock).mockResolvedValue(mockRMA);
      (rmaRepository.logActivity as jest.Mock).mockResolvedValue(undefined);

      const result = await rmaService.createRMARequest(dto, 'user-123');

      expect(result.rmaId).toBe('RMA-001');
      expect(result.status).toBe(RMAStatus.PENDING);
      expect(rmaRepository.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: 'CREATED',
        })
      );
    });

    it('should throw error when order ID is missing', async () => {
      const dto: CreateRMADTO = {
        orderId: '',
        orderItemId: 'ITEM-001',
        sku: 'SKU-001',
        quantity: 1,
        reason: RMAReason.DEFECTIVE,
      };

      await expect(rmaService.createRMARequest(dto, 'user-123')).rejects.toThrow(
        'Order ID is required'
      );
    });

    it('should throw error when quantity is zero or negative', async () => {
      const dto: CreateRMADTO = {
        orderId: 'ORD-001',
        orderItemId: 'ITEM-001',
        sku: 'SKU-001',
        quantity: 0,
        reason: RMAReason.DEFECTIVE,
      };

      await expect(rmaService.createRMARequest(dto, 'user-123')).rejects.toThrow(
        'Quantity must be greater than 0'
      );
    });
  });

  describe('getRMAById', () => {
    it('should return an RMA by ID', async () => {
      const mockRMA = createMockRMA();
      (rmaRepository.findRMAById as jest.Mock).mockResolvedValue(mockRMA);

      const result = await rmaService.getRMAById('RMA-001');

      expect(result).toEqual(mockRMA);
    });

    it('should throw NotFoundError when RMA not found', async () => {
      (rmaRepository.findRMAById as jest.Mock).mockResolvedValue(null);

      await expect(rmaService.getRMAById('NONEXISTENT')).rejects.toThrow(NotFoundError);
    });
  });

  describe('getRMAs', () => {
    it('should return all RMAs with pagination', async () => {
      const mockRMAs = [createMockRMA({ rmaId: 'RMA-001' }), createMockRMA({ rmaId: 'RMA-002' })];
      (rmaRepository.findAllRMAs as jest.Mock).mockResolvedValue({
        requests: mockRMAs,
        total: 2,
      });

      const result = await rmaService.getRMAs();

      expect(result.requests).toHaveLength(2);
      expect(result.total).toBe(2);
    });

    it('should filter RMAs by status', async () => {
      const mockRMAs = [createMockRMA()];
      (rmaRepository.findAllRMAs as jest.Mock).mockResolvedValue({
        requests: mockRMAs,
        total: 1,
      });

      await rmaService.getRMAs({ status: RMAStatus.PENDING });

      expect(rmaRepository.findAllRMAs).toHaveBeenCalledWith({ status: RMAStatus.PENDING });
    });

    it('should filter RMAs by priority', async () => {
      const mockRMAs = [createMockRMA()];
      (rmaRepository.findAllRMAs as jest.Mock).mockResolvedValue({
        requests: mockRMAs,
        total: 1,
      });

      await rmaService.getRMAs({ priority: RMAPriority.URGENT });

      expect(rmaRepository.findAllRMAs).toHaveBeenCalledWith({ priority: RMAPriority.URGENT });
    });
  });

  describe('updateRMAStatus', () => {
    it('should update RMA status', async () => {
      const existingRMA = createMockRMA({ status: RMAStatus.PENDING });
      const updatedRMA = createMockRMA({ status: RMAStatus.APPROVED });

      (rmaRepository.findRMAById as jest.Mock).mockResolvedValue(existingRMA);
      (rmaRepository.updateRMARequest as jest.Mock).mockResolvedValue(updatedRMA);
      (rmaRepository.logActivity as jest.Mock).mockResolvedValue(undefined);

      const result = await rmaService.updateRMAStatus(
        'RMA-001',
        { status: RMAStatus.APPROVED },
        'user-123'
      );

      expect(result.status).toBe(RMAStatus.APPROVED);
      expect(rmaRepository.logActivity).toHaveBeenCalledWith(
        expect.objectContaining({
          activityType: 'STATUS_CHANGED',
        })
      );
    });

    it('should throw error for invalid status transition', async () => {
      const existingRMA = createMockRMA({ status: RMAStatus.CLOSED });
      (rmaRepository.findRMAById as jest.Mock).mockResolvedValue(existingRMA);

      await expect(
        rmaService.updateRMAStatus('RMA-001', { status: RMAStatus.PENDING }, 'user-123')
      ).rejects.toThrow('Invalid status transition');
    });
  });

  describe('approveRMA', () => {
    it('should approve an RMA', async () => {
      const existingRMA = createMockRMA({ status: RMAStatus.PENDING });
      const approvedRMA = createMockRMA({ status: RMAStatus.APPROVED });

      (rmaRepository.findRMAById as jest.Mock).mockResolvedValue(existingRMA);
      (rmaRepository.updateRMARequest as jest.Mock).mockResolvedValue(approvedRMA);
      (rmaRepository.logActivity as jest.Mock).mockResolvedValue(undefined);

      const result = await rmaService.approveRMA('RMA-001', 'user-123');

      expect(result.status).toBe(RMAStatus.APPROVED);
    });
  });

  describe('rejectRMA', () => {
    it('should reject an RMA with reason', async () => {
      const existingRMA = createMockRMA({ status: RMAStatus.PENDING });
      const rejectedRMA = createMockRMA({
        status: RMAStatus.REJECTED,
        rejectionReason: 'Warranty expired',
      });

      (rmaRepository.findRMAById as jest.Mock).mockResolvedValue(existingRMA);
      (rmaRepository.updateRMARequest as jest.Mock).mockResolvedValue(rejectedRMA);
      (rmaRepository.logActivity as jest.Mock).mockResolvedValue(undefined);

      const result = await rmaService.rejectRMA('RMA-001', 'Warranty expired', 'user-123');

      expect(result.status).toBe(RMAStatus.REJECTED);
      expect(result.rejectionReason).toBe('Warranty expired');
    });
  });

  // ==========================================================================
  // RMA ACTIONS
  // ==========================================================================

  describe('markAsReceived', () => {
    it('should mark RMA as received', async () => {
      const existingRMA = createMockRMA({ status: RMAStatus.APPROVED });
      const receivedRMA = createMockRMA({ status: RMAStatus.RECEIVED });

      (rmaRepository.findRMAById as jest.Mock).mockResolvedValue(existingRMA);
      (rmaRepository.updateRMARequest as jest.Mock).mockResolvedValue(receivedRMA);
      (rmaRepository.logActivity as jest.Mock).mockResolvedValue(undefined);

      const result = await rmaService.markAsReceived('RMA-001', 'user-123');

      expect(result.status).toBe(RMAStatus.RECEIVED);
    });
  });

  // ==========================================================================
  // RMA INSPECTIONS
  // ==========================================================================

  describe('getInspections', () => {
    it('should return all inspections for an RMA', async () => {
      const mockInspections = [
        createMockInspection({ inspectionId: 'INSP-001' }),
        createMockInspection({ inspectionId: 'INSP-002' }),
      ];
      (rmaRepository.findInspectionsByRMA as jest.Mock).mockResolvedValue(mockInspections);

      const result = await rmaService.getInspections('RMA-001');

      expect(result).toHaveLength(2);
    });
  });
});
