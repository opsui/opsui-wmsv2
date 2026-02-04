/**
 * Integration tests for quality control routes
 * @covers src/routes/qualityControl.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { qualityControlService } from '../../services/QualityControlService';
import { authenticate, authorize } from '../../middleware';
import { UserRole, InspectionType, InspectionStatus } from '@opsui/shared';

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'user-123',
      email: 'qc@example.com',
      role: UserRole.SUPERVISOR,
      baseRole: UserRole.SUPERVISOR,
      activeRole: null,
      effectiveRole: UserRole.SUPERVISOR,
    };
    next();
  }),
  authorize: jest.fn((...allowedRoles: string[]) => (req: any, res: any, next: any) => {
    const user = req.user || { role: UserRole.SUPERVISOR };
    if (allowedRoles.includes(user.role)) {
      next();
    } else {
      res.status(403).json({ error: 'Forbidden' });
    }
  }),
}));

// Mock the QualityControlService
jest.mock('../../services/QualityControlService', () => {
  const mockModule = jest.requireActual('../../services/QualityControlService');
  return {
    ...mockModule,
    qualityControlService: {
      createInspectionChecklist: jest.fn(),
      getAllInspectionChecklists: jest.fn(),
      getInspectionChecklist: jest.fn(),
      createInspection: jest.fn(),
      getAllQualityInspections: jest.fn(),
      getQualityInspection: jest.fn(),
      startInspection: jest.fn(),
      updateInspectionStatus: jest.fn(),
      getInspectionResults: jest.fn(),
      saveInspectionResult: jest.fn(),
      createReturnAuthorization: jest.fn(),
      getAllReturnAuthorizations: jest.fn(),
      getReturnAuthorization: jest.fn(),
      updateReturnAuthorizationStatus: jest.fn(),
    },
  };
});

jest.mock('../../config/logger');
jest.mock('../../db/client');

describe('Quality Control Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
  });

  // ==========================================================================
  // POST /api/v1/quality-control/checklists
  // ==========================================================================

  describe('POST /api/v1/quality-control/checklists', () => {
    it('should create an inspection checklist', async () => {
      const checklistData = {
        checklistName: 'Incoming Inspection Checklist',
        description: 'For inspecting incoming goods',
        inspectionType: InspectionType.INCOMING,
        sku: 'SKU-001',
        items: [
          {
            itemDescription: 'Check packaging',
            itemType: 'CHECKBOX',
            isRequired: true,
            displayOrder: 1,
          },
          {
            itemDescription: 'Verify quantity',
            itemType: 'NUMBER',
            isRequired: true,
            displayOrder: 2,
          },
        ],
      };

      const mockChecklist = {
        checklistId: 'CHK-1234567890',
        checklistName: 'Incoming Inspection Checklist',
        description: 'For inspecting incoming goods',
        inspectionType: InspectionType.INCOMING,
        sku: 'SKU-001',
        isActive: true,
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [
          {
            itemId: 'CHKI-1234567890',
            itemDescription: 'Check packaging',
            itemType: 'CHECKBOX',
            isRequired: true,
            displayOrder: 1,
          },
        ],
      };

      (
        qualityControlService.createInspectionChecklist as jest.MockedFunction<any>
      ).mockResolvedValue(mockChecklist);

      const response = await request(app)
        .post('/api/v1/quality-control/checklists')
        .set('Authorization', 'Bearer valid-token')
        .send(checklistData)
        .expect(201);

      expect(response.body).toMatchObject({
        checklistId: 'CHK-1234567890',
        checklistName: 'Incoming Inspection Checklist',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        checklistName: 'Test Checklist',
        // missing inspectionType and items
      };

      const response = await request(app)
        .post('/api/v1/quality-control/checklists')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required fields');
      expect(response.body).toHaveProperty('code', 'MISSING_FIELDS');
    });
  });

  // ==========================================================================
  // GET /api/v1/quality-control/checklists
  // ==========================================================================

  describe('GET /api/v1/quality-control/checklists', () => {
    it('should get all inspection checklists', async () => {
      const mockChecklists = [
        {
          checklistId: 'CHK-001',
          checklistName: 'Incoming Inspection',
          inspectionType: InspectionType.INCOMING,
          items: [],
        },
        {
          checklistId: 'CHK-002',
          checklistName: 'Outgoing Inspection',
          inspectionType: InspectionType.OUTGOING,
          items: [],
        },
      ];

      (
        qualityControlService.getAllInspectionChecklists as jest.MockedFunction<any>
      ).mockResolvedValue(mockChecklists);

      const response = await request(app)
        .get('/api/v1/quality-control/checklists')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockChecklists);
    });

    it('should filter by inspection type', async () => {
      (
        qualityControlService.getAllInspectionChecklists as jest.MockedFunction<any>
      ).mockResolvedValue([]);

      await request(app)
        .get('/api/v1/quality-control/checklists?type=INCOMING')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(qualityControlService.getAllInspectionChecklists).toHaveBeenCalledWith(
        expect.objectContaining({ inspectionType: InspectionType.INCOMING })
      );
    });

    it('should filter by SKU', async () => {
      (
        qualityControlService.getAllInspectionChecklists as jest.MockedFunction<any>
      ).mockResolvedValue([]);

      await request(app)
        .get('/api/v1/quality-control/checklists?sku=SKU-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(qualityControlService.getAllInspectionChecklists).toHaveBeenCalledWith(
        expect.objectContaining({ sku: 'SKU-001' })
      );
    });

    it('should filter active only', async () => {
      (
        qualityControlService.getAllInspectionChecklists as jest.MockedFunction<any>
      ).mockResolvedValue([]);

      await request(app)
        .get('/api/v1/quality-control/checklists?active=true')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(qualityControlService.getAllInspectionChecklists).toHaveBeenCalledWith(
        expect.objectContaining({ activeOnly: true })
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/quality-control/checklists/:checklistId
  // ==========================================================================

  describe('GET /api/v1/quality-control/checklists/:checklistId', () => {
    it('should get a specific checklist', async () => {
      const mockChecklist = {
        checklistId: 'CHK-1234567890',
        checklistName: 'Incoming Inspection',
        inspectionType: InspectionType.INCOMING,
        items: [
          {
            itemId: 'CHKI-001',
            itemDescription: 'Check packaging',
            itemType: 'CHECKBOX',
            isRequired: true,
            displayOrder: 1,
          },
        ],
      };

      (qualityControlService.getInspectionChecklist as jest.MockedFunction<any>).mockResolvedValue(
        mockChecklist
      );

      const response = await request(app)
        .get('/api/v1/quality-control/checklists/CHK-1234567890')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockChecklist);
    });
  });

  // ==========================================================================
  // POST /api/v1/quality-control/inspections
  // ==========================================================================

  describe('POST /api/v1/quality-control/inspections', () => {
    it('should create a quality inspection', async () => {
      const inspectionData = {
        inspectionType: InspectionType.INCOMING,
        referenceType: 'INBOUND',
        referenceId: 'IB-001',
        sku: 'SKU-001',
        quantityInspected: 100,
        location: 'A-01-01',
        checklistId: 'CHK-001',
      };

      const mockInspection = {
        inspectionId: 'QI-1234567890',
        inspectionType: InspectionType.INCOMING,
        status: InspectionStatus.PENDING,
        referenceType: 'INBOUND',
        referenceId: 'IB-001',
        sku: 'SKU-001',
        quantityInspected: 100,
        inspectorId: 'user-123',
        location: 'A-01-01',
        checklistId: 'CHK-001',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (qualityControlService.createInspection as jest.MockedFunction<any>).mockResolvedValue(
        mockInspection
      );

      const response = await request(app)
        .post('/api/v1/quality-control/inspections')
        .set('Authorization', 'Bearer valid-token')
        .send(inspectionData)
        .expect(201);

      expect(response.body).toMatchObject({
        inspectionId: 'QI-1234567890',
        checklistId: 'CHK-001',
        createdAt: expect.any(String),
        updatedAt: expect.any(String),
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        inspectionType: InspectionType.INCOMING,
        // missing referenceType, referenceId, sku, quantityInspected
      };

      const response = await request(app)
        .post('/api/v1/quality-control/inspections')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required fields');
      expect(response.body).toHaveProperty('code', 'MISSING_FIELDS');
    });
  });

  // ==========================================================================
  // GET /api/v1/quality-control/inspections
  // ==========================================================================

  describe('GET /api/v1/quality-control/inspections', () => {
    it('should get all quality inspections', async () => {
      const mockResult = {
        inspections: [
          {
            inspectionId: 'QI-001',
            inspectionType: InspectionType.INCOMING,
            status: InspectionStatus.PENDING,
            sku: 'SKU-001',
          },
          {
            inspectionId: 'QI-002',
            inspectionType: InspectionType.OUTGOING,
            status: InspectionStatus.PASSED,
            sku: 'SKU-002',
          },
        ],
        total: 2,
      };

      (
        qualityControlService.getAllQualityInspections as jest.MockedFunction<any>
      ).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/quality-control/inspections')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
    });

    it('should filter by status', async () => {
      (
        qualityControlService.getAllQualityInspections as jest.MockedFunction<any>
      ).mockResolvedValue({
        inspections: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/quality-control/inspections?status=PENDING')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(qualityControlService.getAllQualityInspections).toHaveBeenCalledWith(
        expect.objectContaining({ status: InspectionStatus.PENDING })
      );
    });

    it('should filter by inspection type', async () => {
      (
        qualityControlService.getAllQualityInspections as jest.MockedFunction<any>
      ).mockResolvedValue({
        inspections: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/quality-control/inspections?type=INCOMING')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(qualityControlService.getAllQualityInspections).toHaveBeenCalledWith(
        expect.objectContaining({ inspectionType: InspectionType.INCOMING })
      );
    });

    it('should support pagination', async () => {
      (
        qualityControlService.getAllQualityInspections as jest.MockedFunction<any>
      ).mockResolvedValue({
        inspections: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/quality-control/inspections?limit=25&offset=50')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(qualityControlService.getAllQualityInspections).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 25, offset: 50 })
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/quality-control/inspections/:inspectionId
  // ==========================================================================

  describe('GET /api/v1/quality-control/inspections/:inspectionId', () => {
    it('should get a specific inspection', async () => {
      const mockInspection = {
        inspectionId: 'QI-1234567890',
        inspectionType: InspectionType.INCOMING,
        status: InspectionStatus.IN_PROGRESS,
        referenceType: 'INBOUND',
        referenceId: 'IB-001',
        sku: 'SKU-001',
        quantityInspected: 100,
        inspectorId: 'user-123',
        inspectorName: 'QC Inspector',
      };

      (qualityControlService.getQualityInspection as jest.MockedFunction<any>).mockResolvedValue(
        mockInspection
      );

      const response = await request(app)
        .get('/api/v1/quality-control/inspections/QI-1234567890')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockInspection);
    });
  });

  // ==========================================================================
  // POST /api/v1/quality-control/inspections/:inspectionId/start
  // ==========================================================================

  describe('POST /api/v1/quality-control/inspections/:inspectionId/start', () => {
    it('should start an inspection', async () => {
      const mockInspection = {
        inspectionId: 'QI-1234567890',
        inspectionType: InspectionType.INCOMING,
        status: InspectionStatus.IN_PROGRESS,
        sku: 'SKU-001',
        startedAt: new Date(),
      };

      (qualityControlService.startInspection as jest.MockedFunction<any>).mockResolvedValue(
        mockInspection
      );

      const response = await request(app)
        .post('/api/v1/quality-control/inspections/QI-1234567890/start')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        inspectionId: 'QI-1234567890',
        startedAt: expect.any(String),
      });
    });
  });

  // ==========================================================================
  // PATCH /api/v1/quality-control/inspections/:inspectionId/status
  // ==========================================================================

  describe('PATCH /api/v1/quality-control/inspections/:inspectionId/status', () => {
    it('should update inspection status to PASSED', async () => {
      const updateData = {
        status: InspectionStatus.PASSED,
        quantityPassed: 95,
        quantityFailed: 5,
        notes: 'Minor issues found',
      };

      const mockInspection = {
        inspectionId: 'QI-1234567890',
        status: InspectionStatus.PASSED,
        quantityPassed: 95,
        quantityFailed: 5,
        approvedBy: 'user-123',
        approvedAt: new Date(),
        completedAt: new Date(),
      };

      (qualityControlService.updateInspectionStatus as jest.MockedFunction<any>).mockResolvedValue(
        mockInspection
      );

      const response = await request(app)
        .patch('/api/v1/quality-control/inspections/QI-1234567890/status')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        inspectionId: 'QI-1234567890',
        status: InspectionStatus.PASSED,
        quantityPassed: 95,
        quantityFailed: 5,
        approvedAt: expect.any(String),
        completedAt: expect.any(String),
      });
    });

    it('should update inspection status to FAILED', async () => {
      const updateData = {
        status: InspectionStatus.FAILED,
        quantityPassed: 80,
        quantityFailed: 20,
        defectType: 'DAMAGED',
        defectDescription: 'Items damaged during shipping',
        dispositionAction: 'RETURN',
      };

      const mockInspection = {
        inspectionId: 'QI-1234567890',
        status: InspectionStatus.FAILED,
        quantityPassed: 80,
        quantityFailed: 20,
        defectType: 'DAMAGED',
        defectDescription: 'Items damaged during shipping',
        dispositionAction: 'RETURN',
      };

      (qualityControlService.updateInspectionStatus as jest.MockedFunction<any>).mockResolvedValue(
        mockInspection
      );

      const response = await request(app)
        .patch('/api/v1/quality-control/inspections/QI-1234567890/status')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        status: InspectionStatus.FAILED,
        defectType: 'DAMAGED',
        dispositionAction: 'RETURN',
      });
    });

    it('should return 400 for missing status', async () => {
      const response = await request(app)
        .patch('/api/v1/quality-control/inspections/QI-1234567890/status')
        .set('Authorization', 'Bearer valid-token')
        .send({}) // missing status
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Status is required');
      expect(response.body).toHaveProperty('code', 'MISSING_STATUS');
    });
  });

  // ==========================================================================
  // GET /api/v1/quality-control/inspections/:inspectionId/results
  // ==========================================================================

  describe('GET /api/v1/quality-control/inspections/:inspectionId/results', () => {
    it('should get inspection results', async () => {
      const mockResults = [
        {
          resultId: 'IR-001',
          inspectionId: 'QI-1234567890',
          checklistItemId: 'CHKI-001',
          result: 'Pass',
          passed: true,
        },
        {
          resultId: 'IR-002',
          inspectionId: 'QI-1234567890',
          checklistItemId: 'CHKI-002',
          result: 'Fail',
          passed: false,
          notes: 'Packaging damaged',
        },
      ];

      (qualityControlService.getInspectionResults as jest.MockedFunction<any>).mockResolvedValue(
        mockResults
      );

      const response = await request(app)
        .get('/api/v1/quality-control/inspections/QI-1234567890/results')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockResults);
    });
  });

  // ==========================================================================
  // POST /api/v1/quality-control/inspections/results
  // ==========================================================================

  describe('POST /api/v1/quality-control/inspections/results', () => {
    it('should save inspection result', async () => {
      const resultData = {
        inspectionId: 'QI-1234567890',
        checklistItemId: 'CHKI-001',
        result: 'Pass',
        passed: true,
        notes: 'Item in good condition',
      };

      const mockResult = {
        resultId: 'IR-1234567890',
        inspectionId: 'QI-1234567890',
        checklistItemId: 'CHKI-001',
        result: 'Pass',
        passed: true,
        notes: 'Item in good condition',
      };

      (qualityControlService.saveInspectionResult as jest.MockedFunction<any>).mockResolvedValue(
        mockResult
      );

      const response = await request(app)
        .post('/api/v1/quality-control/inspections/results')
        .set('Authorization', 'Bearer valid-token')
        .send(resultData)
        .expect(201);

      expect(response.body).toEqual(mockResult);
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        inspectionId: 'QI-1234567890',
        // missing checklistItemId, result, passed
      };

      const response = await request(app)
        .post('/api/v1/quality-control/inspections/results')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required fields');
      expect(response.body).toHaveProperty('code', 'MISSING_FIELDS');
    });
  });

  // ==========================================================================
  // POST /api/v1/quality-control/returns
  // ==========================================================================

  describe('POST /api/v1/quality-control/returns', () => {
    it('should create a return authorization', async () => {
      const returnData = {
        orderId: 'ORD-001',
        customerId: 'customer-123',
        customerName: 'John Doe',
        returnReason: 'Defective product',
        items: [
          {
            orderItemId: 'OI-001',
            sku: 'SKU-001',
            name: 'Product 1',
            quantity: 1,
            returnReason: 'Damaged',
            condition: 'DAMAGED',
            refundAmount: 50.0,
          },
        ],
        totalRefundAmount: 50.0,
      };

      const mockReturn = {
        returnId: 'RA-1234567890',
        orderId: 'ORD-001',
        customerId: 'customer-123',
        customerName: 'John Doe',
        returnReason: 'Defective product',
        status: 'PENDING',
        authorizedBy: 'user-123',
        totalRefundAmount: 50.0,
        returnDate: new Date(),
        items: [],
      };

      (
        qualityControlService.createReturnAuthorization as jest.MockedFunction<any>
      ).mockResolvedValue(mockReturn);

      const response = await request(app)
        .post('/api/v1/quality-control/returns')
        .set('Authorization', 'Bearer valid-token')
        .send(returnData)
        .expect(201);

      expect(response.body).toMatchObject({
        returnId: 'RA-1234567890',
        orderId: 'ORD-001',
        status: 'PENDING',
        returnDate: expect.any(String),
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        orderId: 'ORD-001',
        // missing customerId, customerName, returnReason, items, totalRefundAmount
      };

      const response = await request(app)
        .post('/api/v1/quality-control/returns')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required fields');
      expect(response.body).toHaveProperty('code', 'MISSING_FIELDS');
    });
  });

  // ==========================================================================
  // GET /api/v1/quality-control/returns
  // ==========================================================================

  describe('GET /api/v1/quality-control/returns', () => {
    it('should get all return authorizations', async () => {
      const mockResult = {
        returns: [
          {
            returnId: 'RA-001',
            orderId: 'ORD-001',
            customerName: 'John Doe',
            status: 'PENDING',
            totalRefundAmount: 50.0,
          },
          {
            returnId: 'RA-002',
            orderId: 'ORD-002',
            customerName: 'Jane Smith',
            status: 'APPROVED',
            totalRefundAmount: 75.0,
          },
        ],
        total: 2,
      };

      (
        qualityControlService.getAllReturnAuthorizations as jest.MockedFunction<any>
      ).mockResolvedValue(mockResult);

      const response = await request(app)
        .get('/api/v1/quality-control/returns')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockResult);
    });

    it('should filter by status', async () => {
      (
        qualityControlService.getAllReturnAuthorizations as jest.MockedFunction<any>
      ).mockResolvedValue({
        returns: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/quality-control/returns?status=PENDING')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(qualityControlService.getAllReturnAuthorizations).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'PENDING' })
      );
    });

    it('should filter by order ID', async () => {
      (
        qualityControlService.getAllReturnAuthorizations as jest.MockedFunction<any>
      ).mockResolvedValue({
        returns: [],
        total: 0,
      });

      await request(app)
        .get('/api/v1/quality-control/returns?orderId=ORD-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(qualityControlService.getAllReturnAuthorizations).toHaveBeenCalledWith(
        expect.objectContaining({ orderId: 'ORD-001' })
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/quality-control/returns/:returnId
  // ==========================================================================

  describe('GET /api/v1/quality-control/returns/:returnId', () => {
    it('should get a specific return authorization', async () => {
      const mockReturn = {
        returnId: 'RA-1234567890',
        orderId: 'ORD-001',
        customerId: 'customer-123',
        customerName: 'John Doe',
        returnReason: 'Defective product',
        status: 'PENDING',
        authorizedBy: 'user-123',
        totalRefundAmount: 50.0,
        items: [
          {
            returnItemId: 'RI-001',
            sku: 'SKU-001',
            name: 'Product 1',
            quantity: 1,
            refundAmount: 50.0,
          },
        ],
      };

      (qualityControlService.getReturnAuthorization as jest.MockedFunction<any>).mockResolvedValue(
        mockReturn
      );

      const response = await request(app)
        .get('/api/v1/quality-control/returns/RA-1234567890')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(mockReturn);
    });
  });

  // ==========================================================================
  // PATCH /api/v1/quality-control/returns/:returnId/status
  // ==========================================================================

  describe('PATCH /api/v1/quality-control/returns/:returnId/status', () => {
    it('should update return authorization status', async () => {
      const updateData = {
        status: 'APPROVED',
      };

      const mockReturn = {
        returnId: 'RA-1234567890',
        status: 'APPROVED',
        updatedAt: new Date(),
      };

      (
        qualityControlService.updateReturnAuthorizationStatus as jest.MockedFunction<any>
      ).mockResolvedValue(mockReturn);

      const response = await request(app)
        .patch('/api/v1/quality-control/returns/RA-1234567890/status')
        .set('Authorization', 'Bearer valid-token')
        .send(updateData)
        .expect(200);

      expect(response.body).toMatchObject({
        returnId: 'RA-1234567890',
        status: 'APPROVED',
      });
    });

    it('should return 400 for missing status', async () => {
      const response = await request(app)
        .patch('/api/v1/quality-control/returns/RA-1234567890/status')
        .set('Authorization', 'Bearer valid-token')
        .send({}) // missing status
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Status is required');
      expect(response.body).toHaveProperty('code', 'MISSING_STATUS');
    });
  });
});
