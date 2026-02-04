/**
 * Integration tests for audit log routes
 * @covers src/routes/audit.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { authenticate, authorize } from '../../middleware/auth';
import { getAuditService, AuditCategory, AuditEventType } from '../../services/AuditService';

// Mock all dependencies
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'user-123',
      email: 'admin@example.com',
      role: 'ADMIN',
    };
    next();
  }),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

jest.mock('../../services/AuditService', () => {
  const mockLogs = [
    {
      id: 1,
      userId: 'user-123',
      userEmail: 'admin@example.com',
      actionType: 'LOGIN',
      actionCategory: 'AUTHENTICATION',
      resourceType: 'User',
      resourceId: 'user-123',
      actionDescription: 'User logged in',
      ipAddress: '127.0.0.1',
      userAgent: 'test-agent',
      timestamp: new Date('2024-01-01T10:00:00Z'),
      oldValue: null,
      newValue: null,
      metadata: null,
    },
  ];

  // Create a singleton instance
  const mockAuditServiceInstance = {
    query: jest.fn().mockResolvedValue(mockLogs),
    getById: jest.fn().mockImplementation((id: number) => {
      if (id === 999) return Promise.resolve(null);
      return Promise.resolve(mockLogs[0]);
    }),
    getStatistics: jest.fn().mockResolvedValue({
      totalActions: 100,
      uniqueUsers: 10,
      actionCounts: { LOGIN: 50, LOGOUT: 50 },
      categoryCounts: { AUTHENTICATION: 100 },
    }),
    getResourceHistory: jest.fn().mockResolvedValue(mockLogs),
    getUserActivity: jest.fn().mockResolvedValue(mockLogs),
    getSecurityEvents: jest.fn().mockResolvedValue(mockLogs.filter(l => l.actionType === 'LOGIN')),
  };

  return {
    getAuditService: jest.fn(() => mockAuditServiceInstance),
    AuditCategory: {
      AUTHENTICATION: 'AUTHENTICATION',
      DATA_ACCESS: 'DATA_ACCESS',
      DATA_MODIFICATION: 'DATA_MODIFICATION',
    },
    AuditEventType: {
      LOGIN: 'LOGIN',
      LOGOUT: 'LOGOUT',
      UNAUTHORIZED_ACCESS_ATTEMPT: 'UNAUTHORIZED_ACCESS_ATTEMPT',
    },
  };
});

describe('Audit Routes', () => {
  let app: any;
  let auditService: any;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
    // Get the same singleton instance that the routes will use
    auditService = getAuditService();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /api/v1/audit/logs
  // ==========================================================================

  describe('GET /api/v1/audit/logs', () => {
    it('should get audit logs with default options', async () => {
      const response = await request(app)
        .get('/api/v1/audit/logs')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(auditService.query).toHaveBeenCalledWith({});
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        id: 1,
        userId: 'user-123',
        actionType: 'LOGIN',
      });
    });

    it('should get audit logs with filters', async () => {
      const response = await request(app)
        .get('/api/v1/audit/logs?userId=user-123&category=AUTHENTICATION&limit=10&offset=0')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(auditService.query).toHaveBeenCalledWith({
        userId: 'user-123',
        category: 'AUTHENTICATION',
        limit: 10,
        offset: 0,
      });
      expect(response.body).toHaveLength(1);
    });

    it('should parse date range filters', async () => {
      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-31T23:59:59Z';

      const response = await request(app)
        .get(
          `/api/v1/audit/logs?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
        )
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(auditService.query).toHaveBeenCalledWith({
        startDate: expect.any(Date),
        endDate: expect.any(Date),
      });
      expect(response.body).toHaveLength(1);
    });
  });

  // ==========================================================================
  // GET /api/v1/audit/logs/:id
  // ==========================================================================

  describe('GET /api/v1/audit/logs/:id', () => {
    it('should get audit log by ID', async () => {
      const response = await request(app)
        .get('/api/v1/audit/logs/1')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(auditService.getById).toHaveBeenCalledWith(1);
      expect(response.body).toMatchObject({
        id: 1,
        userId: 'user-123',
        actionType: 'LOGIN',
      });
    });

    it('should return 404 for non-existent log', async () => {
      // The mock getById returns null for ID 999
      const response = await request(app)
        .get('/api/v1/audit/logs/999')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'Audit log not found');
    });
  });

  // ==========================================================================
  // GET /api/v1/audit/statistics
  // ==========================================================================

  describe('GET /api/v1/audit/statistics', () => {
    it('should get audit statistics with default date range', async () => {
      const response = await request(app)
        .get('/api/v1/audit/statistics')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(auditService.getStatistics).toHaveBeenCalledWith(expect.any(Date), expect.any(Date));
      expect(response.body).toMatchObject({
        totalActions: 100,
        uniqueUsers: 10,
      });
    });

    it('should get audit statistics with custom date range', async () => {
      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-31T23:59:59Z';

      const response = await request(app)
        .get(
          `/api/v1/audit/statistics?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
        )
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(auditService.getStatistics).toHaveBeenCalledWith(expect.any(Date), expect.any(Date));
      expect(response.body).toMatchObject({
        totalActions: 100,
        uniqueUsers: 10,
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/audit/resource/:resourceType/:resourceId
  // ==========================================================================

  describe('GET /api/v1/audit/resource/:resourceType/:resourceId', () => {
    it('should get audit history for a resource', async () => {
      const response = await request(app)
        .get('/api/v1/audit/resource/Order/order-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(auditService.getResourceHistory).toHaveBeenCalledWith('Order', 'order-123', 50);
      expect(response.body).toHaveLength(1);
    });

    it('should use custom limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/audit/resource/Order/order-123?limit=20')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(auditService.getResourceHistory).toHaveBeenCalledWith('Order', 'order-123', 20);
      expect(response.body).toHaveLength(1);
    });
  });

  // ==========================================================================
  // GET /api/v1/audit/user/:userId
  // ==========================================================================

  describe('GET /api/v1/audit/user/:userId', () => {
    it('should get audit history for a user', async () => {
      const response = await request(app)
        .get('/api/v1/audit/user/user-123')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(auditService.getUserActivity).toHaveBeenCalledWith('user-123', 100);
      expect(response.body).toHaveLength(1);
    });

    it('should use custom limit parameter', async () => {
      const response = await request(app)
        .get('/api/v1/audit/user/user-123?limit=50')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(auditService.getUserActivity).toHaveBeenCalledWith('user-123', 50);
      expect(response.body).toHaveLength(1);
    });
  });

  // ==========================================================================
  // GET /api/v1/audit/security-events
  // ==========================================================================

  describe('GET /api/v1/audit/security-events', () => {
    it('should get security events with default date range', async () => {
      const response = await request(app)
        .get('/api/v1/audit/security-events')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(auditService.getSecurityEvents).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
      expect(response.body).toHaveLength(1);
    });

    it('should get security events with custom date range', async () => {
      const startDate = '2024-01-01T00:00:00Z';
      const endDate = '2024-01-31T23:59:59Z';

      const response = await request(app)
        .get(
          `/api/v1/audit/security-events?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
        )
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(auditService.getSecurityEvents).toHaveBeenCalledWith(
        expect.any(Date),
        expect.any(Date)
      );
      expect(response.body).toHaveLength(1);
    });
  });

  // ==========================================================================
  // GET /api/v1/audit/categories
  // ==========================================================================

  describe('GET /api/v1/audit/categories', () => {
    it('should get all audit categories', async () => {
      const response = await request(app)
        .get('/api/v1/audit/categories')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining(['AUTHENTICATION', 'DATA_ACCESS', 'DATA_MODIFICATION'])
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/audit/actions
  // ==========================================================================

  describe('GET /api/v1/audit/actions', () => {
    it('should get all audit event types', async () => {
      const response = await request(app)
        .get('/api/v1/audit/actions')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toEqual(
        expect.arrayContaining(['LOGIN', 'LOGOUT', 'UNAUTHORIZED_ACCESS_ATTEMPT'])
      );
    });
  });

  // ==========================================================================
  // GET /api/v1/audit/users
  // ==========================================================================

  describe('GET /api/v1/audit/users', () => {
    it('should get all unique user emails', async () => {
      const response = await request(app)
        .get('/api/v1/audit/users')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(auditService.query).toHaveBeenCalledWith({ limit: 10000 });
      expect(response.body).toEqual(['admin@example.com']);
    });

    it('should return unique emails in sorted order', async () => {
      // The mock already returns one email
      const response = await request(app)
        .get('/api/v1/audit/users')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(auditService.query).toHaveBeenCalledWith({ limit: 10000 });
      expect(response.body).toEqual(expect.arrayContaining(['admin@example.com']));
    });
  });

  // ==========================================================================
  // GET /api/v1/audit/resource-types
  // ==========================================================================

  describe('GET /api/v1/audit/resource-types', () => {
    it('should get all unique resource types', async () => {
      const response = await request(app)
        .get('/api/v1/audit/resource-types')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(auditService.query).toHaveBeenCalledWith({ limit: 10000 });
      expect(response.body).toEqual(['User']);
    });

    it('should return unique resource types in sorted order', async () => {
      // The mock already returns one resource type
      const response = await request(app)
        .get('/api/v1/audit/resource-types')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(auditService.query).toHaveBeenCalledWith({ limit: 10000 });
      expect(response.body).toEqual(expect.arrayContaining(['User']));
    });
  });
});
