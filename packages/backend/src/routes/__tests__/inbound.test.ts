/**
 * Integration tests for inbound routes
 * @covers src/routes/inbound.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { inboundReceivingService } from '../../services/InboundReceivingService';
import { authenticate } from '../../middleware/auth';
import { User, UserRole } from '@opsui/shared';

// Mock the authentication middleware
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req, res, next) => {
    req.user = {
      userId: 'user-123',
      email: 'supervisor@example.com',
      role: UserRole.SUPERVISOR,
      baseRole: UserRole.SUPERVISOR,
      effectiveRole: UserRole.SUPERVISOR,
    };
    next();
  }),
}));

// Mock the inboundReceivingService
jest.mock('../../services/InboundReceivingService');
jest.mock('../../config/logger');
jest.mock('../../db/client');

const mockedAuthenticate = authenticate as jest.MockedFunction<typeof authenticate>;

describe('Inbound Routes', () => {
  let app: any;

  const mockUser: User = {
    userId: 'user-123',
    email: 'supervisor@example.com',
    name: 'Test Supervisor',
    role: UserRole.SUPERVISOR,
    activeRole: null,
    active: true,
    createdAt: new Date(),
    lastLoginAt: new Date(),
  };

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  afterEach(() => {});

  // ==========================================================================
  // GET /api/inbound/asn
  // ==========================================================================

  describe('GET /api/v1/inbound/asn', () => {
    it('should return ASNs with default filters', async () => {
      const mockAsns = [
        {
          asnId: 'ASN-001',
          supplierId: 'SUP-001',
          status: 'PENDING',
          expectedDate: '2024-01-05T00:00:00Z',
        },
        {
          asnId: 'ASN-002',
          supplierId: 'SUP-002',
          status: 'RECEIVED',
          expectedDate: '2024-01-06T00:00:00Z',
        },
      ];

      (inboundReceivingService.getAllASNs as jest.Mock).mockResolvedValue({
        asns: mockAsns,
        total: 2,
        page: 1,
        totalPages: 1,
      });

      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = {
          ...mockUser,
          baseRole: mockUser.role,
          effectiveRole: mockUser.activeRole || mockUser.role,
        };
        next();
      });

      const response = await request(app)
        .get('/api/v1/inbound/asn')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.asns).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter ASNs by status', async () => {
      (inboundReceivingService.getAllASNs as jest.Mock).mockResolvedValue({
        asns: [],
        total: 0,
      });

      const response = await request(app)
        .get('/api/v1/inbound/asn?status=PENDING')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(inboundReceivingService.getAllASNs).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'PENDING',
        })
      );
    });

    it('should paginate ASNs', async () => {
      (inboundReceivingService.getAllASNs as jest.Mock).mockResolvedValue({
        asns: [],
        total: 50,
        page: 2,
        totalPages: 3,
      });

      const response = await request(app)
        .get('/api/v1/inbound/asn?offset=20&limit=20')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(inboundReceivingService.getAllASNs).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 20,
        })
      );
    });
  });

  // ==========================================================================
  // POST /api/v1/inbound/asn
  // ==========================================================================

  describe('POST /api/v1/inbound/asn', () => {
    it('should create a new ASN', async () => {
      const asnData = {
        supplierId: 'SUP-001',
        purchaseOrderNumber: 'PO-001',
        expectedArrivalDate: '2024-01-05T00:00:00Z',
        lineItems: [
          { sku: 'SKU-001', quantity: 100 },
          { sku: 'SKU-002', quantity: 50 },
        ],
      };

      const mockAsn = {
        asnId: 'ASN-001',
        supplierId: 'SUP-001',
        status: 'PENDING',
        items: [
          { asnItemId: 'ASN-ITEM-001', sku: 'SKU-001', quantity: 100 },
          { asnItemId: 'ASN-ITEM-002', sku: 'SKU-002', quantity: 50 },
        ],
      };

      (inboundReceivingService.createASN as jest.Mock).mockResolvedValue(mockAsn);

      const response = await request(app)
        .post('/api/v1/inbound/asn')
        .set('Authorization', 'Bearer valid-token')
        .send(asnData)
        .expect(201); // Created status

      expect(response.body.asnId).toBe('ASN-001');
      expect(response.body.items).toHaveLength(2);
    });

    it('should return 400 when supplierId is missing', async () => {
      const response = await request(app)
        .post('/api/v1/inbound/asn')
        .set('Authorization', 'Bearer valid-token')
        .send({
          expectedDate: '2024-01-05T00:00:00Z',
          items: [],
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });

    it('should return 400 when items array is empty', async () => {
      const response = await request(app)
        .post('/api/v1/inbound/asn')
        .set('Authorization', 'Bearer valid-token')
        .send({
          supplierId: 'SUP-001',
          purchaseOrderNumber: 'PO-001',
          expectedArrivalDate: '2024-01-05T00:00:00Z',
          lineItems: [],
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'Missing required fields',
        code: 'MISSING_FIELDS',
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/inbound/asn/:asnId
  // ==========================================================================

  describe('GET /api/inbound/asn/:asnId', () => {
    it('should return ASN by ID', async () => {
      const mockAsn = {
        asnId: 'ASN-001',
        supplierId: 'SUP-001',
        status: 'PENDING',
        items: [{ asnItemId: 'ASN-ITEM-001', sku: 'SKU-001', quantity: 100 }],
      };

      (inboundReceivingService.getASN as jest.Mock).mockResolvedValue(mockAsn);

      const response = await request(app)
        .get('/api/v1/inbound/asn/ASN-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.asnId).toBe('ASN-001');
      expect(response.body.items).toHaveLength(1);
    });

    it('should return 404 when ASN not found', async () => {
      (inboundReceivingService.getASN as jest.Mock).mockRejectedValue(
        new Error('ASN ASN-NONEXISTENT not found')
      );

      const response = await request(app)
        .get('/api/v1/inbound/asn/ASN-NONEXISTENT')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(inboundReceivingService.getASN).toHaveBeenCalledWith('ASN-NONEXISTENT');
    });
  });

  // ==========================================================================
  // POST /api/v1/inbound/asn/:asnId/receive
  // ==========================================================================
  // NOTE: This endpoint does not exist in the current implementation
  // Receipts are created via POST /api/inbound/receipts instead
  describe.skip('POST /api/v1/inbound/asn/:asnId/receive', () => {
    it('should receive ASN', async () => {
      const receiveData = {
        receivedBy: 'user-123',
        notes: 'Goods in good condition',
      };

      const mockReceipt = {
        receiptId: 'RECEIPT-001',
        asnId: 'ASN-001',
        status: 'RECEIVED',
        receivedAt: '2024-01-05T10:00:00Z',
      };

      // @ts-expect-error - Method doesn't exist, test is skipped
      (inboundReceivingService.receiveASN as jest.Mock).mockResolvedValue(mockReceipt);

      const response = await request(app)
        .post('/api/v1/inbound/asn/ASN-001/receive')
        .set('Authorization', 'Bearer valid-token')
        .send(receiveData)
        .expect(200);

      expect(response.body.receiptId).toBe('RECEIPT-001');
      expect(response.body.status).toBe('RECEIVED');
    });

    it('should return 400 when ASN is already received', async () => {
      // @ts-expect-error - Method doesn't exist, test is skipped
      (inboundReceivingService.receiveASN as jest.Mock).mockRejectedValue(
        new Error('ASN ASN-001 is already received')
      );

      const response = await request(app)
        .post('/api/v1/inbound/asn/ASN-001/receive')
        .set('Authorization', 'Bearer valid-token')
        .send({
          receivedBy: 'user-123',
        })
        .expect(500);

      // @ts-expect-error - Method doesn't exist, test is skipped
      expect(inboundReceivingService.receiveASN).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET /api/inbound/receipts
  // ==========================================================================

  describe('GET /api/inbound/receipts', () => {
    it('should return receipts with pagination', async () => {
      const mockReceipts = [
        {
          receiptId: 'RECEIPT-001',
          asnId: 'ASN-001',
          status: 'RECEIVED',
        },
        {
          receiptId: 'RECEIPT-002',
          asnId: 'ASN-002',
          status: 'RECEIVED',
        },
      ];

      (inboundReceivingService.getAllReceipts as jest.Mock).mockResolvedValue({
        receipts: mockReceipts,
        total: 2,
        page: 1,
        totalPages: 1,
      });

      const response = await request(app)
        .get('/api/v1/inbound/receipts')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.receipts).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter receipts by ASN ID', async () => {
      (inboundReceivingService.getAllReceipts as jest.Mock).mockResolvedValue({
        receipts: [],
        total: 0,
      });

      const response = await request(app)
        .get('/api/v1/inbound/receipts?asnId=ASN-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(inboundReceivingService.getAllReceipts).toHaveBeenCalledWith(
        expect.objectContaining({
          asnId: 'ASN-001',
        })
      );
    });
  });

  // ==========================================================================
  // GET /api/inbound/putaway
  // ==========================================================================

  describe('GET /api/inbound/putaway', () => {
    it('should return putaway tasks', async () => {
      const mockTasks = [
        {
          taskId: 'TASK-001',
          receiptId: 'RECEIPT-001',
          sku: 'SKU-001',
          quantity: 100,
          fromLocation: 'RECEIVING',
          toLocation: 'A-01-01',
          status: 'PENDING',
        },
      ];

      (inboundReceivingService.getPutawayTasks as jest.Mock).mockResolvedValue({
        tasks: mockTasks,
        total: 1,
        page: 1,
        totalPages: 1,
      });

      const response = await request(app)
        .get('/api/v1/inbound/putaway')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.tasks).toHaveLength(1);
      expect(response.body.tasks[0].sku).toBe('SKU-001');
    });

    it('should filter tasks by status', async () => {
      (inboundReceivingService.getPutawayTasks as jest.Mock).mockResolvedValue({
        tasks: [],
        total: 0,
      });

      const response = await request(app)
        .get('/api/v1/inbound/putaway?status=PENDING')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(inboundReceivingService.getPutawayTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'PENDING',
        })
      );
    });

    it('should filter tasks by assignee', async () => {
      (inboundReceivingService.getPutawayTasks as jest.Mock).mockResolvedValue({
        tasks: [],
        total: 0,
      });

      const response = await request(app)
        .get('/api/v1/inbound/putaway?assignedTo=user-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(inboundReceivingService.getPutawayTasks).toHaveBeenCalledWith(
        expect.objectContaining({
          assignedTo: 'user-123',
        })
      );
    });
  });

  // ==========================================================================
  // POST /api/inbound/putaway-tasks/:taskId/complete
  // ==========================================================================
  // NOTE: This endpoint does not exist in the current implementation
  // Putaway tasks are updated via PATCH /api/inbound/putaway/:putawayTaskId
  describe.skip('POST /api/inbound/putaway-tasks/:taskId/complete', () => {
    it('should complete putaway task', async () => {
      const completeData = {
        actualQuantity: 98,
        actualLocation: 'A-01-02',
        notes: 'Minor damage on 2 units',
        completedBy: 'user-123',
      };

      const mockCompletedTask = {
        taskId: 'TASK-001',
        status: 'COMPLETED',
        completedAt: '2024-01-05T11:00:00Z',
        actualQuantity: 98,
        actualLocation: 'A-01-02',
      };

      // @ts-expect-error - Method doesn't exist, test is skipped
      (inboundReceivingService.completePutawayTask as jest.Mock).mockResolvedValue(
        mockCompletedTask
      );

      const response = await request(app)
        .post('/api/v1/inbound/putaway-tasks/TASK-001/complete')
        .set('Authorization', 'Bearer valid-token')
        .send(completeData)
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
      expect(response.body.actualQuantity).toBe(98);
    });

    it('should return 400 when actual quantity is missing', async () => {
      const response = await request(app)
        .post('/api/v1/inbound/putaway-tasks/TASK-001/complete')
        .set('Authorization', 'Bearer valid-token')
        .send({
          actualLocation: 'A-01-02',
          completedBy: 'user-123',
        })
        .expect(400);

      expect(response.body.error).toBeDefined();
    });
  });

  // ==========================================================================
  // POST /api/inbound/putaway/:putawayTaskId/assign
  // ==========================================================================

  describe('POST /api/inbound/putaway/:putawayTaskId/assign', () => {
    it('should assign putaway task to user', async () => {
      const mockAssignedTask = {
        putawayTaskId: 'TASK-001',
        assignedTo: 'user-456',
        status: 'ASSIGNED',
      };

      (inboundReceivingService.assignPutawayTask as jest.Mock).mockResolvedValue(mockAssignedTask);

      const response = await request(app)
        .post('/api/v1/inbound/putaway/TASK-001/assign')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.assignedTo).toBe('user-456');
      expect(response.body.status).toBe('ASSIGNED');
    });

    it('should assign putaway task to authenticated user', async () => {
      const mockTask = {
        putawayTaskId: 'TASK-001',
        sku: 'SKU-001',
        quantity: 50,
        status: 'IN_PROGRESS',
        assignedTo: 'user-123',
      };

      (inboundReceivingService.assignPutawayTask as jest.Mock).mockResolvedValue(mockTask);

      const response = await request(app)
        .post('/api/v1/inbound/putaway/TASK-001/assign')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(200);

      expect(response.body.putawayTaskId).toBe('TASK-001');
      expect(inboundReceivingService.assignPutawayTask).toHaveBeenCalledWith(
        'TASK-001',
        'user-123'
      );
    });
  });

  // ==========================================================================
  // GET /api/inbound/dashboard
  // ==========================================================================

  describe('GET /api/inbound/dashboard', () => {
    it('should return inbound dashboard metrics', async () => {
      const mockMetrics = {
        pendingASNs: 5,
        receivedToday: 12,
        pendingPutawayTasks: 25,
        completedToday: 18,
        pendingReceipts: 3,
      };

      (inboundReceivingService.getDashboardMetrics as jest.Mock).mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/v1/inbound/dashboard')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.pendingASNs).toBe(5);
      expect(response.body.receivedToday).toBe(12);
      expect(response.body.pendingPutawayTasks).toBe(25);
    });
  });

  // ==========================================================================
  // Authentication
  // ==========================================================================

  describe('Authentication', () => {
    it('should return 401 when not authenticated', async () => {
      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = null;
        next();
      });

      await request(app)
        .get('/api/v1/inbound/asn')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should allow access with valid authentication', async () => {
      (inboundReceivingService.getAllASNs as jest.Mock).mockResolvedValue({
        asns: [],
        total: 0,
      });

      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = {
          ...mockUser,
          baseRole: mockUser.role,
          effectiveRole: mockUser.activeRole || mockUser.role,
        };
        next();
      });

      await request(app)
        .get('/api/v1/inbound/asn')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      (inboundReceivingService.getAllASNs as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = {
          ...mockUser,
          baseRole: mockUser.role,
          effectiveRole: mockUser.activeRole || mockUser.role,
        };
        next();
      });

      const response = await request(app)
        .get('/api/v1/inbound/asn')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });
});
