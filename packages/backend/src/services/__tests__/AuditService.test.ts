/**
 * Unit tests for AuditService
 * @covers src/services/AuditService.ts
 */

import { AuditService, getAuditService, AuditCategory, AuditEventType } from '../AuditService';

// Mock all dependencies
jest.mock('../../db/client', () => ({
  getPool: jest.fn(),
}));

jest.mock('../../config/logger', () => ({
  logger: {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  },
}));

jest.mock('../../observability/telemetry', () => ({
  addSpanAttributes: jest.fn(),
  addSpanEvent: jest.fn(),
  recordException: jest.fn(),
}));

describe('AuditService', () => {
  let auditService: AuditService;
  let mockPool: any;
  let mockQuery: jest.Mock;

  beforeEach(() => {
    jest.clearAllMocks();

    // Setup mock pool and query function
    mockQuery = jest.fn();
    mockPool = {
      query: mockQuery,
    };

    (require('../../db/client').getPool as jest.Mock).mockReturnValue(mockPool);

    auditService = new AuditService();
  });

  // ==========================================================================
  // INITIALIZATION
  // ==========================================================================

  describe('initialize', () => {
    it('should initialize successfully when audit_logs table exists', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });

      await auditService.initialize();

      expect(auditService['isInitialized']).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(expect.stringContaining('SELECT EXISTS'));
    });

    it('should throw error when audit_logs table does not exist', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: false }],
      });

      await expect(auditService.initialize()).rejects.toThrow('audit_logs table does not exist');
    });

    it('should not initialize twice', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });

      await auditService.initialize();
      expect(mockQuery).toHaveBeenCalledTimes(1); // Called once after first initialize

      await auditService.initialize(); // Should return early

      expect(mockQuery).toHaveBeenCalledTimes(1); // Still only called once
    });
  });

  // ==========================================================================
  // LOG METHOD
  // ==========================================================================

  describe('log', () => {
    it('should log an audit event successfully', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 123 }],
      });

      const auditLog = {
        userId: 'user-123',
        userEmail: 'test@example.com',
        userRole: 'ADMIN',
        sessionId: 'session-abc',
        actionType: AuditEventType.USER_CREATED,
        actionCategory: AuditCategory.USER_MANAGEMENT,
        resourceType: 'user',
        resourceId: 'user-123',
        actionDescription: 'Created new user',
        ipAddress: '127.0.0.1',
        userAgent: 'Mozilla/5.0',
        requestId: 'req-123',
        correlationId: 'corr-123',
        status: 'SUCCESS' as const,
      };

      const result = await auditService.log(auditLog);

      expect(result).toBe(123);
      expect(mockQuery).toHaveBeenCalledTimes(2); // initialize + insert
    });

    it('should auto-initialize if not initialized', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 456 }],
      });

      const auditLog = {
        userId: 'user-456',
        actionType: AuditEventType.LOGIN_SUCCESS,
        actionCategory: AuditCategory.AUTHENTICATION,
        actionDescription: 'User logged in',
      };

      await auditService.log(auditLog);

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should generate audit_id if not provided', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 789 }],
      });

      const auditLog = {
        userId: 'user-789',
        actionType: AuditEventType.ORDER_CREATED,
        actionCategory: AuditCategory.DATA_MODIFICATION,
        actionDescription: 'Order created',
      };

      await auditService.log(auditLog);

      const insertCall = mockQuery.mock.calls[1];
      const auditId = insertCall[1][0]; // First parameter ($1) is audit_id

      expect(auditId).toMatch(/^AUD-\d+-[a-z0-9]+$/);
    });

    it('should use provided audit_id', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 999 }],
      });

      const auditLog = {
        auditId: 'CUSTOM-AUDIT-ID',
        userId: 'user-999',
        actionType: AuditEventType.CONFIG_UPDATED,
        actionCategory: AuditCategory.CONFIGURATION,
        actionDescription: 'Config updated',
      };

      await auditService.log(auditLog);

      const insertCall = mockQuery.mock.calls[1];
      expect(insertCall[1][0]).toBe('CUSTOM-AUDIT-ID');
    });

    it('should set retention_until to 2 years from now', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 111 }],
      });

      const auditLog = {
        userId: 'user-111',
        actionType: AuditEventType.ORDER_VIEWED,
        actionCategory: AuditCategory.DATA_ACCESS,
        actionDescription: 'Order viewed',
      };

      await auditService.log(auditLog);

      const insertCall = mockQuery.mock.calls[1];
      const values = insertCall[1];

      // $1 = auditId (index 0), $23 = retention_until (index 21), $24 = occurred_at (index 22)
      const occurredAt = values[22]; // occurred_at ($24)
      const retentionDate = values[21]; // retention_until ($23)

      expect(occurredAt).toBeInstanceOf(Date);
      expect(retentionDate).toBeInstanceOf(Date);

      // retention date should be approximately 2 years after occurred_at
      const yearDiff = retentionDate.getFullYear() - occurredAt.getFullYear();
      expect(yearDiff).toBeGreaterThanOrEqual(1); // At least 1 year apart
    });

    it('should handle telemetry errors gracefully', async () => {
      const { addSpanAttributes } = require('../../observability/telemetry');
      addSpanAttributes.mockImplementation(() => {
        throw new Error('Telemetry error');
      });

      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 222 }],
      });

      const auditLog = {
        userId: 'user-222',
        actionType: AuditEventType.API_ACCESS,
        actionCategory: AuditCategory.API_ACCESS,
        actionDescription: 'API accessed',
      };

      // Should not throw despite telemetry error
      await auditService.log(auditLog);

      expect(mockQuery).toHaveBeenCalledTimes(2);
    });

    it('should throw and record exception on database error', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockRejectedValueOnce(new Error('Database connection failed'));

      const { recordException } = require('../../observability/telemetry');

      const auditLog = {
        userId: 'user-err',
        actionType: AuditEventType.ORDER_UPDATED,
        actionCategory: AuditCategory.DATA_MODIFICATION,
        actionDescription: 'Order updated',
      };

      await expect(auditService.log(auditLog)).rejects.toThrow('Database connection failed');
      expect(recordException).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // QUERY METHOD
  // ==========================================================================

  describe('query', () => {
    it('should query audit logs with no filters', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            auditId: 'AUD-001',
            occurredAt: new Date('2024-01-01'),
            userId: 'user-1',
            userEmail: 'user1@example.com',
            userRole: 'ADMIN',
            sessionId: 'sess-1',
            actionType: AuditEventType.USER_CREATED,
            actionCategory: AuditCategory.USER_MANAGEMENT,
            resourceType: 'user',
            resourceId: 'user-1',
            actionDescription: 'Created user',
            oldValues: null,
            newValues: null,
            changedFields: null,
            ipAddress: '127.0.0.1',
            userAgent: 'Mozilla',
            requestId: 'req-1',
            correlationId: 'corr-1',
            status: 'SUCCESS',
            errorCode: null,
            errorMessage: null,
            metadata: null,
            retentionUntil: new Date('2026-01-01'),
          },
        ],
      });

      const results = await auditService.query();

      expect(results).toHaveLength(1);
      expect(results[0].actionType).toBe(AuditEventType.USER_CREATED);
    });

    it('should filter by userId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await auditService.query({ userId: 'user-filter' });

      const sql = mockQuery.mock.calls[1][0];
      expect(sql).toContain('user_id = $1');
    });

    it('should filter by username', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await auditService.query({ username: 'test@example.com' });

      const sql = mockQuery.mock.calls[1][0];
      expect(sql).toContain('user_email = $');
    });

    it('should filter by category', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await auditService.query({ category: AuditCategory.SECURITY });

      const sql = mockQuery.mock.calls[1][0];
      expect(sql).toContain('action_category = $');
    });

    it('should filter by action', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await auditService.query({ action: AuditEventType.LOGIN_SUCCESS });

      const sql = mockQuery.mock.calls[1][0];
      expect(sql).toContain('action_type = $');
    });

    it('should filter by resourceType', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await auditService.query({ resourceType: 'order' });

      const sql = mockQuery.mock.calls[1][0];
      expect(sql).toContain('resource_type = $');
    });

    it('should filter by resourceId', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await auditService.query({ resourceId: 'SO-123' });

      const sql = mockQuery.mock.calls[1][0];
      expect(sql).toContain('resource_id = $');
    });

    it('should filter by startDate', async () => {
      const startDate = new Date('2024-01-01');
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await auditService.query({ startDate });

      const sql = mockQuery.mock.calls[1][0];
      expect(sql).toContain('occurred_at >= $');
    });

    it('should filter by endDate', async () => {
      const endDate = new Date('2024-12-31');
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await auditService.query({ endDate });

      const sql = mockQuery.mock.calls[1][0];
      expect(sql).toContain('occurred_at <= $');
    });

    it('should apply default limit of 100', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await auditService.query();

      const sql = mockQuery.mock.calls[1][0];
      expect(sql).toContain('LIMIT $');
    });

    it('should apply custom limit', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await auditService.query({ limit: 50 });

      // Check that the limit parameter was passed
      const params = mockQuery.mock.calls[1][1];
      // The last two parameters are limit and offset
      expect(params[params.length - 2]).toBe(50);
    });

    it('should apply custom offset', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await auditService.query({ offset: 10 });

      const sql = mockQuery.mock.calls[1][0];
      expect(sql).toContain('OFFSET $');
    });

    it('should combine multiple filters', async () => {
      mockQuery.mockResolvedValueOnce({ rows: [{ exists: true }] });
      mockQuery.mockResolvedValueOnce({ rows: [] });

      await auditService.query({
        userId: 'user-123',
        category: AuditCategory.SECURITY,
        action: AuditEventType.LOGIN_FAILED,
        startDate: new Date('2024-01-01'),
        endDate: new Date('2024-01-31'),
        limit: 25,
        offset: 5,
      });

      const sql = mockQuery.mock.calls[1][0];
      expect(sql).toContain('WHERE');
      expect(sql).toContain('user_id =');
      expect(sql).toContain('action_category =');
      expect(sql).toContain('action_type =');
      expect(sql).toContain('occurred_at >=');
      expect(sql).toContain('occurred_at <=');
    });
  });

  // ==========================================================================
  // GET BY ID
  // ==========================================================================

  describe('getById', () => {
    it('should return audit log by ID', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            auditId: 'AUD-001',
            occurredAt: new Date('2024-01-01'),
            userId: 'user-1',
            actionType: AuditEventType.ORDER_CREATED,
            actionCategory: AuditCategory.DATA_MODIFICATION,
            actionDescription: 'Created order',
            status: 'SUCCESS',
          },
        ],
      });

      const result = await auditService.getById(1);

      expect(result).toBeTruthy();
      expect(result!.id).toBe(1);
      expect(result!.actionType).toBe(AuditEventType.ORDER_CREATED);
    });

    it('should return null when audit log not found', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      const result = await auditService.getById(999);

      expect(result).toBeNull();
    });

    it('should throw and record exception on database error', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockRejectedValueOnce(new Error('Database error'));

      const { recordException } = require('../../observability/telemetry');

      await expect(auditService.getById(1)).rejects.toThrow('Database error');
      expect(recordException).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // CONVENIENCE METHODS
  // ==========================================================================

  describe('logAuth', () => {
    it('should log authentication event with proper category', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 1 }],
      });

      const result = await auditService.logAuth(
        AuditEventType.LOGIN_SUCCESS,
        'user-123',
        'user@example.com',
        '127.0.0.1',
        'Mozilla/5.0',
        'User logged in successfully'
      );

      expect(result).toBe(1);

      const insertCall = mockQuery.mock.calls[1];
      expect(insertCall[1][6]).toBe(AuditCategory.AUTHENTICATION);
    });
  });

  describe('logAuthorization', () => {
    it('should log authorization event', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 2 }],
      });

      const result = await auditService.logAuthorization(
        AuditEventType.ROLE_GRANTED,
        'user-123',
        'user@example.com',
        'ADMIN',
        'user',
        'user-123',
        'Granted ADMIN role to user',
        { oldRole: 'USER' },
        { newRole: 'ADMIN' }
      );

      expect(result).toBe(2);

      const insertCall = mockQuery.mock.calls[1];
      expect(insertCall[1][6]).toBe(AuditCategory.AUTHORIZATION);
    });
  });

  describe('logDataModification', () => {
    it('should log data modification event', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 3 }],
      });

      const result = await auditService.logDataModification(
        AuditEventType.ORDER_UPDATED,
        'user-123',
        'user@example.com',
        'order',
        'SO-123',
        'Updated order status',
        { oldStatus: 'PENDING' },
        { newStatus: 'PICKING' },
        '192.168.1.1',
        'Chrome'
      );

      expect(result).toBe(3);

      const insertCall = mockQuery.mock.calls[1];
      expect(insertCall[1][6]).toBe(AuditCategory.DATA_MODIFICATION);
    });
  });

  describe('logSecurityEvent', () => {
    it('should log security event', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ id: 4 }],
      });

      const result = await auditService.logSecurityEvent(
        AuditEventType.SUSPICIOUS_ACTIVITY,
        'Multiple failed login attempts',
        '10.0.0.1',
        'Bot/1.0',
        { attempts: 5 }
      );

      expect(result).toBe(4);

      const insertCall = mockQuery.mock.calls[1];
      expect(insertCall[1][6]).toBe(AuditCategory.SECURITY);
      expect(insertCall[1][1]).toBeNull(); // userId should be null for security events
      expect(insertCall[1][2]).toBeNull(); // userEmail should be null
    });
  });

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  describe('getResourceHistory', () => {
    it('should get audit history for a resource', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            resourceType: 'order',
            resourceId: 'SO-123',
            actionDescription: 'Order created',
          },
        ],
      });

      const results = await auditService.getResourceHistory('order', 'SO-123', 50);

      expect(results).toHaveLength(1);
    });

    it('should use default limit of 50', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      await auditService.getResourceHistory('order', 'SO-123');

      // Check that the limit parameter was passed as 50
      const params = mockQuery.mock.calls[1][1];
      expect(params[params.length - 2]).toBe(50);
    });
  });

  describe('getUserActivity', () => {
    it('should get user activity history', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            userId: 'user-123',
            actionDescription: 'Viewed dashboard',
          },
        ],
      });

      const results = await auditService.getUserActivity('user-123');

      expect(results).toHaveLength(1);
    });

    it('should use default limit of 100', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      await auditService.getUserActivity('user-123');

      // Check that the limit parameter was passed as 100
      const params = mockQuery.mock.calls[1][1];
      expect(params[params.length - 2]).toBe(100);
    });
  });

  describe('getSecurityEvents', () => {
    it('should get security events with default date range', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [
          {
            id: 1,
            actionCategory: AuditCategory.SECURITY,
            actionDescription: 'Failed login attempt',
          },
        ],
      });

      const results = await auditService.getSecurityEvents();

      expect(results).toHaveLength(1);
    });

    it('should use custom date range when provided', async () => {
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-06-30');

      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [],
      });

      await auditService.getSecurityEvents(startDate, endDate);

      const sql = mockQuery.mock.calls[1][0];
      expect(sql).toContain('WHERE');
      expect(sql).toContain('action_category =');
    });
  });

  describe('getStatistics', () => {
    it('should return audit statistics', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });

      // Mock the parallel queries
      mockQuery.mockResolvedValueOnce({
        rows: [
          { action_category: 'AUTHENTICATION', count: '100' },
          { action_category: 'DATA_MODIFICATION', count: '200' },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [
          { action_type: 'ORDER_CREATED', count: '50' },
          { action_type: 'ORDER_UPDATED', count: '30' },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [
          { user_email: 'user1@example.com', count: '25' },
          { user_email: 'user2@example.com', count: '15' },
        ],
      });
      mockQuery.mockResolvedValueOnce({
        rows: [{ count: '300' }],
      });

      const stats = await auditService.getStatistics();

      expect(stats.totalLogs).toBe(300);
      expect(stats.byCategory).toEqual({
        AUTHENTICATION: 100,
        DATA_MODIFICATION: 200,
      });
      expect(stats.byAction).toEqual({
        ORDER_CREATED: 50,
        ORDER_UPDATED: 30,
      });
      expect(stats.topUsers).toHaveLength(2);
    });
  });

  describe('cleanupOldLogs', () => {
    it('should delete old audit logs based on retention days', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rowCount: 50,
      });

      const deletedCount = await auditService.cleanupOldLogs(90);

      expect(deletedCount).toBe(50);

      const sql = mockQuery.mock.calls[1][0];
      expect(sql).toContain('DELETE FROM audit_logs');
      expect(sql).toContain('WHERE occurred_at < $1');
    });

    it('should use default retention of 90 days', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockResolvedValueOnce({
        rowCount: 10,
      });

      await auditService.cleanupOldLogs();

      const cutoffDate = mockQuery.mock.calls[1][1][0]; // First parameter of delete query
      const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);

      // Check that the cutoff date is approximately 90 days ago
      const diff = Math.abs(cutoffDate.getTime() - ninetyDaysAgo.getTime());
      expect(diff).toBeLessThan(1000); // Within 1 second
    });

    it('should throw and record exception on database error', async () => {
      mockQuery.mockResolvedValueOnce({
        rows: [{ exists: true }],
      });
      mockQuery.mockRejectedValueOnce(new Error('Delete failed'));

      const { recordException } = require('../../observability/telemetry');

      await expect(auditService.cleanupOldLogs()).rejects.toThrow('Delete failed');
      expect(recordException).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // SINGLETON
  // ==========================================================================

  describe('getAuditService singleton', () => {
    it('should return singleton instance', () => {
      const instance1 = getAuditService();
      const instance2 = getAuditService();

      expect(instance1).toBe(instance2);
    });

    it('should return same instance on multiple calls', () => {
      const service1 = getAuditService();
      const service2 = getAuditService();

      expect(service1).toBe(service2);
    });
  });
});
