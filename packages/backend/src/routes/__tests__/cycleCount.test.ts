/**
 * Cycle Count Routes Tests
 *
 * Tests for cycle count plan and entry management endpoints
 */

import request from 'supertest';
import express from 'express';
import { UserRole, CycleCountStatus, Permission } from '@opsui/shared';

// Mock services and middleware BEFORE importing the router
jest.mock('../../services/CycleCountService', () => ({
  cycleCountService: {
    createCycleCountPlan: jest.fn(),
    getAllCycleCountPlans: jest.fn(),
    getCycleCountPlan: jest.fn(),
    startCycleCountPlan: jest.fn(),
    completeCycleCountPlan: jest.fn(),
    reconcileCycleCountPlan: jest.fn(),
    createCycleCountEntry: jest.fn(),
    updateVarianceStatus: jest.fn(),
    bulkUpdateVarianceStatus: jest.fn(),
    getReconcileSummary: jest.fn(),
    cancelCycleCountPlan: jest.fn(),
    checkForCollisions: jest.fn(),
    exportCycleCountData: jest.fn(),
    getCycleCountAuditLog: jest.fn(),
    getAllTolerances: jest.fn(),
  },
}));

// Mock the permissions middleware module
jest.mock('../../middleware/permissions', () => ({
  requirePermission: jest.fn(() => (req: any, _res: any, next: any) => {
    next();
  }),
  hasPermission: jest.fn(() => true),
  hasAnyPermission: jest.fn(() => true),
  hasAllPermissions: jest.fn(() => true),
}));

jest.mock('../../middleware', () => {
  const actual = jest.requireActual('../../middleware');
  return {
    ...actual,
    authenticate: jest.fn((req, _res, next) => {
      (req as any).user = {
        userId: 'user-001',
        email: 'user@example.com',
        role: UserRole.SUPERVISOR,
        baseRole: UserRole.SUPERVISOR,
        effectiveRole: UserRole.SUPERVISOR,
      };
      next();
    }),
    authorize: jest.fn((...roles: string[]) => (req: any, res: any, next: any) => {
      if (roles.includes((req as any).user?.role)) {
        next();
      } else {
        res.status(403).json({ error: 'Forbidden' });
      }
    }),
    asyncHandler: (fn: any) => (req: any, res: any, next: any) => {
      // Match actual implementation
      return Promise.resolve(fn(req, res, next)).catch(next);
    },
  };
});

// Import router after mocks are set up
import cycleCountRouter from '../cycleCount';
import { cycleCountService } from '../../services/CycleCountService';

