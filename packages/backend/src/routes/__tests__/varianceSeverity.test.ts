/**
 * Integration tests for variance severity routes
 * @covers src/routes/varianceSeverity.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { varianceSeverityService } from '../../services/VarianceSeverityService';
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

jest.mock('../../services/VarianceSeverityService', () => ({
  varianceSeverityService: {
    getAllSeverityConfigs: jest.fn().mockResolvedValue([
      {
        configId: 'config-001',
        severityLevel: 'MINOR',
        minVariancePercent: 0,
        maxVariancePercent: 2,
        requiresApproval: false,
        colorCode: '#10b981',
      },
      {
        configId: 'config-002',
        severityLevel: 'MAJOR',
        minVariancePercent: 2,
        maxVariancePercent: 10,
        requiresApproval: true,
        colorCode: '#f59e0b',
      },
    ]),
    getSeverityConfig: jest.fn().mockResolvedValue({
      configId: 'config-001',
      severityLevel: 'MINOR',
      minVariancePercent: 0,
      maxVariancePercent: 2,
      requiresApproval: false,
      colorCode: '#10b981',
    }),
    createSeverityConfig: jest.fn().mockResolvedValue({
      configId: 'config-003',
      severityLevel: 'CRITICAL',
      minVariancePercent: 10,
      maxVariancePercent: 100,
      requiresApproval: true,
      requiresManagerApproval: true,
      autoAdjust: false,
      colorCode: '#ef4444',
    }),
    updateSeverityConfig: jest.fn().mockResolvedValue({
      configId: 'config-001',
      severityLevel: 'MINOR',
      minVariancePercent: 0,
      maxVariancePercent: 3,
      requiresApproval: false,
      colorCode: '#10b981',
    }),
    deleteSeverityConfig: jest.fn().mockResolvedValue(undefined),
    resetToDefaults: jest.fn().mockResolvedValue(undefined),
    getSeverityForVariance: jest.fn().mockResolvedValue({
      severityLevel: 'MAJOR',
      minVariancePercent: 2,
      maxVariancePercent: 10,
      requiresApproval: true,
      colorCode: '#f59e0b',
    }),
  },
}));

jest.mock('../../middleware/permissions', () => ({
  requirePermission: jest.fn(() => (req: any, res: any, next: any) => next()),
}));

describe('Variance Severity Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/severity/configs
  // ==========================================================================

  describe('GET /api/v1/cycle-count/severity/configs', () => {
    it('should get all severity configs (active only by default)', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/severity/configs')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(varianceSeverityService.getAllSeverityConfigs).toHaveBeenCalledWith(false);
      expect(Array.isArray(response.body)).toBe(true);
      expect(response.body).toHaveLength(2);
    });

    it('should include inactive configs when requested', async () => {
      await request(app)
        .get('/api/v1/cycle-count/severity/configs?includeInactive=true')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(varianceSeverityService.getAllSeverityConfigs).toHaveBeenCalledWith(true);
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/severity/configs/:configId
  // ==========================================================================

  describe('GET /api/v1/cycle-count/severity/configs/:configId', () => {
    it('should get a specific severity configuration', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/severity/configs/config-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('configId', 'config-001');
      expect(response.body).toHaveProperty('severityLevel', 'MINOR');
      expect(response.body).toHaveProperty('minVariancePercent', 0);
      expect(response.body).toHaveProperty('maxVariancePercent', 2);
    });
  });

  // ==========================================================================
  // POST /api/v1/cycle-count/severity/configs
  // ==========================================================================

  describe('POST /api/v1/cycle-count/severity/configs', () => {
    it('should create a new severity configuration', async () => {
      const configData = {
        severityLevel: 'CRITICAL',
        minVariancePercent: 10,
        maxVariancePercent: 100,
        requiresApproval: true,
        requiresManagerApproval: true,
        autoAdjust: false,
        colorCode: '#ef4444',
      };

      const response = await request(app)
        .post('/api/v1/cycle-count/severity/configs')
        .set('Authorization', 'Bearer valid-token')
        .send(configData)
        .expect(201);

      expect(response.body).toHaveProperty('configId');
      expect(response.body).toHaveProperty('severityLevel', 'CRITICAL');
    });
  });

  // ==========================================================================
  // PUT /api/v1/cycle-count/severity/configs/:configId
  // ==========================================================================

  describe('PUT /api/v1/cycle-count/severity/configs/:configId', () => {
    it('should update a severity configuration', async () => {
      const updates = {
        maxVariancePercent: 3,
        colorCode: '#22c55e',
      };

      const response = await request(app)
        .put('/api/v1/cycle-count/severity/configs/config-001')
        .set('Authorization', 'Bearer valid-token')
        .send(updates)
        .expect(200);

      expect(response.body).toHaveProperty('configId', 'config-001');
      expect(response.body).toHaveProperty('maxVariancePercent', 3);
    });
  });

  // ==========================================================================
  // DELETE /api/v1/cycle-count/severity/configs/:configId
  // ==========================================================================

  describe('DELETE /api/v1/cycle-count/severity/configs/:configId', () => {
    it('should delete a severity configuration', async () => {
      await request(app)
        .delete('/api/v1/cycle-count/severity/configs/config-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(204);

      expect(varianceSeverityService.deleteSeverityConfig).toHaveBeenCalledWith('config-001');
    });
  });

  // ==========================================================================
  // POST /api/v1/cycle-count/severity/configs/reset
  // ==========================================================================

  describe('POST /api/v1/cycle-count/severity/configs/reset', () => {
    it('should reset to default severity configurations', async () => {
      const response = await request(app)
        .post('/api/v1/cycle-count/severity/configs/reset')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('message', 'Severity configurations reset to defaults');
      expect(varianceSeverityService.resetToDefaults).toHaveBeenCalled();
    });
  });

  // ==========================================================================
  // GET /api/v1/cycle-count/severity/determine
  // ==========================================================================

  describe('GET /api/v1/cycle-count/severity/determine', () => {
    it('should determine severity for a valid variance percentage', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/severity/determine?variance=5')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(varianceSeverityService.getSeverityForVariance).toHaveBeenCalledWith(5);
      expect(response.body).toHaveProperty('severityLevel');
      expect(response.body).toHaveProperty('requiresApproval');
    });

    it('should return 400 for invalid variance parameter', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/severity/determine?variance=invalid')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid variance_percent parameter');
      expect(response.body).toHaveProperty('code', 'INVALID_PARAM');
    });

    it('should return 400 for missing variance parameter', async () => {
      const response = await request(app)
        .get('/api/v1/cycle-count/severity/determine')
        .set('Authorization', 'Bearer valid-token')
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Invalid variance_percent parameter');
    });
  });
});
