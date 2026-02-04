/**
 * Integration tests for business rules routes
 * @covers src/routes/businessRules.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { businessRulesRepository } from '../../repositories/BusinessRulesRepository';
import { businessRulesService } from '../../services/BusinessRulesService';
import { UserRole } from '@opsui/shared';

// Mock all dependencies
jest.mock('../../middleware/auth', () => ({
  ...jest.requireActual('../../middleware/auth'),
  authenticate: jest.fn((req: any, res: any, next: any) => {
    req.user = {
      userId: 'user-123',
      email: 'admin@example.com',
      role: UserRole.ADMIN,
    };
    next();
  }),
  authorize: jest.fn(() => (req: any, res: any, next: any) => next()),
  asyncHandler: (fn: any) => (req: any, res: any, next: any) =>
    Promise.resolve(fn(req, res, next)).catch(next),
}));

jest.mock('../../repositories/BusinessRulesRepository');
jest.mock('../../services/BusinessRulesService');

describe('Business Rules Routes', () => {
  let app: any;

  const mockRule = {
    ruleId: 'rule-001',
    name: 'Test Rule',
    description: 'A test business rule',
    ruleType: 'VALIDATION',
    status: 'ACTIVE',
    triggerEvents: ['ORDER_CREATED'],
    conditions: [{ field: 'total', operator: 'gt', value: 1000 }],
    actions: [{ type: 'notify', target: 'admin' }],
    createdBy: 'user-123',
    createdAt: '2024-01-01T10:00:00Z',
    executionCount: 5,
    version: 1,
  };

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /api/v1/business-rules
  // ==========================================================================

  describe('GET /api/v1/business-rules', () => {
    it('should get all business rules', async () => {
      (businessRulesRepository.findAll as jest.MockedFunction<any>).mockResolvedValue([mockRule]);

      const response = await request(app)
        .get('/api/v1/business-rules')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: {
          rules: [mockRule],
          count: 1,
        },
      });
    });

    it('should filter by status', async () => {
      (businessRulesRepository.findAll as jest.MockedFunction<any>).mockResolvedValue([mockRule]);

      await request(app)
        .get('/api/v1/business-rules?status=ACTIVE')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(businessRulesRepository.findAll).toHaveBeenCalledWith({
        status: 'ACTIVE',
        ruleType: undefined,
        includeInactive: false,
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/business-rules/:ruleId
  // ==========================================================================

  describe('GET /api/v1/business-rules/:ruleId', () => {
    it('should get a business rule by ID', async () => {
      (businessRulesRepository.findById as jest.MockedFunction<any>).mockResolvedValue(mockRule);

      const response = await request(app)
        .get('/api/v1/business-rules/rule-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toMatchObject({
        success: true,
        data: { rule: mockRule },
      });
    });

    it('should return 404 for non-existent rule', async () => {
      (businessRulesRepository.findById as jest.MockedFunction<any>).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/v1/business-rules/non-existent')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Rule not found',
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/business-rules
  // ==========================================================================

  describe('POST /api/v1/business-rules', () => {
    it('should create a new business rule', async () => {
      const newRuleData = {
        name: 'New Rule',
        ruleType: 'VALIDATION',
        triggerEvents: ['ORDER_CREATED'],
        conditions: [{ field: 'total', operator: 'gt', value: 1000 }],
        actions: [{ type: 'notify', target: 'admin' }],
        createdBy: 'user-123',
      };

      (businessRulesRepository.create as jest.MockedFunction<any>).mockResolvedValue({
        ...mockRule,
        ...newRuleData,
        ruleId: 'rule-002',
      });

      const response = await request(app)
        .post('/api/v1/business-rules')
        .set('Authorization', 'Bearer valid-token')
        .send(newRuleData)
        .expect(201);

      expect(businessRulesRepository.create).toHaveBeenCalledWith(newRuleData);
      expect(response.body).toMatchObject({
        success: true,
        data: { rule: expect.any(Object) },
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        name: 'Incomplete Rule',
        // missing ruleType and createdBy
      };

      const response = await request(app)
        .post('/api/v1/business-rules')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Missing required fields: name, ruleType, createdBy',
      });
    });
  });

  // ==========================================================================
  // PUT /api/v1/business-rules/:ruleId
  // ==========================================================================

  describe('PUT /api/v1/business-rules/:ruleId', () => {
    it('should update a business rule', async () => {
      const updates = {
        name: 'Updated Rule Name',
        description: 'Updated description',
      };

      (businessRulesRepository.update as jest.MockedFunction<any>).mockResolvedValue({
        ...mockRule,
        ...updates,
      });

      const response = await request(app)
        .put('/api/v1/business-rules/rule-001')
        .set('Authorization', 'Bearer valid-token')
        .send(updates)
        .expect(200);

      expect(businessRulesRepository.update).toHaveBeenCalledWith('rule-001', updates);
      expect(response.body).toMatchObject({
        success: true,
        data: { rule: expect.any(Object) },
      });
    });

    it('should return 404 for non-existent rule', async () => {
      (businessRulesRepository.update as jest.MockedFunction<any>).mockResolvedValue(null);

      const response = await request(app)
        .put('/api/v1/business-rules/non-existent')
        .set('Authorization', 'Bearer valid-token')
        .send({ name: 'Updated' })
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Rule not found',
      });
    });
  });

  // ==========================================================================
  // DELETE /api/v1/business-rules/:ruleId
  // ==========================================================================

  describe('DELETE /api/v1/business-rules/:ruleId', () => {
    it('should delete a business rule', async () => {
      (businessRulesRepository.delete as jest.MockedFunction<any>).mockResolvedValue(true);

      const response = await request(app)
        .delete('/api/v1/business-rules/rule-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(businessRulesRepository.delete).toHaveBeenCalledWith('rule-001');
      expect(response.body).toMatchObject({
        success: true,
        message: 'Rule deleted successfully',
      });
    });

    it('should return 404 for non-existent rule', async () => {
      (businessRulesRepository.delete as jest.MockedFunction<any>).mockResolvedValue(false);

      const response = await request(app)
        .delete('/api/v1/business-rules/non-existent')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Rule not found',
      });
    });
  });

  // ==========================================================================
  // GET /api/v1/business-rules/:ruleId/execution-logs
  // ==========================================================================

  describe('GET /api/v1/business-rules/:ruleId/execution-logs', () => {
    it('should get execution logs for a rule', async () => {
      const mockLogs = [
        {
          logId: 'log-001',
          ruleId: 'rule-001',
          executedAt: '2024-01-01T10:00:00Z',
          result: 'success',
        },
      ];

      (businessRulesRepository.findExecutionLogs as jest.MockedFunction<any>).mockResolvedValue(
        mockLogs
      );

      const response = await request(app)
        .get('/api/v1/business-rules/rule-001/execution-logs')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(businessRulesRepository.findExecutionLogs).toHaveBeenCalledWith('rule-001', 100);
      expect(response.body).toMatchObject({
        success: true,
        data: {
          logs: mockLogs,
          count: 1,
        },
      });
    });

    it('should use custom limit parameter', async () => {
      (businessRulesRepository.findExecutionLogs as jest.MockedFunction<any>).mockResolvedValue([]);

      await request(app)
        .get('/api/v1/business-rules/rule-001/execution-logs?limit=50')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(businessRulesRepository.findExecutionLogs).toHaveBeenCalledWith('rule-001', 50);
    });
  });

  // ==========================================================================
  // POST /api/v1/business-rules/test
  // ==========================================================================

  describe('POST /api/v1/business-rules/test', () => {
    it('should test rule conditions', async () => {
      const testData = {
        rule: {
          ...mockRule,
          conditions: [{ field: 'total', operator: 'gt', value: 1000 }],
        },
        entity: { total: 1500 },
        entityType: 'order',
        entityId: 'order-123',
      };

      (businessRulesService.evaluateRuleConditions as jest.MockedFunction<any>).mockReturnValue({
        shouldExecute: true,
        conditionsMet: true,
        conditionResults: [{ passed: true, condition: testData.rule.conditions[0] }],
      });

      const response = await request(app)
        .post('/api/v1/business-rules/test')
        .set('Authorization', 'Bearer valid-token')
        .send(testData)
        .expect(200);

      expect(businessRulesService.evaluateRuleConditions).toHaveBeenCalled();
      expect(response.body).toMatchObject({
        success: true,
        data: {
          shouldExecute: true,
          conditionsMet: true,
        },
      });
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        rule: mockRule,
        // missing entity
      };

      const response = await request(app)
        .post('/api/v1/business-rules/test')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toMatchObject({
        success: false,
        error: 'Missing required fields: rule, entity',
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/business-rules/:ruleId/activate
  // ==========================================================================

  describe.skip('POST /api/v1/business-rules/:ruleId/activate', () => {
    it.todo('should activate a rule');
    it.todo('should return 404 for non-existent rule');
  });

  // ==========================================================================
  // POST /api/v1/business-rules/:ruleId/deactivate
  // ==========================================================================

  describe.skip('POST /api/v1/business-rules/:ruleId/deactivate', () => {
    it.todo('should deactivate a rule');
    it.todo('should return 404 for non-existent rule');
  });

  // ==========================================================================
  // GET /api/v1/business-rules/stats/summary
  // ==========================================================================

  describe.skip('GET /api/v1/business-rules/stats/summary', () => {
    it.todo('should get summary statistics');
  });
});
