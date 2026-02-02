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

  afterEach(() => {
  });

  // ==========================================================================
  // GET /api/inbound/asns
  // ==========================================================================

  describe('GET /api/inbound/asns', () => {
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

      (inboundReceivingService.getASNs as jest.Mock).mockResolvedValue({
        asns: mockAsns,
        total: 2,
        page: 1,
        totalPages: 1,
      });

      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = { ...mockUser };
        next();
      });

      const response = await request(app)
        .get('/api/inbound/asns')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.asns).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter ASNs by status', async () => {
      (inboundReceivingService.getASNs as jest.Mock).mockResolvedValue({
        asns: [],
        total: 0,
      });

      const response = await request(app)
        .get('/api/inbound/asns?status=PENDING')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(inboundReceivingService.getASNs).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'PENDING',
        })
      );
    });

    it('should paginate ASNs', async () => {
      (inboundReceivingService.getASNs as jest.Mock).mockResolvedValue({
        asns: [],
        total: 50,
        page: 2,
        totalPages: 3,
      });

      const response = await request(app)
        .get('/api/inbound/asns?page=2&limit=20')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(inboundReceivingService.getASNs).toHaveBeenCalledWith(
        expect.objectContaining({
          limit: 20,
          offset: 20,
        })
      );
    });
  });

  // ==========================================================================
  // POST /api/inbound/asns
  // ==========================================================================

  describe('POST /api/inbound/asns', () => {
    it('should create a new ASN', async () => {
      const asnData = {
        supplierId: 'SUP-001',
        expectedDate: '2024-01-05T00:00:00Z',
        items: [
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
        .post('/api/inbound/asns')
        .set('Authorization', 'Bearer valid-token')
        .send(asnData)
        .expect(200);

      expect(response.body.asnId).toBe('ASN-001');
      expect(response.body.items).toHaveLength(2);
    });

    it('should return 400 when supplierId is missing', async () => {
      const response = await request(app)
        .post('/api/inbound/asns')
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
        .post('/api/inbound/asns')
        .set('Authorization', 'Bearer valid-token')
        .send({
          supplierId: 'SUP-001',
          expectedDate: '2024-01-05T00:00:00Z',
          items: [],
        })
        .expect(400);

      expect(response.body).toEqual({
        error: 'At least one item is required',
        code: 'NO_ITEMS',
      });
    });
  });

  // ==========================================================================
  // GET /api/inbound/asns/:asnId
  // ==========================================================================

  describe('GET /api/inbound/asns/:asnId', () => {
    it('should return ASN by ID', async () => {
      const mockAsn = {
        asnId: 'ASN-001',
        supplierId: 'SUP-001',
        status: 'PENDING',
        items: [{ asnItemId: 'ASN-ITEM-001', sku: 'SKU-001', quantity: 100 }],
      };

      (inboundReceivingService.getASNById as jest.Mock).mockResolvedValue(mockAsn);

      const response = await request(app)
        .get('/api/inbound/asns/ASN-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.asnId).toBe('ASN-001');
      expect(response.body.items).toHaveLength(1);
    });

    it('should return 404 when ASN not found', async () => {
      (inboundReceivingService.getASNById as jest.Mock).mockRejectedValue(
        new Error('ASN ASN-NONEXISTENT not found')
      );

      const response = await request(app)
        .get('/api/inbound/asns/ASN-NONEXISTENT')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(inboundReceivingService.getASNById).toHaveBeenCalledWith('ASN-NONEXISTENT');
    });
  });

  // ==========================================================================
  // POST /api/inbound/asns/:asnId/receive
  // ==========================================================================

  describe('POST /api/inbound/asns/:asnId/receive', () => {
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

      (inboundReceivingService.receiveASN as jest.Mock).mockResolvedValue(mockReceipt);

      const response = await request(app)
        .post('/api/inbound/asns/ASN-001/receive')
        .set('Authorization', 'Bearer valid-token')
        .send(receiveData)
        .expect(200);

      expect(response.body.receiptId).toBe('RECEIPT-001');
      expect(response.body.status).toBe('RECEIVED');
    });

    it('should return 400 when ASN is already received', async () => {
      (inboundReceivingService.receiveASN as jest.Mock).mockRejectedValue(
        new Error('ASN ASN-001 is already received')
      );

      const response = await request(app)
        .post('/api/inbound/asns/ASN-001/receive')
        .set('Authorization', 'Bearer valid-token')
        .send({
          receivedBy: 'user-123',
        })
        .expect(500);

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

      (inboundReceivingService.getReceipts as jest.Mock).mockResolvedValue({
        receipts: mockReceipts,
        total: 2,
        page: 1,
        totalPages: 1,
      });

      const response = await request(app)
        .get('/api/inbound/receipts')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body.receipts).toHaveLength(2);
      expect(response.body.total).toBe(2);
    });

    it('should filter receipts by date range', async () => {
      (inboundReceivingService.getReceipts as jest.Mock).mockResolvedValue({
        receipts: [],
        total: 0,
      });

      const response = await request(app)
        .get('/api/inbound/receipts?startDate=2024-01-01&endDate=2024-01-31')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(inboundReceivingService.getReceipts).toHaveBeenCalledWith(
        expect.objectContaining({
          startDate: '2024-01-01',
          endDate: '2024-01-31',
        })
      );
    });
  });

  // ==========================================================================
  // GET /api/inbound/putaway-tasks
  // ==========================================================================

  describe('GET /api/inbound/putaway-tasks', () => {
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
        .get('/api/inbound/putaway-tasks')
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
        .get('/api/inbound/putaway-tasks?status=PENDING')
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
        .get('/api/inbound/putaway-tasks?assignedTo=user-123')
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

  describe('POST /api/inbound/putaway-tasks/:taskId/complete', () => {
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

      (inboundReceivingService.completePutawayTask as jest.Mock).mockResolvedValue(
        mockCompletedTask
      );

      const response = await request(app)
        .post('/api/inbound/putaway-tasks/TASK-001/complete')
        .set('Authorization', 'Bearer valid-token')
        .send(completeData)
        .expect(200);

      expect(response.body.status).toBe('COMPLETED');
      expect(response.body.actualQuantity).toBe(98);
    });

    it('should return 400 when actual quantity is missing', async () => {
      const response = await request(app)
        .post('/api/inbound/putaway-tasks/TASK-001/complete')
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
  // POST /api/inbound/putaway-tasks/:taskId/assign
  // ==========================================================================

  describe('POST /api/inbound/putaway-tasks/:taskId/assign', () => {
    it('should assign putaway task to user', async () => {
      const assignData = {
        assignedTo: 'user-456',
      };

      const mockAssignedTask = {
        taskId: 'TASK-001',
        assignedTo: 'user-456',
        status: 'ASSIGNED',
      };

      (inboundReceivingService.assignPutawayTask as jest.Mock).mockResolvedValue(mockAssignedTask);

      const response = await request(app)
        .post('/api/inbound/putaway-tasks/TASK-001/assign')
        .set('Authorization', 'Bearer valid-token')
        .send(assignData)
        .expect(200);

      expect(response.body.assignedTo).toBe('user-456');
      expect(response.body.status).toBe('ASSIGNED');
    });

    it('should return 400 when assignedTo is missing', async () => {
      const response = await request(app)
        .post('/api/inbound/putaway-tasks/TASK-001/assign')
        .set('Authorization', 'Bearer valid-token')
        .send({})
        .expect(400);

      expect(response.body).toEqual({
        error: 'User ID is required',
        code: 'MISSING_USER_ID',
      });
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
        .get('/api/inbound/dashboard')
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
        .get('/api/inbound/asns')
        .set('Authorization', 'Bearer invalid-token')
        .expect(401);
    });

    it('should allow access with valid authentication', async () => {
      (inboundReceivingService.getASNs as jest.Mock).mockResolvedValue({
        asns: [],
        total: 0,
      });

      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = { ...mockUser };
        next();
      });

      await request(app)
        .get('/api/inbound/asns')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);
    });
  });

  // ==========================================================================
  // Error Handling
  // ==========================================================================

  describe('Error Handling', () => {
    it('should handle service errors gracefully', async () => {
      (inboundReceivingService.getASNs as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      mockedAuthenticate.mockImplementation((req, res, next) => {
        req.user = { ...mockUser };
        next();
      });

      const response = await request(app)
        .get('/api/inbound/asns')
        .set('Authorization', 'Bearer valid-token')
        .expect(500);

      expect(response.body.error).toBeDefined();
    });
  });
});
