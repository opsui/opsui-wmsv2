/**
 * Quality Control Service Tests
 *
 * Tests for quality inspections, checklists, and return authorizations
 */

import { QualityControlService, qualityControlService } from '../QualityControlService';
import { logger } from '../../config/logger';
import { notifyUser } from '../NotificationHelper';
import { InspectionStatus, InspectionType, DispositionAction, DefectType } from '@opsui/shared';

// Mock dependencies
jest.mock('../../config/logger');
jest.mock('../NotificationHelper');

describe('QualityControlService', () => {
  let service: QualityControlService;

  beforeEach(() => {
    service = new QualityControlService();

    // Reset global mockPool.query
    global.mockPool.query = jest.fn();
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // INSPECTION CHECKLIST METHODS
  // ==========================================================================

  describe('createInspectionChecklist', () => {
    it('should create inspection checklist with items', async () => {
      const data = {
        checklistName: 'Incoming Goods Inspection',
        description: 'Standard receiving inspection',
        inspectionType: InspectionType.INCOMING,
        sku: 'SKU-001',
        category: 'Electronics',
        items: [
          {
            itemDescription: 'Check packaging integrity',
            itemType: 'PASS_FAIL' as const,
            isRequired: true,
            displayOrder: 1,
          },
          {
            itemDescription: 'Verify quantity',
            itemType: 'NUMBER' as const,
            isRequired: true,
            displayOrder: 2,
          },
          {
            itemDescription: 'Take photos',
            itemType: 'PHOTO' as const,
            isRequired: false,
            displayOrder: 3,
          },
        ],
        createdBy: 'admin-123',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ checklist_id: 'CHK-001', checklist_name: data.checklistName }],
        })
        .mockResolvedValueOnce({ rows: [] }) // first item
        .mockResolvedValueOnce({ rows: [] }) // second item
        .mockResolvedValueOnce({ rows: [] }) // third item
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Mock getInspectionChecklist
      global.mockPool.query
        .mockResolvedValueOnce({
          rows: [{ checklist_id: 'CHK-001', checklist_name: data.checklistName }],
        })
        .mockResolvedValueOnce({
          rows: [
            { item_id: 'CHKI-001', item_description: 'Check packaging integrity' },
            { item_id: 'CHKI-002', item_description: 'Verify quantity' },
            { item_id: 'CHKI-003', item_description: 'Take photos' },
          ],
        });

      const result = await service.createInspectionChecklist(data);

      expect(result.checklistName).toBe(data.checklistName);
      expect(result.items).toHaveLength(3);
    });

    it('should handle checklist with no items', async () => {
      const data = {
        checklistName: 'Empty Checklist',
        inspectionType: InspectionType.INVENTORY,
        items: [],
        createdBy: 'admin-123',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ checklist_id: 'CHK-001', checklist_name: data.checklistName }],
        })
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Mock getInspectionChecklist
      global.mockPool.query
        .mockResolvedValueOnce({
          rows: [{ checklist_id: 'CHK-001', checklist_name: data.checklistName }],
        })
        .mockResolvedValueOnce({ rows: [] });

      const result = await service.createInspectionChecklist(data);

      expect(result.items).toHaveLength(0);
    });
  });

  describe('getInspectionChecklist', () => {
    it('should return checklist with items', async () => {
      const mockChecklist = {
        checklist_id: 'CHK-001',
        checklist_name: 'Receiving Inspection',
        description: 'Standard checklist',
        inspection_type: InspectionType.INCOMING,
        sku: 'SKU-001',
        category: 'Electronics',
        is_active: true,
        created_by: 'admin-123',
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const mockItems = [
        {
          item_id: 'CHKI-001',
          item_description: 'Check packaging',
          item_type: 'PASS_FAIL',
          is_required: true,
          display_order: '1',
          options: null,
        },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [mockChecklist] })
        .mockResolvedValueOnce({ rows: mockItems });

      const result = await service.getInspectionChecklist('CHK-001');

      expect(result.checklistId).toBe('CHK-001');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].itemDescription).toBe('Check packaging');
    });

    it('should throw error when checklist not found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.getInspectionChecklist('NONEXISTENT')).rejects.toThrow(
        'Inspection checklist NONEXISTENT not found'
      );
    });
  });

  describe('getAllInspectionChecklists', () => {
    it('should filter checklists by inspection type', async () => {
      const mockChecklists = [
        {
          checklist_id: 'CHK-001',
          checklist_name: 'Receiving Inspection',
          inspection_type: InspectionType.INCOMING,
          sku: null,
          category: null,
          is_active: true,
          created_by: 'admin-123',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockChecklists })
        .mockResolvedValueOnce({ rows: [] }); // items

      const result = await service.getAllInspectionChecklists({
        inspectionType: InspectionType.INCOMING,
      });

      expect(result).toHaveLength(1);
    });

    it('should return all active checklists', async () => {
      const mockChecklists = [
        {
          checklist_id: 'CHK-001',
          checklist_name: 'Inspection 1',
          inspection_type: InspectionType.INCOMING,
          is_active: true,
          created_by: 'admin-123',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
        {
          checklist_id: 'CHK-002',
          checklist_name: 'Inspection 2',
          inspection_type: InspectionType.INVENTORY,
          is_active: true,
          created_by: 'admin-456',
          created_at: '2024-01-01',
          updated_at: '2024-01-01',
        },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: mockChecklists })
        .mockResolvedValueOnce({ rows: [] }) // items for CHK-001
        .mockResolvedValueOnce({ rows: [] }); // items for CHK-002

      const result = await service.getAllInspectionChecklists({
        activeOnly: true,
      });

      expect(result).toHaveLength(2);
    });
  });

  // ==========================================================================
  // QUALITY INSPECTION METHODS
  // ==========================================================================

  describe('createInspection', () => {
    it('should create a new quality inspection', async () => {
      const dto = {
        inspectionType: InspectionType.INCOMING,
        referenceType: 'RECEIPT' as const,
        referenceId: 'ASN-001',
        sku: 'SKU-001',
        quantityInspected: 100,
        inspectorId: 'user-123',
        location: 'A-01-01',
        lotNumber: 'LOT-001',
        expirationDate: new Date('2024-12-31'),
        checklistId: 'CHK-001',
        notes: 'All good',
      };

      const mockUser = { name: 'John Doe' };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [mockUser] }) // get user
        .mockResolvedValueOnce({
          rows: [{ inspection_id: 'QI-001', inspection_type: dto.inspectionType }],
        })
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Mock getQualityInspection
      global.mockPool.query.mockResolvedValueOnce({
        rows: [{ inspection_id: 'QI-001', inspection_type: dto.inspectionType, status: 'PENDING' }],
      });

      const result = await service.createInspection(dto);

      expect(result.inspectionType).toBe(InspectionType.INCOMING);
    });
  });

  describe('getQualityInspection', () => {
    it('should return inspection details', async () => {
      const mockInspection = {
        inspection_id: 'QI-001',
        inspection_type: InspectionType.INCOMING,
        status: InspectionStatus.PENDING,
        reference_type: 'INBOUND_RECEIPT',
        reference_id: 'ASN-001',
        sku: 'SKU-001',
        quantity_inspected: '100',
        quantity_passed: '0',
        quantity_failed: '0',
        defect_type: null,
        defect_description: null,
        disposition_action: null,
        disposition_notes: null,
        inspector_id: 'user-123',
        inspector_name: 'John Doe',
        started_at: null,
        completed_at: null,
        location: 'A-01-01',
        lot_number: 'LOT-001',
        expiration_date: '2024-12-31',
        images: null,
        attachments: null,
        approved_by: null,
        approved_at: null,
        notes: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockInspection] });

      const result = await service.getQualityInspection('QI-001');

      expect(result.inspectionId).toBe('QI-001');
      expect(result.inspectorName).toBe('John Doe');
    });

    it('should throw error when inspection not found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.getQualityInspection('NONEXISTENT')).rejects.toThrow(
        'Quality inspection NONEXISTENT not found'
      );
    });
  });

  describe('getAllQualityInspections', () => {
    it('should return paginated inspections with filters', async () => {
      const mockInspections = [
        {
          inspection_id: 'QI-001',
          inspection_type: InspectionType.INCOMING,
          status: InspectionStatus.PENDING,
          created_at: '2024-01-01',
        },
        {
          inspection_id: 'QI-002',
          inspection_type: InspectionType.INVENTORY,
          status: InspectionStatus.IN_PROGRESS,
          created_at: '2024-01-02',
        },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '2' }] }) // total
        .mockResolvedValueOnce({ rows: mockInspections }); // data

      const result = await service.getAllQualityInspections({
        status: InspectionStatus.PENDING,
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(2);
      expect(result.inspections).toHaveLength(2);
    });

    it('should filter by inspector', async () => {
      global.mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ inspection_id: 'QI-001' }] });

      const result = await service.getAllQualityInspections({
        inspectorId: 'user-123',
      });

      expect(result.total).toBe(1);
    });
  });

  describe('updateInspectionStatus', () => {
    it('should update inspection to PASSED status', async () => {
      const dto = {
        inspectionId: 'QI-001',
        status: InspectionStatus.PASSED,
        quantityPassed: 95,
        quantityFailed: 5,
        defectType: DefectType.DAMAGED,
        defectDescription: 'Small scratches',
        dispositionAction: DispositionAction.REWORK,
        dispositionNotes: 'Repaired and accepted',
        approvedBy: 'admin-456',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ inspection_id: 'QI-001', status: InspectionStatus.PASSED }],
        })
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Mock getQualityInspection
      global.mockPool.query.mockResolvedValueOnce({
        rows: [{ inspection_id: 'QI-001', status: InspectionStatus.PASSED, sku: 'SKU-001' }],
      });

      const result = await service.updateInspectionStatus(dto);

      expect(result.status).toBe(InspectionStatus.PASSED);
      expect(notifyUser).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'QUALITY_APPROVED',
        })
      );
    });

    it('should update inspection to FAILED status', async () => {
      const dto = {
        inspectionId: 'QI-001',
        status: InspectionStatus.FAILED,
        quantityFailed: 100,
        approvedBy: 'admin-456',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ inspection_id: 'QI-001', status: InspectionStatus.FAILED }],
        })
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Mock getQualityInspection
      global.mockPool.query.mockResolvedValueOnce({
        rows: [{ inspection_id: 'QI-001', status: InspectionStatus.FAILED, sku: 'SKU-001' }],
      });

      const result = await service.updateInspectionStatus(dto);

      expect(result.status).toBe(InspectionStatus.FAILED);
      expect(notifyUser).toHaveBeenCalledWith(
        expect.objectContaining({
          type: 'quality_failed',
          priority: 'high',
        })
      );
    });
  });

  describe('startInspection', () => {
    it('should start an inspection', async () => {
      const mockInspection = {
        inspection_id: 'QI-001',
        status: InspectionStatus.PENDING,
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockInspection] });

      // Mock getQualityInspection
      global.mockPool.query.mockResolvedValueOnce({
        rows: [{ inspection_id: 'QI-001', status: InspectionStatus.IN_PROGRESS }],
      });

      const result = await service.startInspection('QI-001');

      expect(result.status).toBe(InspectionStatus.IN_PROGRESS);
    });

    it('should throw error when inspection not found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.startInspection('NONEXISTENT')).rejects.toThrow(
        'Quality inspection NONEXISTENT not found'
      );
    });
  });

  // ==========================================================================
  // INSPECTION RESULT METHODS
  // ==========================================================================

  describe('saveInspectionResult', () => {
    it('should save inspection result', async () => {
      const data = {
        inspectionId: 'QI-001',
        checklistItemId: 'CHKI-001',
        result: 'PASS',
        passed: true,
        notes: 'All good',
        imageUrl: 'https://example.com/image.jpg',
      };

      const mockResult = {
        result_id: 'IR-001',
        inspection_id: 'QI-001',
        checklist_item_id: 'CHKI-001',
        result: 'PASS',
        passed: true,
        notes: 'All good',
        image_url: 'https://example.com/image.jpg',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockResult] });

      const result = await service.saveInspectionResult(data);

      expect(result.resultId).toBe('IR-001');
      expect(result.passed).toBe(true);
    });
  });

  describe('getInspectionResults', () => {
    it('should return all results for an inspection', async () => {
      const mockResults = [
        {
          result_id: 'IR-001',
          inspection_id: 'QI-001',
          checklist_item_id: 'CHKI-001',
          result: 'PASS',
          passed: true,
          notes: null,
          image_url: null,
        },
        {
          result_id: 'IR-002',
          inspection_id: 'QI-001',
          checklist_item_id: 'CHKI-002',
          result: 'FAIL',
          passed: false,
          notes: 'Damaged',
          image_url: null,
        },
      ];

      global.mockPool.query.mockResolvedValueOnce({ rows: mockResults });

      const result = await service.getInspectionResults('QI-001');

      expect(result).toHaveLength(2);
      expect(result[0].passed).toBe(true);
      expect(result[1].passed).toBe(false);
    });

    it('should return empty array when no results', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      const result = await service.getInspectionResults('QI-001');

      expect(result).toEqual([]);
    });
  });

  // ==========================================================================
  // RETURN AUTHORIZATION METHODS
  // ==========================================================================

  describe('createReturnAuthorization', () => {
    it('should create return authorization with items', async () => {
      const dto = {
        orderId: 'ORD-001',
        customerId: 'CUST-001',
        customerName: 'John Doe',
        returnReason: 'Defective product',
        authorizedBy: 'admin-456',
        totalRefundAmount: 99.99,
        restockingFee: 5.0,
        items: [
          {
            orderItemId: 'OI-001',
            sku: 'SKU-001',
            name: 'Product 1',
            quantity: 1,
            returnReason: 'Damaged',
            condition: 'OPENED' as const,
            refundAmount: 49.99,
          },
          {
            orderItemId: 'OI-002',
            sku: 'SKU-002',
            name: 'Product 2',
            quantity: 1,
            returnReason: 'Wrong item',
            condition: 'NEW' as const,
            refundAmount: 50.0,
          },
        ],
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ return_id: 'RA-001', order_id: 'ORD-001' }],
        })
        .mockResolvedValueOnce({ rows: [] }) // item 1
        .mockResolvedValueOnce({ rows: [] }) // item 2
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Mock getReturnAuthorization
      global.mockPool.query
        .mockResolvedValueOnce({
          rows: [{ return_id: 'RA-001', order_id: 'ORD-001', status: 'PENDING' }],
        })
        .mockResolvedValueOnce({
          rows: [
            { return_item_id: 'RI-001', sku: 'SKU-001' },
            { return_item_id: 'RI-002', sku: 'SKU-002' },
          ],
        });

      const result = await service.createReturnAuthorization(dto);

      expect(result.orderId).toBe('ORD-001');
      expect(result.items).toHaveLength(2);
    });
  });

  describe('getReturnAuthorization', () => {
    it('should return return authorization with items', async () => {
      const mockReturn = {
        return_id: 'RA-001',
        order_id: 'ORD-001',
        customer_id: 'CUST-001',
        customer_name: 'John Doe',
        return_reason: 'Defective',
        return_date: '2024-01-01',
        status: 'PENDING',
        authorized_by: 'admin-456',
        received_by: null,
        inspected_by: null,
        total_refund_amount: '99.99',
        restocking_fee: '5.00',
        notes: null,
        created_at: '2024-01-01',
        updated_at: '2024-01-01',
      };

      const mockItems = [
        {
          return_item_id: 'RI-001',
          return_id: 'RA-001',
          order_item_id: 'OI-001',
          sku: 'SKU-001',
          name: 'Product 1',
          quantity: '1',
          return_reason: 'Damaged',
          condition: 'USED',
          disposition: null,
          refund_amount: '49.99',
          inspection_id: null,
        },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [mockReturn] })
        .mockResolvedValueOnce({ rows: mockItems });

      const result = await service.getReturnAuthorization('RA-001');

      expect(result.returnId).toBe('RA-001');
      expect(result.items).toHaveLength(1);
      expect(result.items[0].sku).toBe('SKU-001');
    });

    it('should throw error when return not found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(service.getReturnAuthorization('NONEXISTENT')).rejects.toThrow(
        'Return authorization NONEXISTENT not found'
      );
    });
  });

  describe('getAllReturnAuthorizations', () => {
    it('should return paginated returns with filters', async () => {
      const mockReturns = [
        {
          return_id: 'RA-001',
          order_id: 'ORD-001',
          status: 'PENDING',
          created_at: '2024-01-01',
        },
      ];

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: mockReturns })
        .mockResolvedValueOnce({ rows: [] }); // items

      const result = await service.getAllReturnAuthorizations({
        status: 'PENDING',
        limit: 10,
        offset: 0,
      });

      expect(result.total).toBe(1);
      expect(result.returns).toHaveLength(1);
    });

    it('should filter by order ID', async () => {
      global.mockPool.query
        .mockResolvedValueOnce({ rows: [{ count: '1' }] })
        .mockResolvedValueOnce({ rows: [{ return_id: 'RA-001' }] })
        .mockResolvedValueOnce({ rows: [] }); // items

      const result = await service.getAllReturnAuthorizations({
        orderId: 'ORD-001',
      });

      expect(result.total).toBe(1);
    });
  });

  describe('updateReturnAuthorizationStatus', () => {
    it('should update status to RECEIVED', async () => {
      const mockReturn = {
        return_id: 'RA-001',
        status: 'PENDING',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockReturn] });

      // Mock getReturnAuthorization
      global.mockPool.query
        .mockResolvedValueOnce({ rows: [{ ...mockReturn, status: 'RECEIVED' }] })
        .mockResolvedValueOnce({ rows: [] }); // items

      const result = await service.updateReturnAuthorizationStatus(
        'RA-001',
        'RECEIVED',
        'user-789'
      );

      expect(result.status).toBe('RECEIVED');
    });

    it('should update status to INSPECTED', async () => {
      const mockReturn = {
        return_id: 'RA-001',
        status: 'RECEIVED',
      };

      global.mockPool.query.mockResolvedValueOnce({ rows: [mockReturn] });

      // Mock getReturnAuthorization
      global.mockPool.query
        .mockResolvedValueOnce({ rows: [{ ...mockReturn, status: 'INSPECTED' }] })
        .mockResolvedValueOnce({ rows: [] }); // items

      const result = await service.updateReturnAuthorizationStatus(
        'RA-001',
        'INSPECTED',
        'inspector-123'
      );

      expect(result.status).toBe('INSPECTED');
    });

    it('should throw error when return not found', async () => {
      global.mockPool.query.mockResolvedValueOnce({ rows: [] });

      await expect(
        service.updateReturnAuthorizationStatus('NONEXISTENT', 'RECEIVED')
      ).rejects.toThrow('Return authorization NONEXISTENT not found');
    });
  });

  // ==========================================================================
  // EDGE CASES
  // ==========================================================================

  describe('Edge Cases', () => {
    it('should handle checklist with options (dropdown items)', async () => {
      const data = {
        checklistName: 'Options Checklist',
        inspectionType: InspectionType.INVENTORY,
        items: [
          {
            itemDescription: 'Select defect type',
            itemType: 'TEXT' as const,
            isRequired: true,
            displayOrder: 1,
            options: ['Cosmetic', 'Functional', 'Packaging'],
          },
        ],
        createdBy: 'admin-123',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({
          rows: [{ checklist_id: 'CHK-001', checklist_name: data.checklistName }],
        })
        .mockResolvedValueOnce({ rows: [] }) // item insert
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      // Mock getInspectionChecklist
      global.mockPool.query
        .mockResolvedValueOnce({ rows: [{ checklist_id: 'CHK-001' }] })
        .mockResolvedValueOnce({ rows: [{ options: '["Cosmetic","Functional","Packaging"]' }] });

      const result = await service.createInspectionChecklist(data);

      expect(result.items[0].options).toEqual(['Cosmetic', 'Functional', 'Packaging']);
    });

    it('should handle inspection with missing optional fields', async () => {
      const dto = {
        inspectionType: InspectionType.INVENTORY,
        referenceType: 'INVENTORY' as const,
        referenceId: 'PROD-001',
        sku: 'SKU-001',
        quantityInspected: 50,
        inspectorId: 'user-123',
      };

      global.mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // BEGIN
        .mockResolvedValueOnce({ rows: [{ name: 'Inspector' }] })
        .mockResolvedValueOnce({
          rows: [{ inspection_id: 'QI-001', inspection_type: dto.inspectionType }],
        })
        .mockResolvedValueOnce({ rows: [] }); // COMMIT

      global.mockPool.query.mockResolvedValueOnce({
        rows: [{ inspection_id: 'QI-001', status: 'PENDING' }],
      });

      const result = await service.createInspection(dto);

      expect(result.inspectionId).toBe('QI-001');
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT
  // ==========================================================================

  describe('Singleton Export', () => {
    it('should export singleton instance', () => {
      expect(qualityControlService).toBeInstanceOf(QualityControlService);
    });
  });
});
