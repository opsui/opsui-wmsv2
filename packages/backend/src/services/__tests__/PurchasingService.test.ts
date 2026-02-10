/**
 * Unit tests for PurchasingService
 * @covers src/services/PurchasingService.ts
 */

import { PurchasingService } from '../PurchasingService';
import {
  purchaseRequisitionRepository,
  purchaseRequisitionLineRepository,
  requisitionApprovalRepository,
  rfqHeaderRepository,
  rfqLineRepository,
  rfqVendorRepository,
  purchaseOrderHeaderRepository,
  purchaseOrderLineRepository,
} from '../../repositories/PurchasingRepository';
import { transaction } from '../../db/client';
import { RequisitionStatus, RFQStatus, PurchaseOrderStatus } from '@opsui/shared';
import type {
  PurchaseRequisition,
  CreatePurchaseRequisitionDTO,
  CreateRFQDTO,
  CreatePurchaseOrderDTO,
  ConvertRequisitionToPODTO,
  RequisitionApprovalDTO,
} from '@opsui/shared';

// Mock transaction function
jest.mock('../../db/client', () => ({
  transaction: jest.fn(),
  query: jest.fn(),
}));

// Mock dependencies
jest.mock('../../repositories/PurchasingRepository', () => ({
  purchaseRequisitionRepository: {
    queryWithFilters: jest.fn(),
    findById: jest.fn(),
    findByIdOrThrow: jest.fn(),
    findByIdWithDetails: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    findByNumber: jest.fn(),
    findPendingApprovals: jest.fn(),
    delete: jest.fn(),
  },
  purchaseRequisitionLineRepository: {
    insert: jest.fn(),
    delete: jest.fn(),
    findByRequisitionId: jest.fn(),
  },
  requisitionApprovalRepository: {
    insert: jest.fn(),
    update: jest.fn(),
    findByRequisitionId: jest.fn(),
  },
  rfqHeaderRepository: {
    queryWithFilters: jest.fn(),
    findById: jest.fn(),
    findByIdOrThrow: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    findByNumber: jest.fn(),
    delete: jest.fn(),
  },
  rfqLineRepository: {
    insert: jest.fn(),
    delete: jest.fn(),
    findByRfqId: jest.fn(),
  },
  rfqVendorRepository: {
    insert: jest.fn(),
    delete: jest.fn(),
    findByRfqId: jest.fn(),
  },
  rfqVendorResponseRepository: {
    insert: jest.fn(),
    update: jest.fn(),
    findByRfqId: jest.fn(),
  },
  rfqResponseLineRepository: {
    insert: jest.fn(),
    update: jest.fn(),
  },
  vendorItemCatalogRepository: {
    queryWithFilters: jest.fn(),
    findById: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
  purchaseOrderHeaderRepository: {
    queryWithFilters: jest.fn(),
    findById: jest.fn(),
    findByIdOrThrow: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    findByNumber: jest.fn(),
    delete: jest.fn(),
  },
  purchaseOrderLineRepository: {
    insert: jest.fn(),
    delete: jest.fn(),
    findByPoId: jest.fn(),
  },
  purchaseReceiptRepository: {
    queryWithFilters: jest.fn(),
    findById: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
  purchaseReceiptLineRepository: {
    insert: jest.fn(),
    update: jest.fn(),
    findByReceiptId: jest.fn(),
  },
  threeWayMatchRepository: {
    findById: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    findByPoId: jest.fn(),
  },
  vendorPerformanceSummaryRepository: {
    findByVendorId: jest.fn(),
    upsert: jest.fn(),
  },
  vendorPerformanceEventRepository: {
    insert: jest.fn(),
    queryWithFilters: jest.fn(),
  },
  vendorScorecardRepository: {
    findByVendorId: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
  },
}));

describe('PurchasingService', () => {
  let purchasingService: PurchasingService;

  // Helper to create mock purchase requisition
  const createMockRequisition = (overrides: any = {}): PurchaseRequisition =>
    ({
      requisition_id: 'PR-001',
      requisition_number: 'PR-2024-0001',
      requested_by: 'USER-001',
      department: 'Warehouse',
      approval_status: RequisitionStatus.DRAFT,
      request_date: new Date('2024-01-01'),
      required_by: new Date('2024-01-15'),
      lines: [],
      ...overrides,
    }) as any;

  // Helper to create mock RFQ
  const createMockRFQ = (overrides: any = {}): any => ({
    rfq_id: 'RFQ-001',
    rfq_number: 'RFQ-2024-0001',
    rfq_status: RFQStatus.DRAFT,
    created_date: new Date('2024-01-01'),
    quote_due_date: new Date('2024-01-15'),
    lines: [],
    ...overrides,
  });

  // Helper to create mock purchase order
  const createMockPurchaseOrder = (overrides: any = {}): any => ({
    po_id: 'PO-001',
    po_number: 'PO-2024-0001',
    vendor_id: 'VEND-001',
    po_status: PurchaseOrderStatus.DRAFT,
    order_date: new Date('2024-01-01'),
    requested_delivery_date: new Date('2024-01-31'),
    lines: [],
    ...overrides,
  });

  beforeEach(() => {
    jest.clearAllMocks();
    purchasingService = new PurchasingService();
  });

  // ==========================================================================
  // PURCHASE REQUISITIONS
  // ==========================================================================

  describe('queryRequisitions', () => {
    it('should return all requisitions', async () => {
      const mockRequisitions = [
        createMockRequisition({ requisition_id: 'PR-001' }),
        createMockRequisition({ requisition_id: 'PR-002' }),
      ];
      (purchaseRequisitionRepository.queryWithFilters as jest.Mock).mockResolvedValue(
        mockRequisitions
      );

      const result = await purchasingService.queryRequisitions({});

      expect(result).toHaveLength(2);
      expect(purchaseRequisitionRepository.queryWithFilters).toHaveBeenCalledWith({});
    });

    it('should filter requisitions by status', async () => {
      const mockRequisitions = [createMockRequisition()];
      (purchaseRequisitionRepository.queryWithFilters as jest.Mock).mockResolvedValue(
        mockRequisitions
      );

      await purchasingService.queryRequisitions({
        approval_status: RequisitionStatus.SUBMITTED,
      });

      expect(purchaseRequisitionRepository.queryWithFilters).toHaveBeenCalledWith({
        approval_status: RequisitionStatus.SUBMITTED,
      });
    });

    it('should filter requisitions by department', async () => {
      const mockRequisitions = [createMockRequisition()];
      (purchaseRequisitionRepository.queryWithFilters as jest.Mock).mockResolvedValue(
        mockRequisitions
      );

      await purchasingService.queryRequisitions({ department: 'Warehouse' });

      expect(purchaseRequisitionRepository.queryWithFilters).toHaveBeenCalledWith({
        department: 'Warehouse',
      });
    });
  });

  describe('getRequisitionWithDetails', () => {
    it('should return requisition with details', async () => {
      const mockRequisition: any = {
        ...createMockRequisition(),
        requester: {
          user_id: 'USER-001',
          email: 'test@example.com',
          first_name: 'Test',
          last_name: 'User',
        },
        lines: [],
        approvals: [],
        total_estimated_cost: 0,
      };

      (purchaseRequisitionRepository.findByIdWithDetails as jest.Mock).mockResolvedValue(
        mockRequisition
      );

      const result = await purchasingService.getRequisitionWithDetails('PR-001');

      expect(result).toEqual(mockRequisition);
    });

    it('should return null when requisition not found', async () => {
      (purchaseRequisitionRepository.findByIdWithDetails as jest.Mock).mockResolvedValue(null);

      const result = await purchasingService.getRequisitionWithDetails('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('createRequisition', () => {
    it('should create a new purchase requisition', async () => {
      const dto: CreatePurchaseRequisitionDTO = {
        requested_by: 'user-123',
        department: 'Warehouse',
        required_by: new Date('2024-01-15'),
        lines: [
          {
            sku: 'SKU-001',
            item_description: 'Test Item',
            quantity: 100,
            estimated_unit_cost: 10,
          },
        ],
      };

      const mockRequisition = createMockRequisition(dto);
      (transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({});
      });
      (purchaseRequisitionLineRepository.insert as jest.Mock).mockResolvedValue({});
      (purchaseRequisitionRepository.insert as jest.Mock).mockResolvedValue(mockRequisition);

      const result = await purchasingService.createRequisition(dto);

      expect(result.department).toBe('Warehouse');
      expect(result.requested_by).toBe('user-123');
    });
  });

  describe('submitRequisition', () => {
    it('should submit a requisition for approval', async () => {
      const existingRequisition = createMockRequisition({
        approval_status: RequisitionStatus.DRAFT,
      });
      const submittedRequisition = createMockRequisition({
        approval_status: RequisitionStatus.SUBMITTED,
      });

      (purchaseRequisitionRepository.findByIdOrThrow as jest.Mock).mockResolvedValue(
        existingRequisition
      );
      (purchaseRequisitionRepository.update as jest.Mock).mockResolvedValue(submittedRequisition);

      const result = await purchasingService.submitRequisition('PR-001');

      expect(result.approval_status).toBe(RequisitionStatus.SUBMITTED);
    });

    it('should throw error when submitting non-draft requisition', async () => {
      const existingRequisition = createMockRequisition({
        approval_status: RequisitionStatus.APPROVED,
      });

      (purchaseRequisitionRepository.findByIdOrThrow as jest.Mock).mockResolvedValue(
        existingRequisition
      );

      await expect(purchasingService.submitRequisition('PR-001')).rejects.toThrow(
        'Only draft requisitions can be submitted'
      );
    });
  });

  describe('processRequisitionApproval', () => {
    it('should approve a requisition', async () => {
      const existingRequisition = createMockRequisition({
        approval_status: RequisitionStatus.SUBMITTED,
      });
      const approvedRequisition = createMockRequisition({
        approval_status: RequisitionStatus.APPROVED,
      });

      (purchaseRequisitionRepository.findByIdOrThrow as jest.Mock).mockResolvedValue(
        existingRequisition
      );
      (purchaseRequisitionRepository.update as jest.Mock).mockResolvedValue(approvedRequisition);

      const dto: RequisitionApprovalDTO = {
        requisition_id: 'PR-001',
        approval_status: 'APPROVED',
      };

      const result = await purchasingService.processRequisitionApproval(dto);

      expect(result.approval_status).toBe(RequisitionStatus.APPROVED);
    });

    it('should reject a requisition', async () => {
      const existingRequisition = createMockRequisition({
        approval_status: RequisitionStatus.SUBMITTED,
      });
      const rejectedRequisition = createMockRequisition({
        approval_status: RequisitionStatus.REJECTED,
        rejection_reason: 'Not approved',
      });

      (purchaseRequisitionRepository.findByIdOrThrow as jest.Mock).mockResolvedValue(
        existingRequisition
      );
      (purchaseRequisitionRepository.update as jest.Mock).mockResolvedValue(rejectedRequisition);

      const dto: RequisitionApprovalDTO = {
        requisition_id: 'PR-001',
        approval_status: 'REJECTED',
        rejection_reason: 'Not approved',
      };

      const result = await purchasingService.processRequisitionApproval(dto);

      expect(result.approval_status).toBe(RequisitionStatus.REJECTED);
    });
  });

  // ==========================================================================
  // RFQ (REQUEST FOR QUOTE)
  // ==========================================================================

  describe('createRFQ', () => {
    it('should create a new RFQ manually', async () => {
      const dto: CreateRFQDTO = {
        source_type: 'MANUAL',
        vendor_ids: ['VEND-001', 'VEND-002'],
        quote_due_date: new Date('2024-01-15'),
        response_by_date: new Date('2024-01-20'),
        lines: [
          {
            sku: 'SKU-001',
            item_description: 'Test Item',
            quantity: 100,
          },
        ],
      };

      const mockRFQ = createMockRFQ(dto);
      (transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({});
      });
      (rfqLineRepository.insert as jest.Mock).mockResolvedValue({});
      (rfqVendorRepository.insert as jest.Mock).mockResolvedValue({});
      (rfqHeaderRepository.insert as jest.Mock).mockResolvedValue(mockRFQ);

      const result = await purchasingService.createRFQ(dto);

      expect(result).toBeDefined();
    });
  });

  // ==========================================================================
  // PURCHASE ORDERS
  // ==========================================================================

  describe('createPurchaseOrder', () => {
    it('should create a new purchase order', async () => {
      const dto: CreatePurchaseOrderDTO = {
        vendor_id: 'VEND-001',
        requested_delivery_date: new Date('2024-01-31'),
        lines: [
          {
            item_description: 'Test Item',
            quantity_ordered: 100,
            unit_price: 10,
          },
        ],
      };

      const mockOrder = createMockPurchaseOrder(dto);
      (transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({});
      });
      (purchaseOrderLineRepository.insert as jest.Mock).mockResolvedValue({});
      (purchaseOrderHeaderRepository.insert as jest.Mock).mockResolvedValue(mockOrder);

      const result = await purchasingService.createPurchaseOrder(dto);

      expect(result.vendor_id).toBe('VEND-001');
    });
  });

  describe('convertRequisitionToPO', () => {
    it('should convert requisition to purchase order', async () => {
      const mockRequisition: any = {
        ...createMockRequisition({ approval_status: RequisitionStatus.APPROVED }),
        lines: [
          {
            sku: 'SKU-001',
            item_description: 'Test Item',
            quantity: 100,
            estimated_unit_cost: 10,
            suggested_vendor_id: 'VEND-001',
          },
        ],
      };

      const dto: ConvertRequisitionToPODTO = {
        requisition_id: 'PR-001',
        vendor_id: 'VEND-001',
        requested_delivery_date: new Date('2024-01-31'),
      };

      (purchaseRequisitionRepository.findByIdWithDetails as jest.Mock).mockResolvedValue(
        mockRequisition
      );
      (transaction as jest.Mock).mockImplementation(async (callback: any) => {
        return callback({});
      });
      (purchaseOrderLineRepository.insert as jest.Mock).mockResolvedValue({});
      (purchaseOrderHeaderRepository.insert as jest.Mock).mockResolvedValue(
        createMockPurchaseOrder()
      );
      (purchaseRequisitionRepository.update as jest.Mock).mockResolvedValue(
        createMockRequisition()
      );

      const result = await purchasingService.convertRequisitionToPO(dto);

      expect(result).toBeDefined();
    });

    it('should throw error when requisition is not approved', async () => {
      const mockRequisition: any = {
        ...createMockRequisition({ approval_status: RequisitionStatus.DRAFT }),
        lines: [],
      };

      const dto: ConvertRequisitionToPODTO = {
        requisition_id: 'PR-001',
        vendor_id: 'VEND-001',
        requested_delivery_date: new Date('2024-01-31'),
      };

      (purchaseRequisitionRepository.findByIdWithDetails as jest.Mock).mockResolvedValue(
        mockRequisition
      );

      await expect(purchasingService.convertRequisitionToPO(dto)).rejects.toThrow(
        'Only approved requisitions can be converted to PO'
      );
    });
  });
});
