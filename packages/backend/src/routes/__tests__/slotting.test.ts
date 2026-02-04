/**
 * Integration tests for slotting routes
 * @covers src/routes/slotting.ts
 */

import request from 'supertest';
import { createApp } from '../../app';
import { slottingOptimizationService } from '../../services/SlottingOptimizationService';
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
}));

jest.mock('../../services/SlottingOptimizationService', () => ({
  ABCClass: {
    A: 'A',
    B: 'B',
    C: 'C',
  },
  slottingOptimizationService: {
    runABCAnalysis: jest.fn().mockResolvedValue([
      {
        sku: 'SKU-001',
        abcClass: 'A',
        velocityScore: 95,
        totalMovement: 500,
        avgDailyMovement: 50,
        recommendedZone: 'A',
      },
      {
        sku: 'SKU-002',
        abcClass: 'B',
        velocityScore: 60,
        totalMovement: 100,
        avgDailyMovement: 10,
        recommendedZone: 'B',
      },
    ]),
    getSlottingRecommendations: jest.fn().mockResolvedValue([
      {
        sku: 'SKU-001',
        fromLocation: 'C-05-01',
        toLocation: 'A-01-01',
        estimatedBenefit: {
          travelTimeReduction: 15,
          annualSavings: 5000,
        },
        effort: 'LOW',
        priority: 1,
      },
    ]),
    implementRecommendation: jest.fn().mockResolvedValue(undefined),
    getVelocityData: jest.fn().mockResolvedValue({
      sku: 'SKU-001',
      days: 90,
      totalPicks: 500,
      avgDailyPicks: 5.5,
      peakDay: '2024-01-15',
      trend: 'INCREASING',
      velocityHistory: [
        { date: '2024-01-01', picks: 5 },
        { date: '2024-01-02', picks: 6 },
      ],
    }),
    getSlottingStats: jest.fn().mockResolvedValue({
      totalSKUs: 1000,
      classA: { count: 200, percentage: 20 },
      classB: { count: 300, percentage: 30 },
      classC: { count: 500, percentage: 50 },
      correctlySlotted: { count: 750, percentage: 75 },
      avgVelocityScore: 65,
    }),
  },
}));

jest.mock('../../config/logger');

describe('Slotting Routes', () => {
  let app: any;

  beforeEach(() => {
    app = createApp();
    jest.clearAllMocks();
  });

  // ==========================================================================
  // GET /api/v1/slotting/analysis
  // ==========================================================================

  describe('GET /api/v1/slotting/analysis', () => {
    it('should run ABC analysis with default days', async () => {
      const response = await request(app)
        .get('/api/v1/slotting/analysis')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(slottingOptimizationService.runABCAnalysis).toHaveBeenCalledWith(90);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('meta');
      expect(response.body.meta).toHaveProperty('analysisDays', 90);
    });

    it('should run ABC analysis with custom days', async () => {
      await request(app)
        .get('/api/v1/slotting/analysis?days=60')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(slottingOptimizationService.runABCAnalysis).toHaveBeenCalledWith(60);
    });
  });

  // ==========================================================================
  // GET /api/v1/slotting/recommendations
  // ==========================================================================

  describe('GET /api/v1/slotting/recommendations', () => {
    it('should get slotting recommendations', async () => {
      const response = await request(app)
        .get('/api/v1/slotting/recommendations')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(slottingOptimizationService.getSlottingRecommendations).toHaveBeenCalledWith({
        minPriority: undefined,
        maxRecommendations: undefined,
      });
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(Array.isArray(response.body.data)).toBe(true);
    });

    it('should apply filters to recommendations', async () => {
      await request(app)
        .get('/api/v1/slotting/recommendations?minPriority=HIGH&maxRecommendations=10')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(slottingOptimizationService.getSlottingRecommendations).toHaveBeenCalledWith({
        minPriority: 'HIGH',
        maxRecommendations: 10,
      });
    });
  });

  // ==========================================================================
  // POST /api/v1/slotting/implement
  // ==========================================================================

  describe('POST /api/v1/slotting/implement', () => {
    it('should implement a slotting recommendation', async () => {
      const implementData = {
        sku: 'SKU-001',
        fromLocation: 'C-05-01',
        toLocation: 'A-01-01',
      };

      const response = await request(app)
        .post('/api/v1/slotting/implement')
        .set('Authorization', 'Bearer valid-token')
        .send(implementData)
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('message', 'Slotting recommendation implemented');
      expect(slottingOptimizationService.implementRecommendation).toHaveBeenCalled();
    });

    it('should return 400 for missing required fields', async () => {
      const invalidData = {
        sku: 'SKU-001',
        // missing fromLocation and toLocation
      };

      const response = await request(app)
        .post('/api/v1/slotting/implement')
        .set('Authorization', 'Bearer valid-token')
        .send(invalidData)
        .expect(400);

      expect(response.body).toHaveProperty('error', 'Missing required fields');
    });
  });

  // ==========================================================================
  // GET /api/v1/slotting/velocity/:sku
  // ==========================================================================

  describe('GET /api/v1/slotting/velocity/:sku', () => {
    it('should get velocity data for SKU with default days', async () => {
      const response = await request(app)
        .get('/api/v1/slotting/velocity/SKU-001')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(slottingOptimizationService.getVelocityData).toHaveBeenCalledWith('SKU-001', 90);
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('sku', 'SKU-001');
      expect(response.body.data).toHaveProperty('totalPicks');
    });

    it('should get velocity data with custom days', async () => {
      await request(app)
        .get('/api/v1/slotting/velocity/SKU-001?days=60')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(slottingOptimizationService.getVelocityData).toHaveBeenCalledWith('SKU-001', 60);
    });

    it('should return 404 for SKU not found', async () => {
      (
        slottingOptimizationService.getVelocityData as jest.MockedFunction<any>
      ).mockResolvedValueOnce(null);

      const response = await request(app)
        .get('/api/v1/slotting/velocity/NONEXISTENT')
        .set('Authorization', 'Bearer valid-token')
        .expect(404);

      expect(response.body).toHaveProperty('error', 'SKU not found');
    });
  });

  // ==========================================================================
  // GET /api/v1/slotting/stats
  // ==========================================================================

  describe('GET /api/v1/slotting/stats', () => {
    it('should get overall slotting statistics', async () => {
      const response = await request(app)
        .get('/api/v1/slotting/stats')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(slottingOptimizationService.getSlottingStats).toHaveBeenCalled();
      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('totalSKUs');
      expect(response.body.data).toHaveProperty('classA');
      expect(response.body.data).toHaveProperty('classB');
      expect(response.body.data).toHaveProperty('classC');
    });
  });

  // ==========================================================================
  // GET /api/v1/slotting/classes
  // ==========================================================================

  describe('GET /api/v1/slotting/classes', () => {
    it('should get ABC class definitions', async () => {
      const response = await request(app)
        .get('/api/v1/slotting/classes')
        .set('Authorization', 'Bearer valid-token')
        .expect(200);

      expect(response.body).toHaveProperty('success', true);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('classes');
      expect(Array.isArray(response.body.data.classes)).toBe(true);
      expect(response.body.data.classes).toHaveLength(3);
      expect(response.body.data.classes[0]).toHaveProperty('class', 'A');
      expect(response.body.data.classes[1]).toHaveProperty('class', 'B');
      expect(response.body.data.classes[2]).toHaveProperty('class', 'C');
    });
  });
});