describe('Cycle Count Routes', () => {
  let app: express.Application;

  beforeAll(() => {
    app = express();
    app.use(express.json());
    app.use('/api/cycle-count', cycleCountRouter);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/cycle-count/plans', () => {
    it('should create a new cycle count plan', async () => {
      const mockPlan = {
        planId: 'plan-001',
        planName: 'Zone A Count',
        countType: 'BLANKET',
        status: 'SCHEDULED',
        scheduledDate: new Date('2024-01-15').toISOString(),
        location: 'A-01',
      };

      (cycleCountService.createCycleCountPlan as jest.Mock).mockResolvedValue({
        ...mockPlan,
        scheduledDate: new Date('2024-01-15'),
      });

      const response = await request(app)
        .post('/api/cycle-count/plans')
        .send({
          planName: 'Zone A Count',
          countType: 'BLANKET',
          scheduledDate: '2024-01-15',
          location: 'A-01',
          countBy: 'user-001',
        })
        .expect(201);

      expect(response.body.planId).toBe('plan-001');
      expect(response.body.scheduledDate).toBe(new Date('2024-01-15').toISOString());
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await request(app)
        .post('/api/cycle-count/plans')
        .send({
          planName: 'Incomplete Plan',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required fields');
      expect(response.body.code).toBe('MISSING_FIELDS');
    });
  });

  describe('GET /api/cycle-count/plans', () => {
    it('should return all cycle count plans', async () => {
      const mockPlans = [
        {
          planId: 'plan-001',
          planName: 'Zone A Count',
          status: 'SCHEDULED',
        },
        {
          planId: 'plan-002',
          planName: 'SKU Count',
          status: 'IN_PROGRESS',
        },
      ];

      (cycleCountService.getAllCycleCountPlans as jest.Mock).mockResolvedValue({
        plans: mockPlans,
        total: 2,
      });

      const response = await request(app).get('/api/cycle-count/plans').expect(200);

      expect(response.body).toHaveProperty('plans');
      expect(response.body.plans).toHaveLength(2);
      expect(cycleCountService.getAllCycleCountPlans).toHaveBeenCalledWith(
        expect.objectContaining({
          requestingUserRole: UserRole.SUPERVISOR,
          requestingUserId: 'user-001',
        })
      );
    });
  });

  describe('POST /api/cycle-count/plans/:planId/reconcile', () => {
    it('should reconcile a cycle count plan', async () => {
      const mockPlan = {
        planId: 'plan-001',
        status: 'RECONCILED',
      };

      (cycleCountService.reconcileCycleCountPlan as jest.Mock).mockResolvedValue(mockPlan);

      const response = await request(app)
        .post('/api/cycle-count/plans/plan-001/reconcile')
        .send({ notes: 'All variances approved' })
        .expect(200);

      expect(response.body).toEqual(mockPlan);
      expect(cycleCountService.reconcileCycleCountPlan).toHaveBeenCalledWith({
        planId: 'plan-001',
        reconciledBy: 'user-001',
        notes: 'All variances approved',
      });
    });
  });

  describe('POST /api/cycle-count/entries', () => {
    it('should create a cycle count entry', async () => {
      const mockEntry = {
        entryId: 'entry-001',
        planId: 'plan-001',
        sku: 'SKU-001',
        binLocation: 'A-01-01',
        countedQuantity: 100,
        systemQuantity: 95,
        variance: 5,
      };

      (cycleCountService.createCycleCountEntry as jest.Mock).mockResolvedValue(mockEntry);

      const response = await request(app)
        .post('/api/cycle-count/entries')
        .send({
          planId: 'plan-001',
          sku: 'SKU-001',
          binLocation: 'A-01-01',
          countedQuantity: 100,
        })
        .expect(201);

      expect(response.body).toEqual(mockEntry);
    });

    it('should return 400 when required entry fields are missing', async () => {
      const response = await request(app)
        .post('/api/cycle-count/entries')
        .send({
          planId: 'plan-001',
          sku: 'SKU-001',
        })
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });
  });

  describe('PATCH /api/cycle-count/entries/:entryId/variance', () => {
    it('should update variance status', async () => {
      const mockEntry = {
        entryId: 'entry-001',
        varianceStatus: 'APPROVED',
      };

      (cycleCountService.updateVarianceStatus as jest.Mock).mockResolvedValue(mockEntry);

      const response = await request(app)
        .patch('/api/cycle-count/entries/entry-001/variance')
        .send({
          status: 'APPROVED',
          notes: 'Variance within tolerance',
        })
        .expect(200);

      expect(response.body).toEqual(mockEntry);
    });
  });

  describe('POST /api/cycle-count/plans/:planId/bulk-variance-update', () => {
    it('should bulk update variance status', async () => {
      const mockResult = {
        updated: 5,
        skipped: 0,
      };

      (cycleCountService.bulkUpdateVarianceStatus as jest.Mock).mockResolvedValue(mockResult);

      const response = await request(app)
        .post('/api/cycle-count/plans/plan-001/bulk-variance-update')
        .send({
          status: 'APPROVED',
          notes: 'Batch approval',
          autoApproveZeroVariance: true,
        })
        .expect(200);

      expect(response.body).toEqual(mockResult);
    });
  });

  describe('GET /api/cycle-count/tolerances', () => {
    it('should return all tolerance rules', async () => {
      const mockTolerances = [
        { toleranceId: 'tol-001', varianceThreshold: 5, appliesTo: 'ALL' },
        { toleranceId: 'tol-002', varianceThreshold: 10, appliesTo: 'HIGH_VALUE' },
      ];

      (cycleCountService.getAllTolerances as jest.Mock).mockResolvedValue(mockTolerances);

      const response = await request(app).get('/api/cycle-count/tolerances').expect(200);

      expect(response.body).toEqual(mockTolerances);
    });
  });

  describe('GET /api/cycle-count/debug-permissions', () => {
    it.skip('should return debug permission info - skipped due to dynamic import complexity', () => {
      // This endpoint uses dynamic imports which are difficult to mock
    });
  });
});
